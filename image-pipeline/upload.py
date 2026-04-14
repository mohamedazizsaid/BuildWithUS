"""
Script 3 — Upload
Uploads all images from ./images/ to MinIO stock-images bucket.
Inserts a row into images_db.images for each uploaded file.
"""

import os
import sys
import uuid
from pathlib import Path

import psycopg2
from minio import Minio
from minio.error import S3Error
from PIL import Image
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

IMAGES_DIR = Path("images")

POSTGRES_HOST     = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT     = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER     = os.getenv("POSTGRES_USER", "winaity")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "winaity_dev")
POSTGRES_DB       = os.getenv("POSTGRES_DB", "images_db")

MINIO_ENDPOINT   = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "winaity")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "winaity123")
MINIO_BUCKET     = os.getenv("MINIO_BUCKET", "stock-images")
MINIO_SECURE     = os.getenv("MINIO_SECURE", "false").lower() == "true"


def connect_postgres():
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DB,
    )


def connect_minio():
    return Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE,
    )


def get_image_dimensions(path: Path) -> tuple[int, int]:
    try:
        with Image.open(path) as img:
            return img.width, img.height
    except Exception:
        return 0, 0


def already_uploaded(cursor, file_name: str) -> bool:
    cursor.execute("SELECT 1 FROM images WHERE file_name = %s", (file_name,))
    return cursor.fetchone() is not None


def build_minio_url(file_name: str) -> str:
    return f"http://{MINIO_ENDPOINT}/{MINIO_BUCKET}/{file_name}"


def main():
    print("=" * 50)
    print("  Winaity Image Pipeline — Upload")
    print("=" * 50)
    print()

    image_files = sorted(IMAGES_DIR.glob("*.jpg"))
    if not image_files:
        print(f"ERROR: No .jpg files found in {IMAGES_DIR.resolve()}")
        sys.exit(1)

    print(f"[Upload] Found {len(image_files)} images in {IMAGES_DIR.resolve()}")

    # Connect
    print("[PostgreSQL] Connecting...")
    conn = connect_postgres()
    cursor = conn.cursor()

    print("[MinIO] Connecting...")
    minio = connect_minio()

    success = 0
    skipped = 0
    failed = 0

    print()
    with tqdm(image_files, unit="img", ncols=80) as bar:
        for img_path in bar:
            file_name = img_path.name

            # Skip already uploaded
            if already_uploaded(cursor, file_name):
                skipped += 1
                bar.set_postfix(ok=success, skip=skipped, fail=failed)
                continue

            try:
                # Upload to MinIO
                minio.fput_object(
                    MINIO_BUCKET,
                    file_name,
                    str(img_path),
                    content_type="image/jpeg",
                )

                # Get dimensions
                width, height = get_image_dimensions(img_path)

                # Insert into PostgreSQL
                minio_url = build_minio_url(file_name)
                cursor.execute(
                    """
                    INSERT INTO images (id, file_name, minio_url, width, height, source)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (str(uuid.uuid4()), file_name, minio_url, width, height, "picsum"),
                )
                conn.commit()
                success += 1

            except S3Error as e:
                failed += 1
                bar.write(f"  MinIO ERROR {file_name}: {e}")
                conn.rollback()
            except Exception as e:
                failed += 1
                bar.write(f"  ERROR {file_name}: {e}")
                conn.rollback()

            bar.set_postfix(ok=success, skip=skipped, fail=failed)

    cursor.close()
    conn.close()

    print()
    print("=" * 50)
    print(f"  Uploaded:  {success}")
    print(f"  Skipped:   {skipped} (already in DB)")
    print(f"  Failed:    {failed}")
    print("=" * 50)

    if success + skipped == 0:
        print("\n  ERROR: Nothing was uploaded.")
        sys.exit(1)
    else:
        print("\n  ✓ Ready for Script 4 (tag + embed).")


if __name__ == "__main__":
    main()
