#!/usr/bin/env bash
# ============================================================
# Production deploy helper — run ON THE SERVER, from infra/.
# Pulls the latest code from GitLab and rebuilds containers.
#
# Usage:
#   ./deploy.sh            # git pull + rebuild frontend only (most common)
#   ./deploy.sh all        # git pull + rebuild every service
#   ./deploy.sh <service>  # git pull + rebuild one service (e.g. api-gateway)
#
# Note: any change to a PUBLIC_* / FRONTEND_ORIGIN URL in .env needs a
# frontend rebuild (those are baked in at build time) — that's the default.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"                       # -> infra/
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> git pull"
git -C .. pull

TARGET="${1:-frontend}"
if [ "$TARGET" = "all" ]; then
  echo "==> rebuilding ALL services"
  $COMPOSE up -d --build
else
  echo "==> rebuilding '$TARGET'"
  $COMPOSE up -d --build "$TARGET"
fi

echo "==> status"
$COMPOSE ps
echo "==> done."
