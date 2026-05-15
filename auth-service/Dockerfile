# syntax=docker/dockerfile:1.7

# ===== Stage 1: install all deps (dev + prod) =====
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ===== Stage 2: build TypeScript =====
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ===== Stage 3: install only production deps =====
FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ===== Stage 4: final runtime image =====
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as non-root
RUN groupadd -r nodejs && useradd -r -g nodejs -m nestjs

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs
EXPOSE 50055
CMD ["node", "dist/src/main.js"]