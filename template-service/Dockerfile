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

# Copy package manifests first (cache layer)
COPY template-service/package.json template-service/package-lock.json ./

# Install all deps (devDeps needed to compile TS)
RUN npm ci

# Copy built shared-kernel into node_modules path expected by the package.json reference
COPY --from=kernel-builder /kernel/dist /app/node_modules/@winaity/shared-kernel/dist
COPY --from=kernel-builder /kernel/package.json /app/node_modules/@winaity/shared-kernel/package.json

# Copy source + the pre-generated proto/generated TypeScript stubs (committed to git)
COPY template-service/ ./

# proto/generated is already committed — no cp/generation needed.
# NestJS build only: nest build + tsc-alias path rewriting
RUN npm run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy .proto files for runtime gRPC loader (for dynamic reflection)
COPY packages/proto/ /packages/proto/

COPY --from=svc-builder /app/dist ./dist
# Copy proto/generated TS stubs as well (runtime may reflect on them)
COPY --from=svc-builder /app/proto ./proto
COPY --from=svc-builder /app/package.json /app/package-lock.json ./

# Copy node_modules from the build stage — already has all runtime deps installed.
# This avoids re-running npm ci which would try to resolve file:../packages/shared-kernel
# and create a broken symlink outside /app.
COPY --from=svc-builder /app/node_modules ./node_modules

# Inject the pre-built shared-kernel dist — overwrites the file: symlink npm created.
# /app/node_modules/@nestjs/cqrs already exists here, so require('@nestjs/cqrs') works.
COPY --from=kernel-builder /kernel/dist /app/node_modules/@winaity/shared-kernel/dist
COPY --from=kernel-builder /kernel/package.json /app/node_modules/@winaity/shared-kernel/package.json


RUN useradd -r -s /bin/false appuser && chown -R appuser /app
USER appuser

EXPOSE 50054

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "if [ -f dist/src/main.js ]; then node dist/src/main.js; else node dist/main.js; fi"]

