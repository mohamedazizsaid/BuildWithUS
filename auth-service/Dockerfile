# ──────────────────────────────────────────────────────────────────────────────
# auth-service — Production Dockerfile
# Build context: auth-service/ directory (self-contained)
# docker build -t auth-service ./auth-service
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Compile TypeScript (NestJS)
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proto ./proto
COPY --from=builder /app/package.json /app/package-lock.json ./

# Install production deps only
RUN npm ci --omit=dev

# Non-root user
RUN useradd -r -s /bin/false appuser && chown -R appuser /app
USER appuser

EXPOSE 50055

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
