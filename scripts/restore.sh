#!/usr/bin/env bash
# =============================================================================
# Восстановление БД из pg_dump backup
# Использование: npm run restore [filename]
#   npm run restore                    # интерактивный выбор
#   npm run restore backup-20250101-030000.sql
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/docker/backups"

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_ROOT/.env"
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-project3}"

CONTAINER=""
for name in fabermd-postgres-prod fabermd-postgres; do
  if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    CONTAINER="$name"
    break
  fi
done

if [ -z "$CONTAINER" ]; then
  echo "[ERROR] Postgres container not found."
  exit 1
fi

if [ -n "$1" ]; then
  BACKUP_FILE="$1"
  if [[ "$BACKUP_FILE" != /* ]]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
  fi
else
  echo "Available backups:"
  ls -1 "$BACKUP_DIR"/backup-*.sql 2>/dev/null || { echo "No backups found."; exit 1; }
  echo ""
  read -rp "Enter filename (e.g. backup-20250101-030000.sql): " INPUT
  BACKUP_FILE="$BACKUP_DIR/$INPUT"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] File not found: $BACKUP_FILE"
  exit 1
fi

echo "[WARN] This will DROP and recreate $POSTGRES_DB. Continue? (y/N)"
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

FILENAME=$(basename "$BACKUP_FILE")
# Файл в контейнере: /backups (volume = ./docker/backups)
echo "[INFO] Restoring from $FILENAME..."
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" "$CONTAINER" \
  psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" "$CONTAINER" \
  psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $POSTGRES_DB;"
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" "$CONTAINER" \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "/backups/$FILENAME"

echo "[OK] Restore complete."

