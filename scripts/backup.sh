#!/usr/bin/env bash
# =============================================================================
# pg_dump backup для faber.md
# Использование: npm run backup (из корня api-master)
# Результат: ./docker/backups/backup-YYYYMMDD-HHMMSS.sql
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/docker/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup-$TIMESTAMP.sql"

# Загружаем .env если есть
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_ROOT/.env"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-project3}"
MAX_BACKUPS="${BACKUP_MAX_COUNT:-10}"

# Ищем контейнер Postgres (prod или dev)
CONTAINER=""
for name in fabermd-postgres-prod fabermd-postgres; do
  if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    CONTAINER="$name"
    break
  fi
done

if [ -z "$CONTAINER" ]; then
  echo "[ERROR] Postgres container not found. Run docker compose up -d first."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[INFO] Backing up $POSTGRES_DB from $CONTAINER..."
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" "$CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
  -f "/backups/backup-$TIMESTAMP.sql"

# Файл появляется в ./docker/backups через volume mount
echo "[OK] Backup saved: $BACKUP_DIR/backup-$TIMESTAMP.sql"

# Ротация: оставляем только последние MAX_BACKUPS
if [ -d "$BACKUP_DIR" ]; then
  COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "backup-*.sql" -type f | wc -l)
  if [ "$COUNT" -gt "$MAX_BACKUPS" ]; then
    echo "[INFO] Rotating old backups (keep $MAX_BACKUPS)..."
    find "$BACKUP_DIR" -maxdepth 1 -name "backup-*.sql" -type f -printf '%T@ %p\n' \
      | sort -n | head -n $((COUNT - MAX_BACKUPS)) | cut -d' ' -f2- | xargs -r rm -v
  fi
fi

