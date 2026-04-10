#!/usr/bin/env bash
set -euo pipefail

APP_NAME="fkl-next"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js 20+ and re-run."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install npm and re-run."
  exit 1
fi

echo "Creating Next.js 15 app: ${APP_NAME}"
npx create-next-app@latest "${APP_NAME}" \
  --ts \
  --tailwind \
  --app \
  --turbopack \
  --eslint \
  --use-npm \
  --src-dir \
  --import-alias "@/*"

cd "${APP_NAME}"

npm pkg set scripts.dev="next dev --turbopack -p 3001"
npm pkg set scripts.start="next start -p 3001"

npm install prisma @prisma/client lucide-react zod next-intl

cat > docker-compose.yml <<'YAML'
services:
  mariadb:
    image: mariadb:11.4
    container_name: fkl_mariadb
    restart: unless-stopped
    ports:
      - "3308:3306"
    environment:
      MARIADB_ROOT_PASSWORD: root
      MARIADB_DATABASE: fkl_local
      MARIADB_USER: fkl
      MARIADB_PASSWORD: fkl_password
    volumes:
      - mariadb_data:/var/lib/mysql

volumes:
  mariadb_data:
YAML

cat > .env <<'ENV'
DATABASE_URL="mysql://fkl:fkl_password@localhost:3308/fkl_local"
ENV

echo "Bootstrap complete."
echo "Next steps:"
echo "  cd ${APP_NAME}"
echo "  docker compose up -d"
echo "  npx prisma init"
echo "  npm run dev"
