# ──────────────────────────────────────────────────────────────────────────────
# template-service — Production Dockerfile
# Build context: REPOSITORY ROOT (needed for packages/shared-kernel + packages/proto)
# docker build -f template-service/Dockerfile -t template-service .
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build shared-kernel ──────────────────────────────────────────────
FROM node:20-bookworm-slim AS kernel-builder

WORKDIR /kernel

COPY packages/shared-kernel/package.json packages/shared-kernel/package-lock.json ./
RUN npm ci

COPY packages/shared-kernel/ ./
RUN npm run build

# ── Stage 2: Build template-service ───────────────────────────────────────────
FROM node:20-bookworm-slim AS svc-builder

WORKDIR /app

# Copy proto files (packages/proto → used to generate typed stubs)
COPY packages/proto/ /packages/proto/

# Copy template-service
COPY template-service/package.json template-service/package-lock.json ./

# Install all deps (devDeps needed to compile TS)
RUN npm ci

# Copy built shared-kernel into node_modules path expected by the package.json reference
COPY --from=kernel-builder /kernel/dist /app/node_modules/@winaity/shared-kernel/dist
COPY --from=kernel-builder /kernel/package.json /app/node_modules/@winaity/shared-kernel/package.json

# Copy source
COPY template-service/ ./

# Compile NestJS
RUN npm run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy proto files for runtime gRPC loader
COPY packages/proto/ /packages/proto/

COPY --from=svc-builder /app/dist ./dist
COPY --from=svc-builder /app/proto ./proto
COPY --from=svc-builder /app/package.json /app/package-lock.json ./

# Runtime deps (no devDeps)
RUN npm ci --omit=dev

# Place shared-kernel dist in node_modules (runtime only needs the JS)
COPY --from=kernel-builder /kernel/dist /app/node_modules/@winaity/shared-kernel/dist
COPY --from=kernel-builder /kernel/package.json /app/node_modules/@winaity/shared-kernel/package.json

RUN useradd -r -s /bin/false appuser && chown -R appuser /app
USER appuser

EXPOSE 50054

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
