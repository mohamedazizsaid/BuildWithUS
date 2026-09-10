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

# Install all deps (devDeps needed to compile TS).
# npm ci creates a symlink: node_modules/@winaity/shared-kernel → /packages/shared-kernel
# We immediately overwrite it with the real built files from kernel-builder.
RUN npm ci

# Overwrite the file: symlink with the actual compiled kernel dist
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
COPY --from=svc-builder /app/proto ./proto
COPY --from=svc-builder /app/package.json /app/package-lock.json ./

# Copy node_modules from the build stage.
# This includes the symlink: node_modules/@winaity/shared-kernel → /packages/shared-kernel
# Docker follows the symlink when writing, creating /packages/shared-kernel/dist/... files.
COPY --from=svc-builder /app/node_modules ./node_modules

# Ensure /packages/shared-kernel exists and has the compiled kernel dist and its own node_modules.
# We copy the kernel's node_modules (installed via npm ci in kernel-builder) directly so that
# ALL kernel dependencies (including 'zod', '@nestjs/cqrs', etc.) resolve correctly without
# relying on template-service's node_modules, which does not list them as direct dependencies.
COPY --from=kernel-builder /kernel/dist /packages/shared-kernel/dist
COPY --from=kernel-builder /kernel/package.json /packages/shared-kernel/package.json
COPY --from=kernel-builder /kernel/node_modules /packages/shared-kernel/node_modules

RUN useradd -r -s /bin/false appuser && chown -R appuser /app /packages/shared-kernel
USER appuser

EXPOSE 50054

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "if [ -f dist/src/main.js ]; then node dist/src/main.js; else node dist/main.js; fi"]
