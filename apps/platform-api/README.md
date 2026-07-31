# Platform API

Local-first Node.js, Express, TypeScript, Prisma and PostgreSQL API for the PTC Bale Inspection & Monitoring PoC.

## Implemented vertical slice

- fixed viewer, supervisor and administrator users;
- server-side opaque sessions through an HttpOnly cookie;
- dashboard summary, cameras and health endpoints;
- paginated, filtered and sorted inspection events;
- event detail;
- versioned supervisor review and remarks;
- relational audit records;
- filtered CSV export;
- deterministic persistent synthetic seed data;
- health and readiness endpoints;
- Jest/Supertest integration tests against PostgreSQL.

The first slice intentionally does not include live cameras, Python edge ingestion, real evidence files, Azure synchronization or Entra ID.

## Local development

From the repository root:

```bash
cp infrastructure/local/.env.example infrastructure/local/.env
# Replace the PostgreSQL and fixed-user password placeholders.
pnpm stack:up
```

Portal: `http://localhost:8080`

API readiness through the portal proxy: `http://localhost:8080/api/readyz`

The compose stack starts PostgreSQL, applies committed Prisma migrations, loads the deterministic synthetic dataset, starts the API, and then starts the dashboard.

## Direct package commands

```bash
pnpm install
pnpm --filter @ptc-bale/platform-api db:generate
pnpm --filter @ptc-bale/platform-api db:migrate:deploy
pnpm --filter @ptc-bale/platform-api build
pnpm --filter @ptc-bale/platform-api test
pnpm --filter @ptc-bale/platform-api seed:reset
pnpm --filter @ptc-bale/platform-api dev
```

Set `DATABASE_URL` and the seed password variables before running migrations, tests or seed commands.

## API routes

Application routes are exposed under `/api`:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/dashboard/summary`
- `GET /api/cameras`
- `GET /api/health`
- `GET /api/events`
- `GET /api/events/:eventId`
- `PATCH /api/events/:eventId/review`
- `POST /api/exports/events`

Operational routes:

- `GET /healthz`
- `GET /readyz`

## Persistence and migration rules

- PostgreSQL runs locally on the supplied workstation and has no database licence fee.
- Prisma schema and SQL migrations are committed under `prisma/`.
- Production startup uses `prisma migrate deploy`; it must never use destructive development reset commands.
- Review updates use a relational transaction and optimistic version check.
- Flexible AI metadata can be added through explicit relational columns or PostgreSQL `JSONB` fields under controlled migrations.
- Local backups use PostgreSQL-native `pg_dump`/`pg_restore` procedures documented in the runbook.

## Security boundaries

- Database and seed passwords are never committed.
- The browser receives no PostgreSQL credentials, camera credentials, RTSP URLs or unrestricted evidence paths.
- Viewer access is read-only.
- Review mutations require supervisor or administrator access.
- Session tokens are random, stored as SHA-256 hashes in PostgreSQL and sent through an HttpOnly cookie.
- Production deployments must use HTTPS and `COOKIE_SECURE=true`.
- This seeded backend is for PoC workflow validation and is not PTC acceptance evidence.
