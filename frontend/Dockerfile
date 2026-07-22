# ============================================================
# Frontend — PRODUCTION image (Next.js)
# Used on the server only. Your laptop keeps using Dockerfile.dev.
# Build with: docker compose -f docker-compose.yml -f docker-compose.prod.yml build
# ============================================================

# Start FROM an official Node.js 20 image.
# "bookworm-slim" = Debian 12 ("bookworm"), the "slim" = smaller, fewer extras.
FROM node:20-bookworm-slim

# Every command below runs inside this folder in the container.
# If it doesn't exist, Docker creates it.
WORKDIR /app

# --- BUILD-TIME public variables (Next.js bakes these into the JS) ---
# ARG = a value you can pass in at build time. The docker-compose.prod.yml
# passes the REAL server URLs here so the browser code points to the server,
# not to localhost. We copy each ARG into an ENV so "next build" can read it.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MINIO_URL
ARG NEXT_PUBLIC_AI_SERVICE_URL
ARG NEXT_PUBLIC_IMAGE_SEARCH_API
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CONVEX_SITE_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MINIO_URL=$NEXT_PUBLIC_MINIO_URL
ENV NEXT_PUBLIC_AI_SERVICE_URL=$NEXT_PUBLIC_AI_SERVICE_URL
ENV NEXT_PUBLIC_IMAGE_SEARCH_API=$NEXT_PUBLIC_IMAGE_SEARCH_API
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_SITE_URL=$NEXT_PUBLIC_CONVEX_SITE_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Copy ONLY the dependency manifests first (not the whole project yet).
# Docker caches this step, so it re-installs packages only when these files
# change — making future builds much faster.
COPY package.json package-lock.json ./

# Install exactly the versions locked in package-lock.json.
# We keep dev dependencies because the build (Tailwind, TypeScript) needs them.
RUN npm ci

# Now copy the rest of the source code into the image.
COPY . .

# Compile + optimize the app ONCE, ahead of time.
# This is the big difference vs dev: the finished site is prepared now,
# so users never wait for pages to compile.
RUN npm run build

# Tell Next.js (and our code) we are in production mode.
ENV NODE_ENV=production

# Document that this container listens on port 3000 (internal).
EXPOSE 3000

# Start the FAST production server (not "next dev").
# -H 0.0.0.0 makes it listen on all network interfaces (required in containers).
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
