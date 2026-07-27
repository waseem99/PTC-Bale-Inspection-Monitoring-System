# Backend API and Persistent Seeded Data

## Implementation status

The first backend vertical slice is implemented on branch `feature/68-platform-api` and PR #69.

Implemented:

- Node.js, Express and strict TypeScript package;
- Mongoose schemas and indexes;
- deterministic seed/reset/status tooling;
- three fixed PoC users with server-side opaque sessions;
- dashboard summary, cameras and health APIs;
- paginated, filtered, sorted and searchable events;
- event detail;
- supervisor/admin review status and remarks;
- immutable automated outcome fields;
- optimistic concurrency and `409 VERSION_CONFLICT`;
- audit records;
- filtered CSV export;
- safe evidence metadata without real files;
- OpenAPI 3.1 contract;
- Jest/Supertest/MongoDB integration tests;
- production API container;
- same-origin dashboard/API/MongoDB Docker Compose stack;
- browser tests that can run against either the frontend mock provider or the real seeded API;
- GitHub-hosted and self-hosted CI definitions.

Objective test evidence is still required before PR #69 is marked ready. The repository's GitHub-hosted runner currently fails before executing any workflow step, so the self-hosted validation path is available in `.github/workflows/backend-ci-self-hosted.yml`.

## Decision

The project uses the real local backend API with a deterministic synthetic MongoDB dataset rather than a second disconnected dummy-data implementation.

```text
Production React frontend
        ↓ HTTPS / same-origin API
Node.js + Express + TypeScript API
        ↓
Local MongoDB-compatible database
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
- Mongoose;
- Zod validation at API boundaries;
- Jest and Supertest;
- structured JSON logging;
- frontend-compatible REST routes under `/api`.

### Persistence

- MongoDB Community for local development and the local PoC;
- Docker Compose for repeatable local startup;
- no Azure database dependency for local use;
- UTC dates;
- stable event IDs;
- explicit event versions;
- compound indexes supporting the dashboard's filters.

### Authentication

The first backend uses fixed PoC users stored as seeded records. It does not add a user-management module.

- roles: `viewer`, `supervisor`, and `admin`;
- passwords hashed server-side with scrypt;
- server-side session records;
- random opaque session token stored as a hash;
- HttpOnly, SameSite=Strict session cookie;
- Secure cookie required outside local HTTP development;
- origin validation for state-changing requests;
- viewer access is read-only;
- supervisor/admin may review events;
- Entra ID remains a future authentication adapter.

### Data-source progression

1. **Seeded backend data** — implemented for workflow and API validation.
2. **Python edge event ingestion** — next integration, replacing synthetic event generation.
3. **Real evidence gateway** — replaces evidence placeholders.
4. **Optional Azure synchronization** — added only after local operation is stable and approved.

## Repository modules

```text
apps/platform-api/
  src/
    app.ts
    server.ts
    config.ts
    errors.ts
    models.ts
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

## Collections

### `users`

- internal user ID;
- username;
- display name;
- role;
- password hash;
- enabled state;
- dataset marker and timestamps.

### `sessions`

- hashed session token;
- user ID;
- expiry and TTL index;
- created/last-seen timestamps;
- optional revoked timestamp.

### `cameras`

- stable camera ID;
- name and zone;
- connection status;
- AI status;
- last-frame timestamp;
- FPS and quality;
- event count;
- configuration version.

### `inspectionEvents`

- stable event ID;
- camera and zone;
- UTC timestamp;
- immutable AI outcome, reason and confidence;
- review status and remarks;
- reviewer and review timestamp;
- model/rule versions;
- optimistic-concurrency version;
- observed workflow steps;
- evidence availability;
- schema and dataset versions.

### `healthMetrics`

- component ID;
- label, value and detail;
- health state;
- checked timestamp;
- source and dataset fields.

### `evidenceMetadata`

- event ID;
- pending/unavailable state;
- type and safe metadata;
- no unrestricted filesystem path, real file or camera URL.

### `auditLogs`

- action ID;
- actor and role;
- action and target;
- safe before/after review summary;
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

The normal seed command is idempotent and preserves existing review fields. The reset command removes the local synthetic dataset and recreates it predictably.

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
# Replace passwords and confirm allowed origins.
pnpm stack:up
```

See `docs/28-backend-validation-and-local-runbook.md` for reset, CI and UAT procedures.

## Definition of first slice complete

Implementation is present. Final completion requires objective evidence that:

- MongoDB and the API start through the documented command;
- seed/reset tooling produces 3 users, 4 cameras, 6 health metrics and 257 events;
- minimum endpoints work against persisted records;
- the existing frontend runs in live mode without screen rewrites;
- review changes survive restarts;
- stale versions return `409 VERSION_CONFLICT`;
- roles are enforced server-side;
- CSV matches selected records;
- API and real-API browser tests pass;
- no Azure, camera, AI, client footage or production-data dependency exists.

## Scheduled follow-on work

- Python edge service authentication and event ingestion;
- idempotent durable-spool acknowledgements;
- Socket.IO event and health updates;
- real evidence file storage and streaming;
- retention cleanup;
- Azure Blob/Cosmos synchronization;
- Entra ID;
- infrastructure monitoring and final GPU-workstation packaging.