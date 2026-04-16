"""
search_api.py — Pexels-powered image search proxy.

All images are served directly from Pexels CDN — no MinIO, no ChromaDB needed.

Endpoints:
  GET /search?q=lion&limit=40     → search Pexels by query
  GET /popular?limit=40           → Pexels curated/popular photos
  POST /use/{image_id}            → no-op (kept for frontend compatibility)
  GET /health                     → health check

Run:
  uvicorn search_api:app --host 0.0.0.0 --port 8002 --reload
"""

import os
import requests
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
PEXELS_SEARCH  = "https://api.pexels.com/v1/search"
PEXELS_CURATED = "https://api.pexels.com/v1/curated"
HEADERS        = {"Authorization": PEXELS_API_KEY}

app = FastAPI(title="Winaity Image Search API — Pexels", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Model ────────────────────────────────────────────────────────────────────

class StockImage(BaseModel):
    id: str
    url: str
    tags: list[str]
    description: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    score: float = 1.0


# ─── Helper ───────────────────────────────────────────────────────────────────

def pexels_photo_to_image(photo: dict, score: float = 1.0) -> StockImage:
    alt = photo.get("alt") or ""
    # Use medium-large size — good balance of quality and speed
    url = photo["src"].get("large") or photo["src"].get("original")
    # Build simple tags from alt text words (3+ chars, deduplicated)
    tag_words = list(dict.fromkeys(
        w.lower() for w in alt.replace(",", " ").split() if len(w) >= 3
    ))[:8]

    return StockImage(
        id=str(photo["id"]),
        url=url,
        tags=tag_words,
        description=alt or None,
        width=photo.get("width"),
        height=photo.get("height"),
        score=score,
    )


def pexels_get(endpoint: str, params: dict) -> dict:
    """Call Pexels API, raise 502 on failure."""
    if not PEXELS_API_KEY:
        raise HTTPException(503, "PEXELS_API_KEY not configured.")
    try:
        r = requests.get(endpoint, headers=HEADERS, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        raise HTTPException(502, f"Pexels API error: {e}")
    except requests.RequestException as e:
        raise HTTPException(502, f"Pexels unreachable: {e}")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    ok = bool(PEXELS_API_KEY)
    return {"status": "ok" if ok else "missing_api_key", "backend": "pexels"}


@app.get("/search", response_model=list[StockImage])
def search(
    q: str = Query(..., min_length=1, max_length=500),
    limit: int = Query(40, ge=1, le=200),
):
    """Search Pexels by any query (French or English)."""
    data = pexels_get(PEXELS_SEARCH, {
        "query": q,
        "per_page": min(limit, 80),   # Pexels max per page
        "orientation": "landscape",
        "locale": "fr-FR",            # prefer French metadata when available
    })
    photos = data.get("photos", [])

    # If limit > 80, fetch a second page
    if limit > 80 and data.get("next_page"):
        data2 = pexels_get(PEXELS_SEARCH, {
            "query": q,
            "per_page": min(limit - 80, 80),
            "orientation": "landscape",
            "locale": "fr-FR",
            "page": 2,
        })
        photos += data2.get("photos", [])

    total = len(photos)
    return [
        pexels_photo_to_image(p, score=round(1 - i / max(total, 1), 4))
        for i, p in enumerate(photos)
    ]


@app.get("/popular", response_model=list[StockImage])
def popular(limit: int = Query(40, ge=1, le=200)):
    """Return Pexels curated (editor-picked) photos."""
    data = pexels_get(PEXELS_CURATED, {
        "per_page": min(limit, 80),
    })
    photos = data.get("photos", [])

    if limit > 80 and data.get("next_page"):
        data2 = pexels_get(PEXELS_CURATED, {"per_page": min(limit - 80, 80), "page": 2})
        photos += data2.get("photos", [])

    return [pexels_photo_to_image(p) for p in photos]


@app.post("/use/{image_id}")
def increment_usage(image_id: str):
    """No-op — kept for frontend compatibility. Pexels tracks usage server-side."""
    return {"ok": True}
