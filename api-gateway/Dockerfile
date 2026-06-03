# ============================================================
# API Gateway — PRODUCTION image
# NOTE: build context must be the REPO ROOT (set in docker-compose.prod.yml),
# because this service needs .proto files from sibling folders.
#
# This service runs with ts-node (it has no compile step yet). That works
# fine; compiling to plain JS later is an optional optimization.
# ============================================================

# Official Node 20 on slim Debian. We use Debian (not Alpine) because
# Playwright's Chromium needs standard Linux libraries that Alpine lacks.
FROM node:20-bookworm-slim

WORKDIR /app

# Copy only the gateway's dependency manifests first (better build caching).
COPY api-gateway/package.json api-gateway/package-lock.json ./

# Install dependencies. We keep dev deps because the app runs via ts-node,
# which needs typescript + ts-node at runtime.
RUN npm ci

# Install the Chromium browser AND its system libraries (--with-deps),
# used by Playwright to render contracts/invoices into PDF.
# We pin a fixed browser location so it's easy to reason about.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

# Copy the gateway source code.
COPY api-gateway/ ./

# Copy the .proto files this service loads at startup.
# (app.module.ts reads them from these paths via the env vars below.)
COPY auth-service/proto /auth-service/proto
COPY packages/proto /packages/proto

ENV NODE_ENV=production

# Point the gRPC clients at the proto files we copied above.
# These override the default relative paths in app.module.ts.
ENV AUTH_PROTO_PATH=/auth-service/proto/auth.proto
ENV TEMPLATE_CMD_PROTO_PATH=/packages/proto/template_commands.proto
ENV TEMPLATE_QUERY_PROTO_PATH=/packages/proto/template_queries.proto

# The gateway listens on port 3000 inside the container.
EXPOSE 3000

# Start the server.
CMD ["npx", "ts-node", "src/main.ts"]
