#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
OUTPUT_FILE="$BACKUP_DIR/fregenet_backup_${TIMESTAMP}.sql"

if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

mkdir -p "$BACKUP_DIR"

DB_HOST="${MARIADB_HOST:-127.0.0.1}"
DB_PORT="${MARIADB_PORT:-3306}"
DB_NAME="${MARIADB_DATABASE:-}"
DB_USER="${MARIADB_USER:-}"
DB_PASS="${MARIADB_PASSWORD:-}"

if [[ -z "$DB_NAME" && -n "${DATABASE_URL:-}" ]]; then
  DB_NAME="$(echo "$DATABASE_URL" | sed -E 's#^.*/([^?]+)(\?.*)?$#\1#')"
fi

if [[ -z "$DB_USER" && -n "${DATABASE_URL:-}" ]]; then
  DB_USER="$(echo "$DATABASE_URL" | sed -E 's#^mysql://([^:]+):.*$#\1#')"
fi

if [[ -z "$DB_PASS" && -n "${DATABASE_URL:-}" ]]; then
  DB_PASS="$(echo "$DATABASE_URL" | sed -E 's#^mysql://[^:]+:([^@]+)@.*$#\1#')"
fi

if [[ -z "$DB_HOST" && -n "${DATABASE_URL:-}" ]]; then
  DB_HOST="$(echo "$DATABASE_URL" | sed -E 's#^mysql://[^@]+@([^:/?]+).*$#\1#')"
fi

if [[ -z "$DB_PORT" && -n "${DATABASE_URL:-}" ]]; then
  DB_PORT="$(echo "$DATABASE_URL" | sed -nE 's#^mysql://[^@]+@[^:/?]+:([0-9]+).*$#\1#p')"
  DB_PORT="${DB_PORT:-3306}"
fi

if [[ -z "$DB_NAME" || -z "$DB_USER" || -z "$DB_PASS" ]]; then
  echo "Missing DB credentials. Set MARIADB_DATABASE, MARIADB_USER, MARIADB_PASSWORD (or DATABASE_URL)."
  exit 1
fi

if ! command -v mysqldump >/dev/null 2>&1; then
  echo "mysqldump is required but not found in PATH."
  exit 1
fi

MYSQL_PWD="$DB_PASS" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "$DB_NAME" > "$OUTPUT_FILE"

find "$BACKUP_DIR" -type f -name '*.sql' -mtime +30 -delete

echo "Database backup created: $OUTPUT_FILE"
