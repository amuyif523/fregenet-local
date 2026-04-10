#!/usr/bin/env bash
set -euo pipefail

# FKL Local DB repair script for Fedora
# Recreates the MariaDB container to match .env and syncs Prisma schema.

CONTAINER_NAME="fregenet-local-db"
VOLUME_NAME="fregenet-local-db-data"
IMAGE="mariadb:11"
HOST_PORT="3308"
CONTAINER_PORT="3306"

# Parsed from .env DATABASE_URL:
# mysql://fkl:fkl_password@localhost:3308/fkl_local
DB_USER="fkl"
DB_PASSWORD="fkl_password"
DB_NAME="fkl_local"
DB_ROOT_PASSWORD="fkl_root_password"

echo "[1/6] Checking prerequisites..."
command -v docker >/dev/null 2>&1 || {
  echo "Error: docker is not installed or not in PATH."
  exit 1
}
command -v npx >/dev/null 2>&1 || {
  echo "Error: npx is not installed or not in PATH."
  exit 1
}

echo "[2/6] Stopping and removing existing container (if any): ${CONTAINER_NAME}"
if docker ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
  docker rm -f "$CONTAINER_NAME" >/dev/null
  echo "Removed existing container: $CONTAINER_NAME"
else
  echo "No existing container named $CONTAINER_NAME found."
fi

echo "[3/6] Ensuring persistent Docker volume exists: ${VOLUME_NAME}"
if ! docker volume ls --format '{{.Name}}' | grep -Fxq "$VOLUME_NAME"; then
  docker volume create "$VOLUME_NAME" >/dev/null
  echo "Created volume: $VOLUME_NAME"
else
  echo "Using existing volume: $VOLUME_NAME"
fi

echo "[4/6] Starting fresh MariaDB container on ${HOST_PORT}:${CONTAINER_PORT}"
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  -e MARIADB_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
  -e MARIADB_DATABASE="$DB_NAME" \
  -e MARIADB_USER="$DB_USER" \
  -e MARIADB_PASSWORD="$DB_PASSWORD" \
  -v "${VOLUME_NAME}:/var/lib/mysql" \
  --restart unless-stopped \
  "$IMAGE" >/dev/null

echo "[5/6] Waiting for MariaDB to be ready..."
READY=0
for i in $(seq 1 60); do
  if docker exec "$CONTAINER_NAME" mariadb-admin ping -h 127.0.0.1 -u"$DB_USER" -p"$DB_PASSWORD" --silent >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 2
done

if [[ "$READY" -ne 1 ]]; then
  echo "Error: MariaDB did not become ready in time."
  echo "Check logs with: docker logs $CONTAINER_NAME"
  exit 1
fi

echo "Database is ready."

echo "[6/6] Pushing Prisma schema..."
npx prisma db push

echo ""
echo "Done: Database container repaired and Prisma schema synced."
echo ""
echo "Recommendation: In .env, prefer 127.0.0.1 instead of localhost for DATABASE_URL on Fedora/Node."
echo "Current: DATABASE_URL=\"mysql://${DB_USER}:${DB_PASSWORD}@localhost:${HOST_PORT}/${DB_NAME}\""
echo "Suggested: DATABASE_URL=\"mysql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${HOST_PORT}/${DB_NAME}\""
