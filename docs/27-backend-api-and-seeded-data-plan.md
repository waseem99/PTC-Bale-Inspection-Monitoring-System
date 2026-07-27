# Backend API and Persistent Seeded PostgreSQL Data

## Implementation status

The first backend vertical slice is implemented on branch `feature/68-platform-api` and PR #69.

Implemented:

- Node.js, Express and strict TypeScript package;
- PostgreSQL relational schema through Prisma;
- committed initial SQL migration and migration lock;
- deterministic seed/reset/status tooling;
- three fixed PoC users with server-side opaque sessions;
- dashboard summary, cameras and health APIs;
- paginated, filtered, sorted and searchable events;
- event detail;
- supervisor/admin review status and remarks;
- immutable automated outcome fields;
- transactional optimistic concurrency and `409 VERSION_CONFLICT`;
- relational audit records;
- filtered CSV export;
- safe evidence metadata without real files;
- OpenAPI 3.1 contract;
- Jest/Supertest/PostgreSQL integration tests;
- production API container;
- same-origin dashboard/API/PostgreSQL Docker Compose stack;
- browser tests that can run against either the frontend mock provider or the real seeded API;
- GitHub-hosted and self-hosted CI definitions.

Objective test evidence is still required before PR #69 is marked ready. The repository's GitHub-hosted runner currently fails before executing any workflow step, so the self-hosted validation path is available in `.github/workflows/backend-ci-self-hosted.yml`.

## Database decision

The project now uses a local PostgreSQL database rather than MongoDB.

Reasons:

- the core records are structured and relational;
- events belong to cameras;
- evidence belongs to events;
- sessions belong to users;
- review changes require atomic update and audit creation;
- reporting, filtering and export benefit from SQL and compound indexes;
- PostgreSQL runs locally on the supplied workstation without a database licence fee;
- the same schema can later move to an approved managed PostgreSQL service without changing the portal contract;
- flexible model/configuration payloads can use explicit `JSONB` columns when a genuine need is approved.

```text
Production React frontend
        ↓ HTTPS / same-origin API
Node.js + Express + TypeScript API
        ↓
Local PostgreSQL + Prisma
        ↓
Deterministic synthetic PoC dataset
```

The frontend runs in `VITE_DATA_MODE=live` against the local API. Later, synthetic events can be replaced incrementally by Python edge/AI ingestion without rewriting the portal or its workflow APIs.

## Implemented first-slice capabilities

- authentication and current session;
- dashboard summary;
- four-camera list and status;
- system-health records;
- paginated, filtered and sorted events;
- event detail;
- supervisor review status and remarks;
- optimistic concurrency;
- filtered CSV export;
- safe evidence metadata and unavailable/pending states.

## Fixed technical decisions

### Application

- Node.js LTS;
- Express;
- TypeScript with strict compiler settings;
- Prisma ORM;
- Zod validation at API boundaries;
- Jest and Supertest;
- structured JSON logging;
- frontend-compatible REST routes under `/api`.

### Persistence

- PostgreSQL Community container for local development and the local PoC;
- Docker Compose for repeatable local startup;
- Prisma schema and reviewed SQL migrations in source control;
- no Azure database dependency for local use;
- UTC timestamps;
- stable event IDs;
- explicit event versions;
- foreign keys and cascade/restrict rules;
- database check constraints;
- compound indexes supporting the dashboard's filters;
- `JSONB` reserved for approved flexible AI/configuration payloads rather than replacing structured columns.

### Authentication

The first backend uses fixed PoC users stored as seeded PostgreSQL records. It does not add a user-management module.

- roles: `viewer`, `supervisor`, and `admin`;
- passwords hashed server-side with scrypt;
- server-side session records;
- random opaque session token stored as a SHA-256 hash;
- HttpOnly, SameSite=Strict session cookie;
- Secure cookie required outside local HTTP development;
- origin validation for state-changing requests;
- viewer access is read-only;
- supervisor/admin may review events;
- Entra ID remains a future authentication adapter.

### Data-source progression

1. **Seeded PostgreSQL data** — implemented for workflow and API validation.
2. **Python edge event ingestion** — next integration, replacing synthetic event generation.
3. **Real evidence gateway** — replaces evidence placeholders.
4. **Optional Azure synchronization** — added only after local operation is stable and approved.

## Repository modules

```text
apps/platform-api/
  prisma/
    schema.prisma
    migrations/
  src/
    app.ts
    server.ts
    config.ts
    db.ts
    domain.ts
    errors.ts
    security.ts
    seed-data.ts
    seed-service.ts
    seed.ts
    test/
  package.json
  Dockerfile

infrastructure/local/
  docker-compose.api.yml
  .env.example

packages/contracts/
  openapi/platform-api.yaml
```

The obsolete `models.ts`, Mongoose dependency, MongoDB test server and MongoDB container configuration have been removed.

## Relational tables

### `users`

- internal user ID;
- unique username;
- display name;
- role;
- password hash;
- enabled state;
- dataset marker and timestamps.

### `sessions`

- hashed session token;
- user foreign key;
- expiry;
- created/last-seen timestamps;
- optional revoked timestamp;
- indexes for expiry and active-session checks.

### `cameras`

- stable camera ID;
- name and zone;
- connection status;
- AI status;
- last-frame timestamp;
- FPS and quality;
- event count;
- configuration version.

### `inspection_events`

- stable event ID;
- camera foreign key and denormalized display fields required by the portal contract;
- UTC timestamp;
- immutable AI outcome, reason and confidence;
- review status and remarks;
- reviewer and review timestamp;
- model/rule versions;
- optimistic-concurrency version;
- evidence availability;
- schema and dataset versions.

### `event_steps`

- event foreign key;
- explicit sequence number;
- label, state and optional observed time;
- unique event/sequence constraint.

### `health_metrics`

- component ID;
- label, value and detail;
- health state;
- checked timestamp;
- source and dataset fields.

### `evidence_metadata`

- one-to-one event foreign key;
- pending/unavailable/available state;
- type and safe metadata;
- protected storage key only when real evidence is introduced;
- no unrestricted filesystem path, real file or camera URL.

### `audit_logs`

- UUID action ID;
- actor and role;
- action and target;
- safe before/after JSON summaries;
- correlation ID;
- UTC timestamp.

## Deterministic seed dataset

The seed creates:

- users `viewer`, `supervisor` and `admin`;
- Camera 01 — Bale Entry;
- Camera 02 — Inspection Bay A;
- Camera 03 — Inspection Bay B;
- Camera 04 — Bale Exit;
- six health metrics;
- 257 stable inspection events;
- completed, missed, incomplete and unresolved outcomes;
- reviewed and unreviewed events;
- evidence pending and unavailable states;
- records across July 23–24, 2026 for date-filter testing.

Passwords are supplied through environment configuration and are not committed.

The normal seed command is idempotent and preserves existing review fields. The reset command removes only the marked local synthetic dataset and recreates it predictably. Synthetic reset is blocked when `NODE_ENV=production`.

## API endpoints

```text
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
GET    /api/dashboard/summary
GET    /api/cameras
GET    /api/health
GET    /api/events
GET    /api/events/:eventId
PATCH  /api/events/:eventId/review
POST   /api/exports/events
GET    /healthz
GET    /readyz
```

The edge-ingestion API remains a separate service-authenticated boundary under issue #37.

## Local execution

```bash
cp infrastructure/local/.env.example infrastructure/local/.env
# Replace PostgreSQL and fixed-user passwords and confirm allowed origins.
pnpm stack:up
```

Startup order:

1. PostgreSQL becomes healthy.
2. `prisma migrate deploy` applies committed migrations.
3. The deterministic seed command runs.
4. The API starts and passes readiness.
5. The dashboard starts with the same-origin API proxy.

See `docs/28-backend-validation-and-local-runbook.md` for backup, restore, reset, CI and UAT procedures.

## Definition of first slice complete

Implementation is present. Final completion requires objective evidence that:

- PostgreSQL, migrations and the API start through the documented command;
- seed/reset tooling produces 3 users, 4 cameras, 6 health metrics and 257 events;
- minimum endpoints work against persisted records;
- the existing frontend runs in live mode without screen rewrites;
- review changes survive restarts;
- stale versions return `409 VERSION_CONFLICT`;
- roles are enforced server-side;
- CSV matches selected records;
- API and real-API browser tests pass;
- `pg_dump` and `pg_restore` are demonstrated on the local stack;
- no Azure, camera, AI, client footage or production-data dependency exists.

## Scheduled follow-on work

- Python edge service authentication and event ingestion;
- idempotent durable-spool acknowledgements;
- Socket.IO event and health updates;
- real evidence file storage and streaming;
- retention cleanup;
- optional Azure Database for PostgreSQL/Blob synchronization;
- Entra ID;
- infrastructure monitoring and final GPU-workstation packaging.
