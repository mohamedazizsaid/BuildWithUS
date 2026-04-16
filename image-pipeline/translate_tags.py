"""
translate_tags.py — Translate all existing image tags + descriptions EN → FR.

Uses translate_batch() to send chunks of 100 at a time → ~60x faster.

Requirements:
  pip install deep-translator psycopg2-binary python-dotenv tqdm
"""

import os
import time
import psycopg2
from tqdm import tqdm
from deep_translator import GoogleTranslator
from dotenv import load_dotenv

load_dotenv()

PG_HOST = os.getenv("POSTGRES_HOST",     "localhost")
PG_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
PG_USER = os.getenv("POSTGRES_USER",     "winaity")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "winaity_dev")
PG_DB   = os.getenv("POSTGRES_DB",       "images_db")

CHUNK     = 100   # words per batch request
BATCH_COMMIT = 500


def pg_conn():
    return psycopg2.connect(
        host=PG_HOST, port=PG_PORT, user=PG_USER,
        password=PG_PASS, dbname=PG_DB
    )


def batch_translate(texts: list[str], translator: GoogleTranslator) -> dict[str, str]:
    """
    Translate a list of strings in chunks of CHUNK using translate_batch().
    Returns {original: translated} mapping.
    """
    result = {}
    for i in range(0, len(texts), CHUNK):
        chunk = texts[i:i + CHUNK]
        try:
            translated = translator.translate_batch(chunk)
            for orig, tr in zip(chunk, translated):
                result[orig] = (tr or orig).lower() if tr else orig
        except Exception as e:
            print(f"  [WARN] batch failed ({e}), falling back one-by-one")
            for word in chunk:
                try:
                    tr = translator.translate(word)
                    result[word] = (tr or word).lower()
                except Exception:
                    result[word] = word
        # small pause between chunks to be polite to the API
        time.sleep(0.3)
    return result


def main():
    print("=" * 60)
    print("  Tag + Description Translator — EN → FR")
    print("=" * 60)

    conn = pg_conn()
    cur  = conn.cursor()
    translator = GoogleTranslator(source='en', target='fr')

    # 1. Load all rows
    print("\n[1/4] Loading rows from PostgreSQL...")
    cur.execute("SELECT id, tags, description FROM images")
    rows = cur.fetchall()
    print(f"      {len(rows)} rows found.")

    # 2. Translate unique tags in bulk
    unique_tags: set[str] = set()
    for _, tags, _ in rows:
        if tags:
            unique_tags.update(t.strip() for t in tags if t.strip())

    unique_list = sorted(unique_tags)
    chunks_count = (len(unique_list) + CHUNK - 1) // CHUNK
    print(f"\n[2/4] Translating {len(unique_list)} unique tags in {chunks_count} batches...")

    tag_map = batch_translate(unique_list, translator)

    print("      Sample tag translations:")
    for en, fr in list(tag_map.items())[:8]:
        print(f"        {en} → {fr}")

    # 3. Translate unique descriptions in bulk
    unique_descs = sorted({d.strip() for _, _, d in rows if d and d.strip()})
    desc_chunks  = (len(unique_descs) + CHUNK - 1) // CHUNK
    print(f"\n[3/4] Translating {len(unique_descs)} unique descriptions in {desc_chunks} batches...")

    desc_map = batch_translate(unique_descs, translator)

    print("      Sample description translations:")
    for en, fr in list(desc_map.items())[:3]:
        print(f"        {en[:60]} → {fr[:60]}")

    # 4. Update rows
    print(f"\n[4/4] Updating {len(rows)} rows in PostgreSQL...")
    updated = 0
    for row_id, tags, desc in tqdm(rows, unit="row"):
        fr_tags = [tag_map.get(t.strip(), t.strip()) for t in tags if t.strip()] if tags else []
        fr_desc = desc_map.get(desc.strip(), desc) if desc else desc
        cur.execute(
            "UPDATE images SET tags = %s, description = %s WHERE id = %s",
            (fr_tags, fr_desc, row_id)
        )
        updated += 1
        if updated % BATCH_COMMIT == 0:
            conn.commit()

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n✓ Done — {updated} rows updated with French tags and descriptions.")
    print("=" * 60)


if __name__ == "__main__":
    main()
