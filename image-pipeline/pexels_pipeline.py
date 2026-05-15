"""
Pexels Pipeline — all-in-one replacement for the old Picsum pipeline.

What it does (in one run):
  1. WIPE old data  — clears PostgreSQL images table + MinIO bucket + ChromaDB
  2. FETCH metadata — pulls up to MAX_IMAGES photos from Pexels across
                      business-relevant categories via the Pexels API
  3. DOWNLOAD       — downloads each photo at 'large2x' (HD) resolution
  4. UPLOAD         — streams photo to MinIO, deletes local file immediately
  5. EMBED          — encodes the photo's Pexels description + tags with CLIP
                      (multilingual, same model used by the search API)
  6. INDEX          — inserts vector into ChromaDB
  7. RECORD         — saves metadata (url, tags, description, chroma_id) to PostgreSQL

No images are kept on disk permanently — each file is deleted right after upload.

Requirements:
  pip install requests Pillow tqdm minio psycopg2-binary chromadb
      sentence-transformers numpy python-dotenv

Env vars (same .env as before):
  PEXELS_API_KEY   — get a free key at https://www.pexels.com/api/
  POSTGRES_*       — same as before
  MINIO_*          — same as before
"""

import os
import sys
import uuid
import time
import shutil
import requests
import psycopg2
import chromadb
from pathlib import Path
from PIL import Image
from tqdm import tqdm
from minio import Minio
from minio.error import S3Error
from sentence_transformers import SentenceTransformer
from deep_translator import GoogleTranslator
from dotenv import load_dotenv

_translator = GoogleTranslator(source='en', target='fr')
_tag_cache: dict[str, str] = {}

def to_french(word: str) -> str:
    """Translate a single English word/phrase to French, with local cache."""
    key = word.lower().strip()
    if key in _tag_cache:
        return _tag_cache[key]
    try:
        fr = _translator.translate(key)
        result = fr.lower() if fr else key
    except Exception:
        result = key
    _tag_cache[key] = result
    return result

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

PEXELS_API_KEY  = os.getenv("PEXELS_API_KEY", "")
MINIO_ENDPOINT  = os.getenv("MINIO_ENDPOINT",  "localhost:9000")
MINIO_ACCESS    = os.getenv("MINIO_ACCESS_KEY", "winaity")
MINIO_SECRET    = os.getenv("MINIO_SECRET_KEY", "winaity123")
MINIO_BUCKET    = os.getenv("MINIO_BUCKET",     "stock-images")

PG_HOST = os.getenv("POSTGRES_HOST",     "localhost")
PG_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
PG_USER = os.getenv("POSTGRES_USER",     "winaity")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "winaity_dev")
PG_DB   = os.getenv("POSTGRES_DB",       "images_db")

CHROMA_DIR  = Path("chroma_db")
TMP_DIR     = Path("tmp_pexels")       # ephemeral; wiped after each batch
MAX_IMAGES  = 8000                     # total target (Pexels free tier: unlimited)
PER_PAGE    = 80                       # max allowed by Pexels API
BATCH_SIZE  = 40                       # images downloaded before flushing to MinIO

# Categories to fetch — mapped to Pexels search queries
CATEGORIES = [
    # Business / corporate
    ("business", 350), ("office", 250), ("meeting", 150), ("teamwork", 150),
    ("leadership", 100), ("finance", 150), ("startup", 100), ("laptop", 150),
    # Marketing / e-commerce
    ("shopping", 200), ("product", 250), ("sale", 150), ("ecommerce", 100),
    ("marketing", 150), ("advertising", 100), ("brand", 100),
    # People & lifestyle
    ("people", 300), ("woman", 200), ("man", 200), ("family", 150),
    ("friends", 150), ("portrait", 200), ("smile", 150), ("lifestyle", 150),
    # Technology
    ("technology", 250), ("smartphone", 150), ("coding", 100), ("ai", 100),
    ("data", 100), ("innovation", 100),
    # Nature & travel
    ("nature", 250), ("landscape", 200), ("travel", 200), ("city", 200),
    ("architecture", 150), ("beach", 150), ("mountain", 100),
    # Food & health
    ("food", 200), ("restaurant", 150), ("health", 150), ("fitness", 150),
    ("wellness", 100),
    # Abstract / background
    ("background", 200), ("texture", 150), ("minimal", 150), ("colors", 100),
    ("abstract", 150),
]

# ── Clients ───────────────────────────────────────────────────────────────────

def pg_conn():
    return psycopg2.connect(
        host=PG_HOST, port=PG_PORT, user=PG_USER,
        password=PG_PASS, dbname=PG_DB
    )

def minio_client():
    return Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS,
                 secret_key=MINIO_SECRET, secure=False)

# ── Step 0: Wipe old data ─────────────────────────────────────────────────────

def wipe_old_data():
    print("\n[WIPE] Clearing old Picsum data...")

    # PostgreSQL
    try:
        conn = pg_conn()
        cur  = conn.cursor()
        cur.execute("TRUNCATE TABLE images RESTART IDENTITY;")
        conn.commit()
        cur.close()
        conn.close()
        print("[WIPE] ✓ PostgreSQL images table cleared.")
    except Exception as e:
        print(f"[WIPE] PostgreSQL error: {e}")
        sys.exit(1)

    # MinIO — delete all objects in bucket
    try:
        mc = minio_client()
        objects = mc.list_objects(MINIO_BUCKET, recursive=True)
        deleted = 0
        for obj in objects:
            mc.remove_object(MINIO_BUCKET, obj.object_name)
            deleted += 1
        print(f"[WIPE] ✓ MinIO: {deleted} objects removed from '{MINIO_BUCKET}'.")
    except S3Error as e:
        print(f"[WIPE] MinIO error: {e}")
        sys.exit(1)

    # ChromaDB — delete and recreate collection
    try:
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        try:
            client.delete_collection("stock_images")
            print("[WIPE] ✓ ChromaDB collection 'stock_images' deleted.")
        except Exception:
            print("[WIPE] ChromaDB collection didn't exist — skipping.")
    except Exception as e:
        print(f"[WIPE] ChromaDB error: {e}")

    print("[WIPE] Done.\n")

# ── Step 1: Fetch Pexels metadata ─────────────────────────────────────────────

def fetch_pexels_photos(query: str, count: int) -> list[dict]:
    """Returns up to `count` photo metadata dicts from Pexels search."""
    if not PEXELS_API_KEY:
        print("[PEXELS] ERROR: PEXELS_API_KEY not set in .env")
        sys.exit(1)

    headers = {"Authorization": PEXELS_API_KEY}
    photos  = []
    page    = 1

    while len(photos) < count:
        per_page = min(PER_PAGE, count - len(photos))
        try:
            r = requests.get(
                "https://api.pexels.com/v1/search",
                headers=headers,
                params={"query": query, "per_page": per_page,
                        "page": page, "orientation": "landscape"},
                timeout=15,
            )
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            print(f"[PEXELS] Request error for '{query}' page {page}: {e}")
            break

        batch = data.get("photos", [])
        if not batch:
            break

        photos.extend(batch)
        page += 1

        # Respect Pexels rate limit (200 req/hour on free tier — ~18 req/min)
        time.sleep(0.35)

    return photos[:count]

# ── Step 2: Build metadata from a Pexels photo object ─────────────────────────

def photo_metadata(photo: dict, category: str) -> dict:
    """Extract the fields we care about from a Pexels photo response."""
    photographer = photo.get("photographer", "")
    alt          = photo.get("alt", "") or ""
    # Pexels 'alt' is a concise English description — translate to French
    en_desc     = alt or f"{category} photo by {photographer}"
    description = to_french(en_desc)

    # Build tags in French: translate category + meaningful words from alt text
    tag_words = [w.lower() for w in alt.replace(",", " ").split() if len(w) > 2]
    en_tags = list(dict.fromkeys([category] + tag_words))[:12]
    tags = [to_french(t) for t in en_tags]

    return {
        "pexels_id":   photo["id"],
        "url_large":   photo["src"]["large2x"],   # HD ~2x resolution
        "width":       photo["width"],
        "height":      photo["height"],
        "photographer": photographer,
        "description": description,
        "tags":        tags,
        "avg_color":   photo.get("avg_color", ""),
    }

# ── Step 3: Download → upload → embed → record ────────────────────────────────

def process_batch(photos_meta: list[dict], mc: Minio, chroma_col, text_model,
                  pg_cur, seen_ids: set) -> int:
    """
    Download each photo, upload to MinIO, embed description, index in Chroma,
    record in PostgreSQL.  Returns number of successfully processed photos.
    """
    TMP_DIR.mkdir(exist_ok=True)
    ok = 0

    for meta in photos_meta:
        pid = meta["pexels_id"]
        if pid in seen_ids:
            continue

        file_name = f"pexels_{pid}.jpg"
        local_path = TMP_DIR / file_name

        # ── Download ──────────────────────────────────────────────────────────
        try:
            r = requests.get(meta["url_large"], timeout=30, stream=True)
            r.raise_for_status()
            with open(local_path, "wb") as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
        except Exception as e:
            print(f"  [DL] Failed {file_name}: {e}")
            continue

        # Quick sanity check with Pillow
        try:
            with Image.open(local_path) as img:
                actual_w, actual_h = img.size
        except Exception as e:
            print(f"  [IMG] Bad image {file_name}: {e}")
            local_path.unlink(missing_ok=True)
            continue

        # ── Upload to MinIO ───────────────────────────────────────────────────
        minio_url = f"http://{MINIO_ENDPOINT}/{MINIO_BUCKET}/{file_name}"
        try:
            mc.fput_object(
                MINIO_BUCKET, file_name, str(local_path),
                content_type="image/jpeg",
            )
        except S3Error as e:
            print(f"  [MINIO] Upload failed {file_name}: {e}")
            local_path.unlink(missing_ok=True)
            continue
        finally:
            local_path.unlink(missing_ok=True)   # always delete local copy

        # ── Embed description text with multilingual CLIP ─────────────────────
        text_to_embed = f"{meta['description']} {' '.join(meta['tags'])}"
        try:
            embedding = text_model.encode(text_to_embed, normalize_embeddings=True).tolist()
        except Exception as e:
            print(f"  [EMBED] Failed {file_name}: {e}")
            continue

        # ── Insert into ChromaDB ──────────────────────────────────────────────
        chroma_id = str(uuid.uuid4())
        try:
            chroma_col.add(
                ids=[chroma_id],
                embeddings=[embedding],
                metadatas=[{
                    "file_name":   file_name,
                    "minio_url":   minio_url,
                    "description": meta["description"],
                    "tags":        ",".join(meta["tags"]),
                }],
            )
        except Exception as e:
            print(f"  [CHROMA] Failed {file_name}: {e}")
            continue

        # ── Insert into PostgreSQL ────────────────────────────────────────────
        try:
            pg_cur.execute("""
                INSERT INTO images
                  (file_name, minio_url, width, height, tags, description,
                   chroma_id, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'pexels')
                ON CONFLICT DO NOTHING
            """, (
                file_name, minio_url, actual_w, actual_h,
                meta["tags"], meta["description"], chroma_id,
            ))
        except Exception as e:
            print(f"  [PG] Failed {file_name}: {e}")
            continue

        seen_ids.add(pid)
        ok += 1

    # Clean up tmp dir
    shutil.rmtree(TMP_DIR, ignore_errors=True)
    return ok

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Winaity Image Pipeline — Pexels HD Edition")
    print("=" * 60)

    if not PEXELS_API_KEY:
        print("\nERROR: Set PEXELS_API_KEY in image-pipeline/.env")
        print("Get a free key at https://www.pexels.com/api/\n")
        sys.exit(1)

    # 0 — Wipe
    wipe_old_data()

    # Load text embedding model once
    print("[EMBED] Loading multilingual CLIP text model...")
    text_model = SentenceTransformer("clip-ViT-B-32-multilingual-v1")
    print("[EMBED] ✓ Model loaded.\n")

    # Connect to ChromaDB
    chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    chroma_col    = chroma_client.get_or_create_collection(
        "stock_images",
        metadata={"hnsw:space": "cosine"},
    )

    # Connect to PostgreSQL
    conn   = pg_conn()
    pg_cur = conn.cursor()

    # Connect to MinIO
    mc = minio_client()

    seen_ids: set = set()
    total_ok = 0
    total_target = sum(c for _, c in CATEGORIES)

    print(f"[PLAN] {len(CATEGORIES)} categories, ~{total_target} photos targeted\n")

    for query, count in CATEGORIES:
        print(f"[FETCH] '{query}' — up to {count} photos")
        photos = fetch_pexels_photos(query, count)
        print(f"        got {len(photos)} from Pexels API")

        # Process in batches of BATCH_SIZE
        for i in range(0, len(photos), BATCH_SIZE):
            chunk = photos[i : i + BATCH_SIZE]
            metas = [photo_metadata(p, query) for p in chunk]

            with tqdm(total=len(metas), desc=f"  Processing {query}[{i}:{i+BATCH_SIZE}]",
                      unit="img") as bar:
                # patch tqdm to update per-image
                processed = process_batch(metas, mc, chroma_col,
                                          text_model, pg_cur, seen_ids)
                bar.update(len(metas))

            conn.commit()
            total_ok += processed
            print(f"        ✓ {processed}/{len(metas)} images processed "
                  f"(total so far: {total_ok})")

        if total_ok >= MAX_IMAGES:
            print(f"\n[DONE] Reached MAX_IMAGES={MAX_IMAGES}. Stopping early.")
            break

    pg_cur.close()
    conn.close()

    print("\n" + "=" * 60)
    print(f"  ✓ Pipeline complete: {total_ok} HD images indexed")
    print(f"  ChromaDB: {chroma_col.count()} vectors")
    print("=" * 60)

if __name__ == "__main__":
    main()
