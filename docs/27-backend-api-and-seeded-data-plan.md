# Backend API and Persistent Seeded Data Plan

## Decision

The next development step is not a second standalone dummy-data implementation. The correct path is to build the real local backend API and preload its MongoDB database with deterministic synthetic records.

This gives the project one realistic end-to-end system:

```text
Production React frontend
        ↓ HTTPS / same-origin API
Node.js + Express + TypeScript API
        ↓
Local MongoDB-compatible database
        ↓
Deterministic synthetic PoC dataset
```

The frontend will run in `VITE_DATA_MODE=live` against the local API. Later, synthetic events can be replaced incrementally by Python edge/AI ingestion without rewriting the portal or its workflow APIs.

## Immediate objective

Deliver one complete backend vertical slice that supports every production frontend workflow currently implemented:

- authentication and current session;
- dashboard summary;
- four-camera list and status;
- system-health records;
- paginated, filtered and sorted events;
- event detail;
- supervisor review status and remarks;
- optimistic concurrency;
- filtered CSV export;
- safe evidence metadata and unavailable states.

## Fixed technical decisions

### Application

- Node.js LTS;
- Express;
- TypeScript with strict compiler settings;
- Mongoose;
- Zod or shared JSON Schema validation at API boundaries;
- Jest and Supertest;
- structured JSON logging;
- one versioned REST API under `/api/v1` internally, with frontend-compatible routes exposed through the approved gateway/base URL.

### Persistence

- MongoDB Community for local development and the local PoC;
- Docker Compose for repeatable local startup;
- no Azure database dependency for local use;
- schema and indexes kept compatible with the approved MongoDB service in Azure where possible;
- all persisted timestamps stored as UTC dates;
- stable event IDs and explicit document versions.

### Authentication

The first backend uses fixed PoC users stored as seeded records. It does not add a user-management module.

- roles: `viewer`, `supervisor`, and `admin`;
- passwords hashed server-side;
- server-side session records;
- random opaque session token sent through an HttpOnly cookie;
- `Secure` enabled outside local HTTP development;
- `SameSite=Strict` for same-origin deployment;
- origin validation for state-changing requests;
- viewer access is read-only;
- supervisor/admin may review events;
- Entra ID remains a future authentication adapter.

### Data source progression

1. **Seeded backend data** — first implementation and client demo.
2. **Python edge event ingestion** — replaces synthetic event generation.
3. **Real evidence gateway** — replaces evidence placeholders.
4. **Optional Azure synchronization** — added only after local operation is stable and approved.

## Repository modules

```text
apps/platform-api/
  src/
    app.ts
    server.ts
    config/
    middleware/
    modules/
      auth/
      dashboard/
      cameras/
      health/
      events/
      reviews/
      exports/
      evidence/
      audit/
    database/
      models/
      indexes/
      migrations/
      seed/
    contracts/
    test/
  package.json
  Dockerfile

infrastructure/local/
  docker-compose.api.yml
  mongo/

packages/contracts/
  openapi/
  schemas/
```

## Initial collections

### `users`

- internal user ID;
- username;
- display name;
- role;
- password hash;
- enabled state;
- created/updated timestamps.

### `sessions`

- hashed session token;
- user ID;
- expiry;
- created/last-seen timestamps;
- optional revoked timestamp;
- TTL index on expiry.

### `cameras`

- stable camera ID;
- name and zone;
- connection status;
- AI status;
- last-frame timestamp;
- FPS and quality;
- today's event count;
- configuration/version fields.

### `inspectionEvents`

- stable event ID;
- camera and zone;
- UTC timestamp;
- immutable AI outcome, reason and confidence;
- review status and remarks;
- reviewer identity and review timestamp;
- model/rule/configuration versions;
- optimistic-concurrency version;
- observed workflow steps;
- evidence availability and metadata references;
- schema version.

### `healthMetrics`

- component ID;
- label/value/detail;
- healthy/warning/critical/neutral state;
- checked timestamp;
- source and version fields.

### `evidenceMetadata`

- event ID;
- evidence type;
- availability state;
- MIME type, size and checksum where available;
- protected storage key only when real evidence is introduced;
- no unrestricted filesystem path or camera URL.

### `auditLogs`

- action ID;
- actor and role;
- action type;
- target type and ID;
- safe before/after summary;
- correlation ID;
- UTC timestamp.

## Deterministic seed dataset

The seed/reset command must create a stable dataset suitable for browser UAT and API integration tests.

### Users

- `viewer`;
- `supervisor`;
- `admin`.

Passwords are supplied through environment configuration during seeding; no shared password is committed.

### Cameras

- Camera 01 — Bale Entry;
- Camera 02 — Inspection Bay A;
- Camera 03 — Inspection Bay B;
- Camera 04 — Bale Exit.

The seed includes healthy, degraded and recently recovered states.

### Events

Create at least 257 deterministic events containing:

- completed inspections;
- missed inspections;
- incomplete inspections;
- unresolved/insufficient-visibility outcomes;
- reviewed and unreviewed records;
- evidence available and unavailable states;
- varied camera, time, confidence and reason-code values;
- records spanning enough dates to exercise date filters;
- stable IDs so automated tests can reference known records.

The seed must be idempotent. Running `seed` repeatedly must not create duplicates. Running `reset` must remove only the approved local synthetic dataset and recreate it predictably.

## API delivery order

### Stage 1 — Platform foundation

- initialize package, TypeScript, lint, tests and configuration;
- create Express application and graceful startup/shutdown;
- connect MongoDB;
- add `/healthz` and `/readyz`;
- add request IDs, structured errors, limits, security headers and CORS/origin policy;
- provide Docker Compose startup.

### Stage 2 — Persistence and seed tooling

- implement schemas and indexes;
- implement migration/index setup;
- implement deterministic seed/reset/status commands;
- add database integration-test harness.

### Stage 3 — Authentication

- implement login, current-session and logout;
- implement viewer/supervisor/admin authorization;
- add session expiry and revocation;
- add login throttling and safe audit records.

### Stage 4 — Read APIs

- dashboard summary;
- cameras;
- system health;
- events list with page, page size, filters, sorting and search;
- event detail;
- safe evidence metadata.

### Stage 5 — Review and export

- versioned review mutation;
- immutable original AI outcome;
- remarks validation;
- audit record;
- filtered CSV export;
- cache-control and pagination headers where appropriate.

### Stage 6 — Frontend live-mode integration

- run the existing frontend against the API;
- preserve frontend routes and workflows unchanged;
- verify session restoration, role restrictions, cache invalidation, pagination, filters, concurrency and exports;
- retain mock mode for isolated frontend tests.

### Stage 7 — Objective validation

- Jest/Supertest unit and integration tests;
- clean database seed test;
- authorization matrix;
- duplicate/invalid input tests;
- pagination/filter/sort reconciliation;
- review conflict test;
- restart persistence test;
- frontend Playwright workflow against the real seeded API;
- container health and recovery smoke tests.

## Endpoint baseline

The backend must implement the frontend contract already documented in `docs/23-frontend-api-contract.md`.

Minimum endpoints:

```text
POST   /auth/login
GET    /auth/me
POST   /auth/logout
GET    /dashboard/summary
GET    /cameras
GET    /health
GET    /events
GET    /events/:eventId
PATCH  /events/:eventId/review
POST   /exports/events
```

Operational endpoints:

```text
GET    /healthz
GET    /readyz
```

The first implementation does not expose edge-ingestion endpoints to the frontend. Edge ingestion remains a separate service-authenticated boundary under issue #37.

## Definition of the first backend slice complete

The slice is complete when:

- MongoDB and the API start through one documented command;
- seed/reset tooling is deterministic and safe;
- all minimum endpoints work against persisted records;
- the existing frontend runs in live mode without screen rewrites;
- review changes survive restarts;
- stale versions return `409 VERSION_CONFLICT`;
- viewer/supervisor/admin permissions are enforced server-side;
- filtered CSV matches the selected records;
- automated API tests and real-API frontend tests pass;
- no Azure, camera, AI, client footage or production-data dependency exists.

## Work intentionally scheduled after the first slice

- Python edge service authentication and event ingestion;
- idempotent durable-spool acknowledgements;
- Socket.IO event and health updates;
- real evidence file storage and streaming;
- retention cleanup;
- Azure Blob/Cosmos synchronization;
- Entra ID;
- infrastructure monitoring and final local GPU-workstation packaging.