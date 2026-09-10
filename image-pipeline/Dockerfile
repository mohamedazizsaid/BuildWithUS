# ──────────────────────────────────────────────────────────────────────────────
# image-pipeline — Production Dockerfile
# Build context: image-pipeline/ directory
# docker build -t image-pipeline ./image-pipeline
# ──────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS runtime

# System dependencies for chromadb / numpy / sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (for layer cache)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (only the API entry point needed for runtime)
COPY search_api.py ./

# Non-root user
RUN useradd -r -s /bin/false appuser && chown -R appuser /app
USER appuser

# Render sets $PORT; default to 8002 for local runs
ENV PORT=8002

EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn search_api:app --host 0.0.0.0 --port ${PORT}"]
