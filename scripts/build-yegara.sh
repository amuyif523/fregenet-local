#!/usr/bin/env bash
set -euo pipefail

# Build a cPanel-ready deployment archive for Yegara.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_PATH="$PROJECT_ROOT/yegara-deploy.zip"

cd "$PROJECT_ROOT"

echo "[1/10] Pre-flight checks"
for cmd in npm npx zip unzip; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' was not found in PATH."
    exit 1
  fi
done

if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
  echo "Error: .env is required for yegara-deploy.zip but was not found at project root."
  exit 1
fi

echo "[2/10] Validating secrets via scripts/check-env.sh"
/bin/bash "$PROJECT_ROOT/scripts/check-env.sh"

echo "[3/10] Generating Prisma client (npx prisma generate)"
npx prisma generate

echo "[4/10] Running Next.js production build (next build)"
npx next build

echo "[5/10] Verifying build output directories"
if [[ ! -d "$PROJECT_ROOT/.next/standalone" ]]; then
  echo "Error: .next/standalone was not generated."
  exit 1
fi

if [[ ! -d "$PROJECT_ROOT/.next/static" ]]; then
  echo "Error: .next/static was not generated."
  exit 1
fi

echo "[6/10] Copying public -> .next/standalone/public"
if [[ -d "$PROJECT_ROOT/public" ]]; then
  rm -rf "$PROJECT_ROOT/.next/standalone/public"
  cp -a "$PROJECT_ROOT/public" "$PROJECT_ROOT/.next/standalone/public"
else
  echo "Warning: public directory not found; creating empty .next/standalone/public"
  mkdir -p "$PROJECT_ROOT/.next/standalone/public"
fi

echo "[7/10] Copying .next/static -> .next/standalone/.next/static"
mkdir -p "$PROJECT_ROOT/.next/standalone/.next"
rm -rf "$PROJECT_ROOT/.next/standalone/.next/static"
cp -a "$PROJECT_ROOT/.next/static" "$PROJECT_ROOT/.next/standalone/.next/static"

echo "[8/10] Creating yegara-deploy.zip"
rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" \
  ".next/standalone" \
  "server.js" \
  ".env" >/dev/null

echo "[9/10] Validating ZIP structure"
ZIP_LISTING="$(unzip -l "$ZIP_PATH")"

echo "$ZIP_LISTING" | grep -Eq '[[:space:]]\.next/standalone/server\.js$' || {
  echo "Error: .next/standalone/server.js is missing in yegara-deploy.zip"
  exit 1
}

echo "$ZIP_LISTING" | grep -Eq '[[:space:]]\.next/standalone/public/$|[[:space:]]\.next/standalone/public/' || {
  echo "Error: .next/standalone/public is missing in yegara-deploy.zip"
  exit 1
}

echo "$ZIP_LISTING" | grep -Eq '[[:space:]]\.next/standalone/\.next/static/$|[[:space:]]\.next/standalone/\.next/static/' || {
  echo "Error: .next/standalone/.next/static is missing in yegara-deploy.zip"
  exit 1
}

echo "$ZIP_LISTING" | grep -Eq '[[:space:]]server\.js$' || {
  echo "Error: root server.js is missing in yegara-deploy.zip"
  exit 1
}

echo "$ZIP_LISTING" | grep -Eq '[[:space:]]\.env$' || {
  echo "Error: root .env is missing in yegara-deploy.zip"
  exit 1
}

echo "ZIP validation passed."

echo "[10/10] Build package complete"
echo "Created: $ZIP_PATH"
