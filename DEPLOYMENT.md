# Deployment Runbook (HahuCloud)

This document describes production deployment for Fregenet Local on a HahuCloud VPS.

## 1. Provisioning Checklist

- Ubuntu or Fedora VPS with sudo access
- DNS A record pointing domain to VPS
- Ports open: `80`, `443`
- Git + Node.js installed (Node 20+ recommended)

## 2. Clone and Bootstrap

```bash
git clone <your-repo-url> fregenet-local
cd fregenet-local
bash deploy/setup-prod.sh
```

The setup script will:

- Install Docker and Docker Compose plugin if missing
- Generate secure hashes/secrets
- Create `.env.production`
- Build containers
- Start database and app
- Run `npx prisma migrate deploy`
- Register a 30-minute reconciliation cron job

## 3. Docker Volumes on HahuCloud

Upload durability uses bind mount from host into app container.

From `docker-compose.prod.yml`:

- Host: `./data/uploads`
- Container: `${STORAGE_LOCAL_ROOT:-/app/public/uploads}`

Recommended host prep:

```bash
mkdir -p data/uploads
```

This keeps uploads persistent across restarts and image updates.

## 4. Networking and Exposure

- `fregenet-db` is private-only on internal docker network.
- MariaDB port is NOT exposed publicly.
- Only `fregenet-app` publishes `3001`.
- Nginx terminates SSL and proxies public traffic to `127.0.0.1:3001`.

## 5. SSL and Nginx

Use config:

- `deploy/nginx/fregenet.conf`

Example steps:

```bash
sudo cp deploy/nginx/fregenet.conf /etc/nginx/sites-available/fregenet.conf
sudo ln -s /etc/nginx/sites-available/fregenet.conf /etc/nginx/sites-enabled/fregenet.conf
sudo nginx -t
sudo systemctl reload nginx
```

Obtain cert:

```bash
sudo certbot --nginx -d your-domain.example
```

## 6. Manual Reconciliation Operations

### UI

- Navigate to `/{locale}/admin/donations`
- Click `Sync Pending Payments`

### API (with cron secret)

```bash
export CRON_SECRET="..."
curl -X POST "https://your-domain.example/api/admin/donations/sync" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "content-type: application/json"
```

The response provides a detailed report:

- `scanned`
- `verified`
- `completed`
- `failedVerification`
- `amountMismatch`
- `statusMismatch`
- `alreadyResolved`

## 7. Operator Commands

### Generate admin hash

```bash
npm run generate:admin-password-hash -- "your-strong-password"
```

### Generate secret

```bash
npm run generate:session-secret
```

### Deploy updates

```bash
git pull
sudo docker compose -f docker-compose.prod.yml --env-file .env.production build
sudo docker compose -f docker-compose.prod.yml --env-file .env.production up -d
sudo docker compose -f docker-compose.prod.yml --env-file .env.production run --rm fregenet-app npx prisma migrate deploy
```

### View logs

```bash
sudo docker compose -f docker-compose.prod.yml --env-file .env.production logs -f fregenet-app
sudo docker compose -f docker-compose.prod.yml --env-file .env.production logs -f fregenet-db
```

## 8. Environment Variables (Production)

At minimum set these values in `.env.production`:

- `NODE_ENV=production`
- `DATABASE_URL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `DONATION_STATUS_TOKEN_SECRET`
- `CRON_SECRET`
- `CHAPA_SECRET_KEY`
- `CHAPA_WEBHOOK_SECRET`
- `CHAPA_CALLBACK_URL`
- `CHAPA_RETURN_URL`
- `STORAGE_PROVIDER` (`LOCAL_FS` now, `S3_STORAGE` for future provider migration)
- `STORAGE_LOCAL_ROOT` (`/app/public/uploads` for Docker mapping)

## 9. S3 Provider Migration Path

The storage abstraction now supports a provider switch via environment:

- `STORAGE_PROVIDER=LOCAL_FS` (current)
- `STORAGE_PROVIDER=S3_STORAGE` (placeholder path ready)

When S3 implementation is added, set:

- `S3_STORAGE_ENDPOINT`
- `S3_STORAGE_BUCKET`
- `S3_STORAGE_REGION`
- `S3_STORAGE_ACCESS_KEY_ID`
- `S3_STORAGE_SECRET_ACCESS_KEY`

No application code changes required for provider selection once uploader implementation is completed.

## 10. cPanel Standalone Deployment (Yegara Shared Hosting)

For shared hosting Node.js apps, use Next.js standalone output so the runtime needs only one packaged folder.

### Build output location

After running:

```bash
npm install
npm run build
```

Next.js generates:

- `.next/standalone/` (minimal server + traced dependencies)
- `.next/static/` (built static assets)

The standalone server expects `public/` and `.next/static/` to be available under the standalone root.

### Make standalone self-contained

Run:

```bash
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
```

At that point, `.next/standalone/` is a self-contained package.

### cPanel entry point

This repository includes a root `server.js` that forwards to `.next/standalone/server.js` and maps `NODEJS_PORT` to `PORT` for cPanel.

In cPanel Node.js Selector, set:

- Application startup file: `server.js`
- Application root: project root (where `server.js` exists)

Then restart the Node.js app from cPanel.
