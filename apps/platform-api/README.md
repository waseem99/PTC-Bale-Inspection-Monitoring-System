# Platform API

Local-first Node.js, Express, TypeScript and MongoDB API for the PTC Bale Inspection & Monitoring PoC.

## Implemented vertical slice

- fixed viewer, supervisor and administrator users;
- server-side opaque sessions through an HttpOnly cookie;
- dashboard summary, cameras and health endpoints;
- paginated, filtered and sorted inspection events;
- event detail;
- versioned supervisor review and remarks;
- audit records;
- filtered CSV export;
- deterministic persistent synthetic seed data;
- health and readiness endpoints;
- Jest/Supertest integration tests.

The first slice intentionally does not include live cameras, Python edge ingestion, real evidence files, Azure synchronization or Entra ID.

## Local development

From the repository root:

```bash
cp infrastructure/local/.env.example infrastructure/local/.env
# Replace every placeholder password.
docker compose --env-file infrastructure/local/.env -f infrastructure/local/docker-compose.api.yml up --build
```

Portal: `http://localhost:8080`

API readiness through the portal proxy: `http://localhost:8080/api/readyz`

## Direct package commands

```bash
pnpm install
pnpm --filter @ptc-bale/platform-api build
pnpm --filter @ptc-bale/platform-api test
pnpm --filter @ptc-bale/platform-api seed:reset
pnpm --filter @ptc-bale/platform-api dev
```

Set `MONGODB_URI` and the seed password variables before running seed commands.

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

## Security boundaries

- Seed passwords are never committed.
- The browser receives no MongoDB credentials, camera credentials, RTSP URLs or unrestricted evidence paths.
- Viewer access is read-only.
- Review mutations require supervisor or administrator access.
- Session tokens are random, stored as hashes in MongoDB and sent through an HttpOnly cookie.
- Production deployments must use HTTPS and `COOKIE_SECURE=true`.
- This seeded backend is for PoC workflow validation and is not PTC acceptance evidence.
