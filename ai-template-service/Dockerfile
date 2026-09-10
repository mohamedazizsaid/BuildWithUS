# ──────────────────────────────────────────────────────────────────────────────
# ai-template-service — Production Dockerfile
# Build context: ai-template-service/ directory
# docker build -t ai-template-service ./ai-template-service
# ──────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS runtime

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (for layer cache)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Non-root user
RUN useradd -r -s /bin/false appuser && chown -R appuser /app
USER appuser

# Render sets $PORT; default to 8001 for local runs
ENV PORT=8001

EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
