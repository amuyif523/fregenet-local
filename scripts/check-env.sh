#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-}"

if [[ -z "$ENV_FILE" ]]; then
  if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
    ENV_FILE="$PROJECT_ROOT/.env.production"
  elif [[ -f "$PROJECT_ROOT/.env" ]]; then
    ENV_FILE="$PROJECT_ROOT/.env"
  else
    echo "Error: no .env file found (.env.production or .env)."
    exit 1
  fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

missing=()
required_vars=(
  DATABASE_URL
  INITIAL_ADMIN_PASSWORD
  CHAPA_SECRET_KEY
  ADMIN_SESSION_SECRET
  DONATION_STATUS_TOKEN_SECRET
  CRON_SECRET
)

for var_name in "${required_vars[@]}"; do
  value="${!var_name:-}"
  if [[ -z "$value" ]]; then
    missing+=("$var_name")
    continue
  fi

  trimmed="$(echo "$value" | xargs)"
  if [[ -z "$trimmed" || "${trimmed^^}" == *"PLACEHOLDER"* ]]; then
    missing+=("$var_name")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "Error: missing required environment variables in $ENV_FILE:"
  for key in "${missing[@]}"; do
    echo "  - $key"
  done
  exit 1
fi

echo "Environment validation passed: $ENV_FILE"
