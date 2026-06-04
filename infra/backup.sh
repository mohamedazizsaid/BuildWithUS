#!/usr/bin/env bash
# ============================================================
# Backup helper — run ON THE SERVER, from infra/.
# Dumps Postgres (all databases + roles) and archives the MinIO
# data volume into ./backups, keeping the last 7 of each.
#
# Usage:   ./backup.sh
# Cron:    0 3 * * * cd /srv/projects/winaity-template-builder/infra && ./backup.sh >> backup.log 2>&1
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"                       # -> infra/

# Load DB credentials from .env
set -a; . ./.env; set +a

STAMP="$(date +%Y%m%d-%H%M%S)"
DIR="./backups"
KEEP=7
mkdir -p "$DIR"

echo "==> [1/2] Postgres dump (all databases)"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" winaity-postgres \
  pg_dumpall -U "$POSTGRES_USER" | gzip > "$DIR/pg-$STAMP.sql.gz"

echo "==> [2/2] MinIO data archive"
docker run --rm \
  -v infra_minio_data:/data:ro \
  -v "$PWD/$DIR":/backup \
  alpine tar czf "/backup/minio-$STAMP.tar.gz" -C /data .

echo "==> pruning (keeping last $KEEP of each)"
ls -1t "$DIR"/pg-*.sql.gz    2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
ls -1t "$DIR"/minio-*.tar.gz 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f

echo "==> done. Current backups:"
ls -lh "$DIR"
