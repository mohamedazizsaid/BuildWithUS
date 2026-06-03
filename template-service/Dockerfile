# syntax=docker/dockerfile:1.7

# ===== Stage 1: install all deps (monorepo aware) =====
FROM node:20-bookworm-slim AS deps
WORKDIR /workspace

# Copy shared packages first (they're file: dependencies)
COPY packages ./packages

# Copy service manifests and install
COPY template-service/package.json template-service/package-lock.json ./template-service/
WORKDIR /workspace/template-service
RUN npm ci

# ===== Stage 2: build TypeScript + generate protos =====
FROM node:20-bookworm-slim AS builder
WORKDIR /workspace
COPY packages ./packages
COPY --from=deps /workspace/template-service/node_modules ./template-service/node_modules
COPY template-service ./template-service
WORKDIR /workspace/template-service
# The committed proto/generated/* files are the source of truth. The package's
# "prebuild" hook would delete them and try to regenerate from
# packages/proto/gen/ts (not generated in this repo), which fails. So we run the
# compiler directly (skipping prebuild) and keep the committed proto files.
RUN npx nest build && npx tsc-alias

# ===== Stage 3: install only production deps =====
FROM node:20-bookworm-slim AS prod-deps
WORKDIR /workspace
COPY packages ./packages
COPY template-service/package.json template-service/package-lock.json ./template-service/
WORKDIR /workspace/template-service
RUN npm ci --omit=dev && npm cache clean --force

# ===== Stage 4: final runtime image =====
FROM node:20-bookworm-slim AS runner
WORKDIR /workspace/template-service
ENV NODE_ENV=production

RUN groupadd -r nodejs && useradd -r -g nodejs -m nestjs

# Bring over generated protos (might be needed at runtime if loaded via proto-loader)
COPY --from=builder --chown=nestjs:nodejs /workspace/packages /workspace/packages
COPY --from=prod-deps --chown=nestjs:nodejs /workspace/template-service/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /workspace/template-service/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /workspace/template-service/proto ./proto
COPY --from=builder --chown=nestjs:nodejs /workspace/template-service/package.json ./package.json

USER nestjs
EXPOSE 50054
CMD ["node", "dist/src/main.js"]