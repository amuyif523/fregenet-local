#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_DIR}"

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  if ! command -v docker >/dev/null 2>&1; then
    sudo apt-get install -y docker.io
  fi
  if ! docker compose version >/dev/null 2>&1; then
    sudo apt-get install -y docker-compose-plugin
  fi
elif command -v dnf >/dev/null 2>&1; then
  if ! command -v docker >/dev/null 2>&1; then
    sudo dnf install -y docker
  fi
  if ! docker compose version >/dev/null 2>&1; then
    sudo dnf install -y docker-compose-plugin
  fi
else
  echo "Unsupported package manager. Install Docker Engine + Docker Compose plugin manually."
  exit 1
fi

sudo systemctl enable --now docker
sudo usermod -aG docker "${USER}" || true

if [[ ! -f .env.production ]]; then
  cp .env.example .env.production
fi

read -r -s -p "Enter admin password for production hash: " ADMIN_PASSWORD
printf "\n"
ADMIN_PASSWORD_HASH="$(npm run --silent generate:admin-password-hash -- "${ADMIN_PASSWORD}")"
ADMIN_SESSION_SECRET="$(npm run --silent generate:session-secret)"
CRON_SECRET="$(npm run --silent generate:session-secret)"
DONATION_STATUS_TOKEN_SECRET="$(npm run --silent generate:session-secret)"
unset ADMIN_PASSWORD

read -r -p "MariaDB database name [fkl_prod]: " MARIADB_DATABASE
MARIADB_DATABASE="${MARIADB_DATABASE:-fkl_prod}"
read -r -p "MariaDB username [fkl]: " MARIADB_USER
MARIADB_USER="${MARIADB_USER:-fkl}"
read -r -s -p "MariaDB user password: " MARIADB_PASSWORD
printf "\n"
read -r -s -p "MariaDB root password: " MARIADB_ROOT_PASSWORD
printf "\n"

cat > .env.production <<EOF
NODE_ENV=production
MARIADB_DATABASE=${MARIADB_DATABASE}
MARIADB_USER=${MARIADB_USER}
MARIADB_PASSWORD=${MARIADB_PASSWORD}
MARIADB_ROOT_PASSWORD=${MARIADB_ROOT_PASSWORD}
DATABASE_URL=mysql://${MARIADB_USER}:${MARIADB_PASSWORD}@fregenet-db:3306/${MARIADB_DATABASE}
ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}
ADMIN_SESSION_SECRET=${ADMIN_SESSION_SECRET}
DONATION_STATUS_TOKEN_SECRET=${DONATION_STATUS_TOKEN_SECRET}
CRON_SECRET=${CRON_SECRET}
STORAGE_DRIVER=local
STORAGE_LOCAL_ROOT=/app/public/uploads
STORAGE_PUBLIC_BASE_URL=/uploads
CHAPA_SECRET_KEY=
CHAPA_INIT_URL=https://api.chapa.co/v1/transaction/initialize
CHAPA_VERIFY_URL=https://api.chapa.co/v1/transaction/verify/
CHAPA_CALLBACK_URL=https://your-domain.example/api/webhooks/chapa
CHAPA_RETURN_URL=https://your-domain.example/{locale}/donate/success
CHAPA_WEBHOOK_SECRET=
APP_BASE_URL=https://your-domain.example
EOF

mkdir -p data/uploads

sudo docker compose -f docker-compose.prod.yml --env-file .env.production build
sudo docker compose -f docker-compose.prod.yml --env-file .env.production up -d fregenet-db
sudo docker compose -f docker-compose.prod.yml --env-file .env.production run --rm fregenet-app npx prisma migrate deploy
sudo docker compose -f docker-compose.prod.yml --env-file .env.production up -d fregenet-app

if command -v crontab >/dev/null 2>&1; then
  CRON_CMD="*/30 * * * * cd ${PROJECT_DIR} && export \\$(grep -E '^(CRON_SECRET|APP_BASE_URL)=' .env.production | xargs) && ./scripts/cron-sync.sh >> ${PROJECT_DIR}/cron-sync.log 2>&1"
  (crontab -l 2>/dev/null | grep -v "scripts/cron-sync.sh"; echo "${CRON_CMD}") | crontab -
fi

echo "Production setup complete."
echo "If docker group membership is new, log out and back in before running docker without sudo."
