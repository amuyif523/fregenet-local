#!/usr/bin/env bash
set -euo pipefail

APP_BASE_URL="${APP_BASE_URL:-https://your-domain.example}"

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET is required"
  exit 1
fi

curl --fail --silent --show-error \
  -X POST "${APP_BASE_URL}/api/admin/donations/sync" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "content-type: application/json"
