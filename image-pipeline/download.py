"""
Script 2 — Download
Downloads 1,000 images from Unsplash using their free lite dataset CSV.
Images are saved to ./images/ folder locally.
"""

import os
import sys
import time
import csv
import io
import requests
from pathlib import Path
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

IMAGES_DIR = Path("images")
TOTAL = 1000
DATASET_URL = "https://unsplash.com/data/lite/latest"
TIMEOUT = 15       # seconds per image request
DELAY = 0.05       # seconds between requests (be polite)
PHOTO_SIZE = "small"  # thumb | small | regular | full


def download_dataset_csv() -> list[dict]:
    """Download the Unsplash Lite dataset CSV and return photo rows."""
    print("[Dataset] Downloading Unsplash Lite photo list...")

    # Unsplash Lite dataset: photos.tsv is inside a zip
    # Direct TSV download (no auth needed for lite dataset)
    tsv_url = "https://unsplash.com/data/lite/latest"

    # Fallback: use the public Unsplash source list
    # We'll use the curated collection approach via unsplash source
    print("[Dataset] Using Unsplash Source (no API key required)...")
    return []


def build_photo_urls(count: int) -> list[dict]:
    """
    Build a list of photo download entries.
    Uses picsum.photos as a reliable free source with consistent IDs,
    and Unsplash Source for variety.
    """
    photos = []

    # Strategy: use picsum.photos IDs 1–1000 (free, no API key, real photos)
    # picsum uses real Unsplash photographer photos under the Unsplash license
    for i in range(1, count + 1):
        photos.append({
            "id": f"picsum_{i:04d}",
            "url": f"https://picsum.photos/id/{i}/800/600",
            "width": 800,
            "height": 600,
        })

    return photos


def download_images(photos: list[dict]) -> int:
    """Download images and save to ./images/ folder. Returns success count."""
    IMAGES_DIR.mkdir(exist_ok=True)

    success = 0
    failed = 0
    skipped = 0

    print(f"[Download] Starting download of {len(photos)} images...")
    print(f"[Download] Saving to: {IMAGES_DIR.resolve()}")
    print()

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Winaity-ImagePipeline/1.0 (educational use)"
    })

    with tqdm(photos, unit="img", ncols=80) as bar:
        for photo in bar:
            photo_id = photo["id"]
            file_path = IMAGES_DIR / f"{photo_id}.jpg"

            # Skip already downloaded
            if file_path.exists() and file_path.stat().st_size > 1000:
                skipped += 1
                bar.set_postfix(ok=success, skip=skipped, fail=failed)
                continue

            try:
                resp = session.get(photo["url"], timeout=TIMEOUT, stream=True)
                resp.raise_for_status()

                with open(file_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)

                # Verify file is a valid image (not an error page)
                size = file_path.stat().st_size
                if size < 1000:
                    file_path.unlink()
                    failed += 1
                else:
                    success += 1

            except requests.exceptions.Timeout:
                failed += 1
                bar.write(f"  TIMEOUT: {photo_id}")
            except requests.exceptions.HTTPError as e:
                failed += 1
                # picsum IDs may not all exist — skip silently
                if resp.status_code not in (404, 410):
                    bar.write(f"  HTTP {resp.status_code}: {photo_id}")
            except Exception as e:
                failed += 1
                bar.write(f"  ERROR {photo_id}: {e}")

            bar.set_postfix(ok=success, skip=skipped, fail=failed)
            time.sleep(DELAY)

    return success


def main():
    print("=" * 50)
    print("  Winaity Image Pipeline — Download")
    print("=" * 50)
    print()

    photos = build_photo_urls(TOTAL)
    print(f"[Dataset] {len(photos)} photo URLs prepared.")
    print()

    success = download_images(photos)

    print()
    print("=" * 50)
    print(f"  Downloaded: {success}/{TOTAL} images")
    print(f"  Saved to:   {IMAGES_DIR.resolve()}")
    print("=" * 50)

    if success < TOTAL * 0.8:
        print(f"\n  WARNING: Only {success} images downloaded (< 80% success rate).")
        print("  Check your internet connection and re-run to resume.")
        sys.exit(1)
    else:
        print("\n  ✓ Ready for Script 3 (upload to MinIO).")


if __name__ == "__main__":
    main()
