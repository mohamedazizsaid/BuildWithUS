"""
Script 2b — Download More (Pexels)
Downloads up to 10,000 modern images from Pexels API.
Images are saved to ./images/ folder (same as download.py).
Running upload.py + embed.py afterwards will only process the new ones.

Prerequisites:
  1. Free API key at https://www.pexels.com/api/
  2. Set PEXELS_API_KEY in .env or pass as env var

Usage:
  python download_more.py
"""

import os
import sys
import time
import requests
from pathlib import Path
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

IMAGES_DIR = Path("images")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
TARGET_TOTAL = 10_000
PER_PAGE = 80          # Pexels max per request
DELAY_API = 0.4        # seconds between API requests
DELAY_IMG = 0.02       # seconds between image downloads
IMG_WIDTH = 800        # download at 800px width (medium quality)
TIMEOUT = 15

# ─── Categories ──────────────────────────────────────────────────────────────
# 50 diverse categories relevant to email marketing (French company context)
CATEGORIES = [
    # Nature & paysages
    "nature", "forest", "mountain", "beach", "sunset", "sky", "flowers",
    "ocean", "lake", "countryside", "waterfall", "desert",
    # Business & technologie
    "business", "office", "technology", "startup", "meeting", "laptop",
    "conference", "teamwork", "success", "presentation", "coworking",
    # Personnes & lifestyle
    "people", "woman", "man", "family", "smile", "portrait", "team",
    "fashion", "lifestyle", "fitness", "yoga", "meditation",
    # Alimentation
    "food", "restaurant", "coffee", "healthy food", "dessert",
    "cooking", "vegetables", "fruits",
    # Architecture & ville
    "city", "architecture", "interior", "house", "street", "night city",
    # Produits & commerce
    "shopping", "luxury", "product", "ecommerce", "packaging",
    # Santé & bien-être
    "health", "wellness", "medical", "spa",
    # Événements & célébrations
    "celebration", "wedding", "event", "party",
    # Abstrait & fonds
    "abstract", "texture", "background", "minimal", "dark background",
    "white background",
]

# How many images to fetch per category (will stop at TARGET_TOTAL)
IMAGES_PER_CATEGORY = max(1, TARGET_TOTAL // len(CATEGORIES))


def check_api_key():
    if not PEXELS_API_KEY:
        print("ERROR: PEXELS_API_KEY is not set.")
        print()
        print("  1. Go to https://www.pexels.com/api/")
        print("  2. Create a free account and get your API key")
        print("  3. Add it to image-pipeline/.env:")
        print("     PEXELS_API_KEY=your_key_here")
        sys.exit(1)


def fetch_pexels_photos(query: str, count: int, session: requests.Session) -> list[dict]:
    """Fetch up to `count` photo metadata from Pexels for a search query."""
    photos = []
    page = 1

    while len(photos) < count:
        remaining = count - len(photos)
        per_page = min(PER_PAGE, remaining)

        try:
            resp = session.get(
                "https://api.pexels.com/v1/search",
                params={"query": query, "per_page": per_page, "page": page, "size": "medium"},
                timeout=TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"\n  API error for '{query}': {e}")
            break

        batch = data.get("photos", [])
        if not batch:
            break

        for p in batch:
            # Use medium size (~1200px) or small (~350px), we pick medium
            url = p.get("src", {}).get("medium") or p.get("src", {}).get("small")
            if url:
                photos.append({
                    "id": f"pexels_{p['id']:08d}",
                    "url": url,
                })

        if not data.get("next_page"):
            break

        page += 1
        time.sleep(DELAY_API)

    return photos


def already_downloaded(file_path: Path) -> bool:
    return file_path.exists() and file_path.stat().st_size > 5000


def download_image(url: str, file_path: Path, session: requests.Session) -> bool:
    try:
        resp = session.get(url, timeout=TIMEOUT, stream=True)
        resp.raise_for_status()
        with open(file_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        return file_path.stat().st_size > 5000
    except Exception:
        if file_path.exists():
            file_path.unlink()
        return False


def main():
    print("=" * 55)
    print("  Winaity Image Pipeline — Download More (Pexels)")
    print("=" * 55)
    print()

    check_api_key()
    IMAGES_DIR.mkdir(exist_ok=True)

    existing = {f.stem for f in IMAGES_DIR.glob("pexels_*.jpg")}
    print(f"[Resume] {len(existing)} Pexels images already downloaded.")
    print(f"[Target] {TARGET_TOTAL} images across {len(CATEGORIES)} categories")
    print()

    api_session = requests.Session()
    api_session.headers.update({
        "Authorization": PEXELS_API_KEY,
        "User-Agent": "Winaity-ImagePipeline/1.0",
    })
    img_session = requests.Session()
    img_session.headers.update({
        "User-Agent": "Winaity-ImagePipeline/1.0",
    })

    total_success = 0
    total_skipped = 0
    total_failed = 0
    total_downloaded = len(existing)

    for cat_idx, category in enumerate(CATEGORIES):
        if total_downloaded >= TARGET_TOTAL:
            print(f"\n[Done] Reached {TARGET_TOTAL} target.")
            break

        remaining_target = TARGET_TOTAL - total_downloaded
        fetch_count = min(IMAGES_PER_CATEGORY, remaining_target)

        print(f"[{cat_idx+1}/{len(CATEGORIES)}] '{category}' — fetching {fetch_count} photos...")

        photos = fetch_pexels_photos(category, fetch_count, api_session)
        if not photos:
            print(f"  No results for '{category}', skipping.")
            continue

        time.sleep(DELAY_API)

        with tqdm(photos, unit="img", ncols=70, leave=False) as bar:
            for photo in bar:
                if total_downloaded >= TARGET_TOTAL:
                    break

                file_path = IMAGES_DIR / f"{photo['id']}.jpg"

                if already_downloaded(file_path):
                    total_skipped += 1
                    bar.set_postfix(ok=total_success, skip=total_skipped)
                    continue

                ok = download_image(photo["url"], file_path, img_session)
                if ok:
                    total_success += 1
                    total_downloaded += 1
                else:
                    total_failed += 1

                bar.set_postfix(ok=total_success, skip=total_skipped, fail=total_failed)
                time.sleep(DELAY_IMG)

        print(f"  ✓ {total_downloaded} total images so far")

    print()
    print("=" * 55)
    print(f"  New downloads: {total_success}")
    print(f"  Already had:   {total_skipped}")
    print(f"  Failed:        {total_failed}")
    print(f"  Total in /images: {total_downloaded}")
    print("=" * 55)
    print()

    if total_success > 0:
        print("  Next steps:")
        print("  1. python upload.py    ← uploads only new images to MinIO")
        print("  2. python embed.py     ← tags + embeds only new images")
        print()
        print("  Both scripts are resumable — existing images are skipped.")
    else:
        print("  No new images downloaded.")


if __name__ == "__main__":
    main()
