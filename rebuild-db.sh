#!/usr/bin/env bash
set -euo pipefail

# Hard reset script for FKL local MariaDB + Prisma sync.
# - Reads DATABASE_URL from .env
# - Rebuilds Docker DB container on 127.0.0.1:3308
# - Applies Prisma schema and regenerates client
# - Clears .next cache

ENV_FILE=".env"
CONTAINER_NAME="fregenet-local-db"
VOLUME_NAME="fkl-local-data"
IMAGE="mariadb:11"
HOST_PORT="3308"
CONTAINER_PORT="3306"
ROOT_PASSWORD="fkl_root_password"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE was not found in $(pwd)"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is required but not installed or not in PATH."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required but not installed or not in PATH."
  exit 1
fi

echo "[1/7] Extracting credentials from $ENV_FILE"
DB_URL_LINE="$(grep -E '^DATABASE_URL=' "$ENV_FILE" || true)"
if [[ -z "$DB_URL_LINE" ]]; then
  echo "Error: DATABASE_URL is missing in $ENV_FILE"
  exit 1
fi

DB_URL="${DB_URL_LINE#DATABASE_URL=}"
DB_URL="${DB_URL%\"}"
DB_URL="${DB_URL#\"}"

# Expected form: mysql://user:pass@host:port/database
if [[ "$DB_URL" != mysql://* ]]; then
  echo "Error: DATABASE_URL must start with mysql://"
  exit 1
fi

URL_BODY="${DB_URL#mysql://}"
CRED_PART="${URL_BODY%@*}"
HOST_DB_PART="${URL_BODY#*@}"

DB_USER="${CRED_PART%%:*}"
DB_PASSWORD="${CRED_PART#*:}"
HOST_PORT_PART="${HOST_DB_PART%%/*}"
DB_NAME_WITH_QUERY="${HOST_DB_PART#*/}"
DB_NAME="${DB_NAME_WITH_QUERY%%\?*}"

DB_HOST="${HOST_PORT_PART%%:*}"
DB_PORT="${HOST_PORT_PART##*:}"

if [[ -z "$DB_USER" || -z "$DB_PASSWORD" || -z "$DB_NAME" ]]; then
  echo "Error: Could not parse DATABASE_URL credentials/database from $ENV_FILE"
  exit 1
fi

echo "Parsed DB config: user=$DB_USER db=$DB_NAME host=$DB_HOST port=$DB_PORT"

echo "[2/7] Ensuring DATABASE_URL host uses 127.0.0.1 on Fedora/Linux"
if [[ "$DB_HOST" == "localhost" ]]; then
  # Update only the DATABASE_URL line host component.
  sed -i -E 's#^(DATABASE_URL="mysql://[^:]+:[^@]+@)localhost(:[0-9]+/.*")#\1127.0.0.1\2#' "$ENV_FILE"
  echo "Updated DATABASE_URL host: localhost -> 127.0.0.1"
  # Refresh parsed URL after update.
  DB_URL_LINE="$(grep -E '^DATABASE_URL=' "$ENV_FILE")"
  DB_URL="${DB_URL_LINE#DATABASE_URL=}"
  DB_URL="${DB_URL%\"}"
  DB_URL="${DB_URL#\"}"
  URL_BODY="${DB_URL#mysql://}"
  CRED_PART="${URL_BODY%@*}"
  HOST_DB_PART="${URL_BODY#*@}"
  DB_USER="${CRED_PART%%:*}"
  DB_PASSWORD="${CRED_PART#*:}"
  HOST_PORT_PART="${HOST_DB_PART%%/*}"
  DB_NAME_WITH_QUERY="${HOST_DB_PART#*/}"
  DB_NAME="${DB_NAME_WITH_QUERY%%\?*}"
  DB_HOST="${HOST_PORT_PART%%:*}"
  DB_PORT="${HOST_PORT_PART##*:}"
fi

echo "[3/7] Removing old container if it exists: $CONTAINER_NAME"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "[4/7] Creating persistent volume if needed: $VOLUME_NAME"
docker volume create "$VOLUME_NAME" >/dev/null

echo "[5/7] Starting fresh MariaDB container on ${HOST_PORT}:${CONTAINER_PORT}"
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  -e MYSQL_ROOT_PASSWORD="$ROOT_PASSWORD" \
  -e MYSQL_DATABASE="$DB_NAME" \
  -e MYSQL_USER="$DB_USER" \
  -e MYSQL_PASSWORD="$DB_PASSWORD" \
  -v "${VOLUME_NAME}:/var/lib/mysql" \
  --restart unless-stopped \
  "$IMAGE" >/dev/null

echo "[6/7] Waiting for database port ${HOST_PORT} to accept connections"
tries=0
until (echo >"/dev/tcp/127.0.0.1/${HOST_PORT}") >/dev/null 2>&1; do
  tries=$((tries + 1))
  if [[ $tries -ge 60 ]]; then
    echo "Error: Timed out waiting for DB port ${HOST_PORT}."
    echo "Check container logs: docker logs $CONTAINER_NAME"
    exit 1
  fi
  sleep 2
done

# Extra readiness check inside container for SQL availability.
tries=0
until docker exec "$CONTAINER_NAME" mariadb-admin ping -h 127.0.0.1 -u"$DB_USER" -p"$DB_PASSWORD" --silent >/dev/null 2>&1; do
  tries=$((tries + 1))
  if [[ $tries -ge 60 ]]; then
    echo "Error: Timed out waiting for MariaDB internal readiness."
    echo "Check container logs: docker logs $CONTAINER_NAME"
    exit 1
  fi
  sleep 2
done

echo "Database is ready."

echo "[7/7] Prisma sync + client generate + cache clear"
npx prisma db push
npx prisma generate
rm -rf .next

echo ""
echo "Hard reset complete."
echo "Container: $CONTAINER_NAME"
echo "Volume: $VOLUME_NAME"
echo "DATABASE_URL: $DB_URL"
