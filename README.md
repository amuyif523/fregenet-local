# Fregenet Local

Fregenet Local is a Next.js 15 application for public impact pages, donations, and admin operations for FKL.

## Core Features

- Public pages with locale routing (`/en`, `/am`)
- Donation checkout and status tracking (Chapa)
- Admin dashboard for donations, projects, newsletters, governance, and messages
- Contact pipeline with database-backed message inbox
- Reconciliation engine for pending donations

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start MariaDB and app env:

```bash
docker compose up -d
cp .env.example .env
```

3. Sync schema:

```bash
npx prisma generate
npx prisma db push
```

4. Run app:

```bash
npm run dev
```

## Production Secrets and Hash Generation

Generate admin password hash:

```bash
npm run generate:admin-password-hash -- "your-strong-admin-password"
```

Generate high-entropy session/token secrets:

```bash
npm run generate:session-secret
```

Use generated values in `.env.production`:

- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `DONATION_STATUS_TOKEN_SECRET`
- `CRON_SECRET`

## Manual Reconciliation Sync

Admin UI:

- Open Donations page: `/{locale}/admin/donations`
- Click `Sync Pending Payments`

API manual trigger (admin session required, or CRON secret header):

```bash
curl -X POST "https://your-domain.example/api/admin/donations/sync" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "content-type: application/json"
```

Detailed reconciliation response includes:

- `scanned`
- `verified`
- `completed`
- `failedVerification`
- `amountMismatch`
- `statusMismatch`
- `alreadyResolved`

## Environment Variable Dictionary

### Database

- `DATABASE_URL`: Prisma MariaDB connection string.
- `MARIADB_DATABASE`: Container DB name (prod compose).
- `MARIADB_USER`: Container DB user.
- `MARIADB_PASSWORD`: Container DB user password.
- `MARIADB_ROOT_PASSWORD`: MariaDB root password.

### Admin/Auth

- `ADMIN_PASSWORD_HASH`: Bcrypt hash for admin login.
- `ADMIN_SESSION_SECRET`: Iron-session encryption secret (min 32 chars).
- `DONATION_STATUS_TOKEN_SECRET`: HMAC secret for donation status token checks.
- `CRON_SECRET`: Header secret for automated reconciliation route.

### Storage

- `STORAGE_PROVIDER`: `LOCAL_FS` or `S3_STORAGE`.
- `STORAGE_DRIVER`: Legacy compatibility (`local` or `s3`).
- `STORAGE_LOCAL_ROOT`: Local filesystem root for uploads.
- `STORAGE_PUBLIC_BASE_URL`: Public URL base for uploaded assets.
- `S3_STORAGE_ENDPOINT`: Placeholder for S3-compatible endpoint.
- `S3_STORAGE_BUCKET`: Placeholder for S3 bucket/container name.
- `S3_STORAGE_REGION`: Optional region.
- `S3_STORAGE_ACCESS_KEY_ID`: Optional access key.
- `S3_STORAGE_SECRET_ACCESS_KEY`: Optional secret key.

### Payments / Chapa

- `CHAPA_SECRET_KEY`: Chapa API secret.
- `CHAPA_INIT_URL`: Chapa initialize endpoint.
- `CHAPA_VERIFY_URL`: Chapa verify endpoint.
- `CHAPA_CALLBACK_URL`: Webhook callback URL.
- `CHAPA_RETURN_URL`: Redirect URL template (supports `{locale}`).
- `CHAPA_WEBHOOK_SECRET`: HMAC verification secret for webhook.

### Runtime

- `NODE_ENV`: `development` or `production`.
- `APP_BASE_URL`: Base URL used by cron/script tooling.

## Quality Gates

```bash
npm run lint
npm run build
```

Both should pass before deployment.
