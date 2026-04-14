"""
Script 5 — Search API
FastAPI server that exposes semantic image search.

Endpoints:
  GET /search?q=plage&limit=20        → semantic search by French text
  GET /popular?limit=20&type=         → most used images (by usage_count)
  POST /use/{image_id}                → increment usage_count
  GET /health                         → health check

Run:
  uvicorn search_api:app --host 0.0.0.0 --port 8001 --reload
"""

import os
from contextlib import asynccontextmanager
from typing import Optional

import chromadb
import numpy as np
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

load_dotenv()

CHROMA_DIR = "chroma_db"

POSTGRES_HOST     = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT     = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER     = os.getenv("POSTGRES_USER", "winaity")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "winaity_dev")
POSTGRES_DB       = os.getenv("POSTGRES_DB", "images_db")


# ─── Global singletons (loaded once at startup) ───────────────────────────────

class AppState:
    txt_model: SentenceTransformer = None
    chroma_collection = None


state = AppState()


def get_pg_conn():
    return psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DB,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Loading multilingual text encoder...")
    state.txt_model = SentenceTransformer("clip-ViT-B-32-multilingual-v1")
    print("[Startup] Connecting to ChromaDB...")
    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    state.chroma_collection = chroma_client.get_collection("stock_images")
    count = state.chroma_collection.count()
    print(f"[Startup] Ready — {count} images indexed.")
    yield
    print("[Shutdown] Bye.")


app = FastAPI(
    title="Winaity Image Search API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────────────────

class ImageResult(BaseModel):
    id: str
    file_name: str
    url: str
    tags: list[str]
    description: Optional[str]
    width: Optional[int]
    height: Optional[int]
    usage_count: int
    score: float


# ─── Helpers ──────────────────────────────────────────────────────────────────

def fetch_images_by_ids(ids: list[str]) -> dict[str, dict]:
    """Fetch image rows from PostgreSQL by their UUIDs."""
    if not ids:
        return {}
    conn = get_pg_conn()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT id, file_name, minio_url, tags, description, width, height, usage_count "
            "FROM images WHERE id = ANY(%s::uuid[])",
            (ids,),
        )
        rows = cursor.fetchall()
        return {str(row["id"]): dict(row) for row in rows}
    finally:
        conn.close()


def chroma_results_to_images(results, pg_rows: dict[str, dict]) -> list[ImageResult]:
    """Merge ChromaDB results with PostgreSQL rows into ImageResult objects."""
    images = []
    ids = results["ids"][0]
    distances = results["distances"][0]
    metadatas = results["metadatas"][0]

    for i, chroma_id in enumerate(ids):
        metadata = metadatas[i]
        image_id = metadata.get("image_id", "")
        pg = pg_rows.get(image_id)
        if not pg:
            continue

        # ChromaDB cosine distance → similarity score (0–1)
        score = round(1 - distances[i], 4)

        images.append(ImageResult(
            id=image_id,
            file_name=pg["file_name"],
            url=pg["minio_url"],
            tags=pg.get("tags") or [],
            description=pg.get("description"),
            width=pg.get("width"),
            height=pg.get("height"),
            usage_count=pg.get("usage_count", 0),
            score=score,
        ))

    return images


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "indexed": state.chroma_collection.count(),
    }


@app.get("/search", response_model=list[ImageResult])
def search(
    q: str = Query(..., min_length=1, max_length=500, description="French search query"),
    limit: int = Query(20, ge=1, le=100),
):
    """Semantic search — encode French query and find nearest images."""
    if state.txt_model is None or state.chroma_collection is None:
        raise HTTPException(503, "Search engine not ready yet.")

    # Encode the query
    query_embedding = state.txt_model.encode(q, show_progress_bar=False)
    query_embedding = np.array(query_embedding, dtype=np.float32)
    query_embedding = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)

    # Search ChromaDB
    results = state.chroma_collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=min(limit, state.chroma_collection.count()),
        include=["metadatas", "distances"],
    )

    if not results["ids"] or not results["ids"][0]:
        return []

    # Fetch PostgreSQL rows
    image_ids = [m.get("image_id", "") for m in results["metadatas"][0]]
    pg_rows = fetch_images_by_ids(image_ids)

    return chroma_results_to_images(results, pg_rows)


@app.get("/popular", response_model=list[ImageResult])
def popular(limit: int = Query(20, ge=1, le=100)):
    """Return most-used images sorted by usage_count DESC."""
    conn = get_pg_conn()
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            """
            SELECT id, file_name, minio_url, tags, description, width, height, usage_count
            FROM images
            ORDER BY usage_count DESC, created_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cursor.fetchall()
    finally:
        conn.close()

    return [
        ImageResult(
            id=str(row["id"]),
            file_name=row["file_name"],
            url=row["minio_url"],
            tags=row.get("tags") or [],
            description=row.get("description"),
            width=row.get("width"),
            height=row.get("height"),
            usage_count=row.get("usage_count", 0),
            score=1.0,
        )
        for row in rows
    ]


@app.post("/use/{image_id}")
def increment_usage(image_id: str):
    """Called when a user inserts an image into a template."""
    conn = get_pg_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE images SET usage_count = usage_count + 1 WHERE id = %s",
            (image_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(404, f"Image {image_id} not found.")
        conn.commit()
    finally:
        conn.close()

    return {"ok": True}
