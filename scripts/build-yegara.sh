#!/usr/bin/env bash
set -euo pipefail

# Build a Yegara-ready standalone archive for constrained shared hosting.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_PATH="$PROJECT_ROOT/deploy-fregenet.zip"

cd "$PROJECT_ROOT"

echo "[1/9] Pre-flight checks"
for cmd in npm npx zip; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' was not found in PATH."
    exit 1
  fi
done

if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
  echo "Error: .env is required but was not found at project root."
  exit 1
fi

echo "[2/9] Installing dependencies (npm install)"
npm install

echo "[3/9] Generating Prisma client (npx prisma generate)"
npx prisma generate

echo "[4/9] Running Next.js production build (npm run build)"
npm run build

echo "[5/9] Verifying build output directories"
if [[ ! -d "$PROJECT_ROOT/.next/standalone" ]]; then
  echo "Error: .next/standalone was not generated."
  exit 1
fi

if [[ ! -d "$PROJECT_ROOT/.next/static" ]]; then
  echo "Error: .next/static was not generated."
  exit 1
fi

echo "[6/9] Preparing standalone deployment tree"
pushd "$PROJECT_ROOT/.next/standalone" >/dev/null

# Crucial: remove traced node_modules to avoid cPanel symlink issues.
rm -rf node_modules

# Keep runtime environment file in standalone root.
cp -a ../../.env ./.env

# Crucial: copy ../../public into ./public.
rm -rf ./public
if [[ -d ../../public ]]; then
  mkdir -p ./public
  cp -a ../../public/. ./public/
fi

# Crucial: copy ../../prisma/migrations into ./prisma/migrations.
rm -rf ./prisma/migrations
if [[ -d ../../prisma/migrations ]]; then
  mkdir -p ./prisma
  cp -a ../../prisma/migrations ./prisma/migrations
fi

# Crucial: copy ../static into ./.next/static.
mkdir -p .next
rm -rf .next/static
cp -a ../static/. .next/static/

echo "[7/9] Creating deploy-fregenet.zip"
rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" . >/dev/null

echo "[8/9] Validating ZIP structure"
ZIP_PATHS="$(unzip -Z1 "$ZIP_PATH")"

echo "$ZIP_PATHS" | grep -Eq '^server\.js$' || {
  echo "Error: server.js is missing in deploy-fregenet.zip"
  exit 1
}

echo "$ZIP_PATHS" | grep -Eq '^\.env$' || {
  echo "Error: .env is missing in deploy-fregenet.zip"
  exit 1
}

echo "$ZIP_PATHS" | grep -Eq '^public/$|^public/' || {
  echo "Error: public is missing in deploy-fregenet.zip"
  exit 1
}

echo "$ZIP_PATHS" | grep -Eq '^prisma/migrations/$|^prisma/migrations/' || {
  echo "Error: prisma/migrations is missing in deploy-fregenet.zip"
  exit 1
}

echo "$ZIP_PATHS" | grep -Eq '^\.next/static/$|^\.next/static/' || {
  echo "Error: .next/static is missing in deploy-fregenet.zip"
  exit 1
}

popd >/dev/null

echo "ZIP validation passed."

echo "[9/9] Build package complete"
echo "Created: $ZIP_PATH"
