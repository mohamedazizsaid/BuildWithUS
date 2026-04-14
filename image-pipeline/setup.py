"""
Script 1 — Setup
Creates images_db + images table in PostgreSQL
Creates stock-images bucket in MinIO
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from minio import Minio
from minio.error import S3Error
from dotenv import load_dotenv

load_dotenv()

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "winaity")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "winaity123")
POSTGRES_DB = os.getenv("POSTGRES_DB", "images_db")

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "winaity")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "winaity123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "stock-images")


def create_database():
    print("[PostgreSQL] Connecting to postgres...")
    try:
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            dbname="postgres",
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (POSTGRES_DB,))
        exists = cursor.fetchone()

        if exists:
            print(f"[PostgreSQL] Database '{POSTGRES_DB}' already exists — skipping.")
        else:
            cursor.execute(f"CREATE DATABASE {POSTGRES_DB}")
            print(f"[PostgreSQL] Database '{POSTGRES_DB}' created.")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[PostgreSQL] ERROR connecting: {e}")
        sys.exit(1)


def create_table():
    print("[PostgreSQL] Creating images table...")
    try:
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            dbname=POSTGRES_DB,
        )
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS images (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                file_name    VARCHAR(255) NOT NULL,
                minio_url    VARCHAR(500) NOT NULL,
                width        INTEGER,
                height       INTEGER,
                tags         TEXT[],
                description  TEXT,
                chroma_id    VARCHAR(255),
                source       VARCHAR(50) DEFAULT 'unsplash',
                usage_count  INTEGER DEFAULT 0,
                created_at   TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_images_tags
                ON images USING GIN(tags);

            CREATE INDEX IF NOT EXISTS idx_images_usage
                ON images(usage_count DESC);
        """)

        conn.commit()
        print("[PostgreSQL] Table 'images' and indexes ready.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[PostgreSQL] ERROR creating table: {e}")
        sys.exit(1)


def create_minio_bucket():
    print("[MinIO] Connecting...")
    try:
        client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=False,
        )

        if client.bucket_exists(MINIO_BUCKET):
            print(f"[MinIO] Bucket '{MINIO_BUCKET}' already exists — skipping.")
        else:
            client.make_bucket(MINIO_BUCKET)
            print(f"[MinIO] Bucket '{MINIO_BUCKET}' created.")

        # Set public read policy so frontend can display images directly
        policy = f"""{{
            "Version": "2012-10-17",
            "Statement": [{{
                "Effect": "Allow",
                "Principal": {{"AWS": ["*"]}},
                "Action": ["s3:GetObject"],
                "Resource": ["arn:aws:s3:::{MINIO_BUCKET}/*"]
            }}]
        }}"""
        client.set_bucket_policy(MINIO_BUCKET, policy)
        print(f"[MinIO] Public read policy applied to '{MINIO_BUCKET}'.")

    except S3Error as e:
        print(f"[MinIO] ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 50)
    print("  Winaity Image Pipeline — Setup")
    print("=" * 50)

    create_database()
    create_table()
    create_minio_bucket()

    print()
    print("=" * 50)
    print("  ✓ Setup complete. Ready for Script 2 (download).")
    print("=" * 50)
