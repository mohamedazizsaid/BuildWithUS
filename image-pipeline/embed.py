"""
Script 4 — Tag + Embed
For each image in images_db (no chroma_id yet):
  1. Load image from local ./images/ folder
  2. Generate image embedding with clip-ViT-B-32 (full CLIP model)
  3. Assign top-5 French tags via zero-shot similarity
     (tag embeddings use clip-ViT-B-32-multilingual-v1 — same vector space)
  4. Build a French description from the tags
  5. Update images_db.images (tags, description, chroma_id)
  6. Insert embedding into ChromaDB

Models:
  - clip-ViT-B-32              → encodes images (512-dim)
  - clip-ViT-B-32-multilingual-v1 → encodes French text (512-dim, same space)
  Both map to the same CLIP embedding space — French queries find images.
"""

import os
import sys
import uuid
from pathlib import Path

import psycopg2
import chromadb
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
from dotenv import load_dotenv
import numpy as np

load_dotenv()

IMAGES_DIR = Path("images")
CHROMA_DIR = Path("chroma_db")
BATCH_SIZE = 32   # process N images at a time before committing

POSTGRES_HOST     = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT     = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER     = os.getenv("POSTGRES_USER", "winaity")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "winaity_dev")
POSTGRES_DB       = os.getenv("POSTGRES_DB", "images_db")

# ─── French tag vocabulary ───────────────────────────────────────────────────
# Covers themes relevant to email marketing templates
FRENCH_TAGS = [
    # Nature & paysages
    "nature", "forêt", "montagne", "mer", "plage", "ciel", "coucher de soleil",
    "fleurs", "arbres", "campagne", "lac", "rivière",
    # Personnes & émotions
    "personnes", "femme", "homme", "enfants", "famille", "équipe", "sourire",
    "portrait", "groupe", "foule",
    # Business & travail
    "bureau", "réunion", "ordinateur", "technologie", "startup", "travail",
    "présentation", "conférence", "collaboration", "succès",
    # Alimentation
    "nourriture", "restaurant", "café", "boisson", "cuisine", "repas",
    "fruits", "légumes", "dessert",
    # Mode & lifestyle
    "mode", "vêtements", "shopping", "luxe", "beauté", "sport", "fitness",
    "yoga", "voyage", "aventure",
    # Architecture & ville
    "ville", "architecture", "bâtiment", "intérieur", "maison", "appartement",
    "rue", "nuit urbaine",
    # Santé & bien-être
    "santé", "médecine", "bien-être", "méditation", "relaxation",
    # Abstrait & texture
    "abstrait", "texture", "couleurs", "fond blanc", "fond sombre", "minimaliste",
    # Événements
    "fête", "célébration", "mariage", "anniversaire", "événement",
]

# French description templates based on top tags
def build_description(top_tags: list[str]) -> str:
    if not top_tags:
        return "Image stock générique."
    main = top_tags[0]
    rest = ", ".join(top_tags[1:3]) if len(top_tags) > 1 else ""
    if rest:
        return f"Image représentant {main}, avec des éléments de {rest}."
    return f"Image représentant {main}."


def connect_postgres():
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DB,
    )


def load_models():
    print("[Model] Loading openai/clip-vit-base-patch32 (image encoder)...")
    print("        (first run downloads ~350MB — cached afterwards)")
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    clip_model.eval()
    print("[Model] Loading clip-ViT-B-32-multilingual-v1 (French text encoder)...")
    txt_model = SentenceTransformer("clip-ViT-B-32-multilingual-v1")
    print("[Model] Both models ready.")
    return clip_model, clip_processor, txt_model


def encode_image(clip_model, clip_processor, img: Image.Image) -> np.ndarray:
    """Encode a PIL image using CLIP, returns normalized 512-dim vector."""
    inputs = clip_processor(images=img, return_tensors="pt")
    with torch.no_grad():
        features = clip_model.get_image_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
    return features[0].numpy().astype(np.float32)


def fetch_unprocessed(cursor) -> list[dict]:
    cursor.execute("""
        SELECT id, file_name
        FROM images
        WHERE chroma_id IS NULL
        ORDER BY created_at ASC
    """)
    rows = cursor.fetchall()
    return [{"id": r[0], "file_name": r[1]} for r in rows]


def tag_image(
    image_embedding: np.ndarray,
    tag_embeddings: np.ndarray,
    top_k: int = 5,
) -> list[str]:
    """Return top_k French tags for the given image embedding."""
    # Cosine similarity
    img_norm = image_embedding / (np.linalg.norm(image_embedding) + 1e-8)
    tag_norms = tag_embeddings / (np.linalg.norm(tag_embeddings, axis=1, keepdims=True) + 1e-8)
    sims = tag_norms @ img_norm
    top_indices = np.argsort(sims)[::-1][:top_k]
    return [FRENCH_TAGS[i] for i in top_indices]


def main():
    print("=" * 55)
    print("  Winaity Image Pipeline — Tag + Embed")
    print("=" * 55)
    print()

    # Connect
    conn = connect_postgres()
    cursor = conn.cursor()

    chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = chroma_client.get_or_create_collection(
        name="stock_images",
        metadata={"hnsw:space": "cosine"},
    )

    # Load models
    clip_model, clip_processor, txt_model = load_models()
    print()

    # Pre-compute tag embeddings using the TEXT model (French)
    print("[Tags] Encoding French tag vocabulary...")
    tag_embeddings = txt_model.encode(FRENCH_TAGS, batch_size=64, show_progress_bar=False)
    tag_embeddings = np.array(tag_embeddings)
    print(f"[Tags] {len(FRENCH_TAGS)} tags encoded.")
    print()

    # Fetch images that haven't been processed yet
    rows = fetch_unprocessed(cursor)
    if not rows:
        print("✓ All images already processed.")
        cursor.close()
        conn.close()
        return

    print(f"[Embed] {len(rows)} images to process...")
    print()

    success = 0
    failed = 0
    missing = 0

    with tqdm(rows, unit="img", ncols=80) as bar:
        for row in bar:
            img_path = IMAGES_DIR / row["file_name"]

            if not img_path.exists():
                missing += 1
                bar.set_postfix(ok=success, miss=missing, fail=failed)
                continue

            try:
                # Load image
                img = Image.open(img_path).convert("RGB")

                # Generate image embedding using CLIP
                embedding = encode_image(clip_model, clip_processor, img)
                embedding = np.array(embedding, dtype=np.float32)

                # Assign French tags
                top_tags = tag_image(embedding, tag_embeddings, top_k=5)
                description = build_description(top_tags)

                # Insert into ChromaDB
                chroma_id = str(uuid.uuid4())
                collection.add(
                    ids=[chroma_id],
                    embeddings=[embedding.tolist()],
                    metadatas=[{
                        "image_id": row["id"],
                        "file_name": row["file_name"],
                        "tags": ", ".join(top_tags),
                        "description": description,
                    }],
                )

                # Update PostgreSQL
                cursor.execute(
                    """
                    UPDATE images
                    SET tags = %s,
                        description = %s,
                        chroma_id = %s
                    WHERE id = %s
                    """,
                    (top_tags, description, chroma_id, row["id"]),
                )
                conn.commit()
                success += 1

            except Exception as e:
                failed += 1
                conn.rollback()
                bar.write(f"  ERROR {row['file_name']}: {e}")

            bar.set_postfix(ok=success, miss=missing, fail=failed)

    cursor.close()
    conn.close()

    print()
    print("=" * 55)
    print(f"  Processed: {success}")
    print(f"  Missing:   {missing} (image file not found)")
    print(f"  Failed:    {failed}")
    print(f"  ChromaDB:  {CHROMA_DIR.resolve()}")
    print("=" * 55)

    if success == 0:
        print("\n  ERROR: Nothing was processed.")
        sys.exit(1)
    else:
        print("\n  ✓ Ready for Script 5 (search API).")


if __name__ == "__main__":
    main()
