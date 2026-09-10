# ──────────────────────────────────────────────────────────────────────────────
# api-gateway — Production Dockerfile
# Build context: ./api-gateway  (Render sets this — all paths are relative to api-gateway/)
# docker build -f api-gateway/Dockerfile api-gateway/
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package manifests first for layer caching (context = api-gateway/, so no prefix needed)
COPY package.json package-lock.json ./

# Install ALL deps (including devDeps — need TypeScript compiler)
RUN npm ci

# Copy source
COPY . ./

# Compile TypeScript → dist/
RUN npx tsc --project tsconfig.json

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

# System deps for Playwright Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled output + proto files + package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proto ./proto
COPY --from=builder /app/package.json /app/package-lock.json ./

# Install production deps only
RUN npm ci --omit=dev

# Install Playwright Chromium binary (uses PLAYWRIGHT_BROWSERS_PATH)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

# Non-root user for security
RUN useradd -r -s /bin/false appuser && chown -R appuser /app /ms-playwright
USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
