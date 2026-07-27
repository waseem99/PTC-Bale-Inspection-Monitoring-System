# Backend Validation and Local Stack Runbook

## Purpose

Run and validate the first persistent backend vertical slice for the PTC Bale Inspection PoC. This slice uses deterministic synthetic records and is intended for workflow validation before camera, AI and evidence integration.

## Included services

- React dashboard in live-data mode;
- Nginx same-origin `/api` proxy;
- Node.js/Express/TypeScript platform API;
- local MongoDB;
- one-time deterministic seed service.

## Prerequisites

- Docker Engine and Docker Compose v2;
- enough local disk space for MongoDB images and volumes;
- repository access;
- no service already using the selected dashboard port.

## Configure

From the repository root:

```bash
cp infrastructure/local/.env.example infrastructure/local/.env
```

Replace every seed password. Use different passwords for viewer, supervisor and administrator accounts. The `.env` file is ignored by Git and must not be shared outside the approved PoC team.

For the default local URL, retain:

```text
DASHBOARD_PORT=8080
ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

When using a different hostname or port, add its exact browser origin to `ALLOWED_ORIGINS`.

## Start the complete stack

```bash
pnpm stack:up
```

Equivalent command:

```bash
docker compose \
  --env-file infrastructure/local/.env \
  --file infrastructure/local/docker-compose.api.yml \
  up --build
```

The seed service runs once and exits successfully. MongoDB, the API and the dashboard remain running.

Portal:

```text
http://localhost:8080
```

Readiness:

```text
http://localhost:8080/api/readyz
```

## Accounts

- `viewer` — read-only portal access;
- `supervisor` — read plus event review and remarks;
- `admin` — the approved limited PoC administrative role.

Use the private passwords configured in `infrastructure/local/.env`.

## Seed behavior

The initial seed creates:

- three fixed users;
- four cameras;
- six system-health metrics;
- 257 deterministic inspection events;
- evidence metadata with pending/unavailable states;
- stable event IDs for browser and API tests.

A normal restart does not remove review changes. The seed command updates synthetic source fields but intentionally preserves existing review status, remarks, reviewer, review time and event version.

## Reset all synthetic state

This removes the local Docker volume and recreates the deterministic dataset:

```bash
pnpm stack:reset
```

Use this only for development or planned demonstration resets. It deletes local seeded review changes and sessions.

## Stop without deleting data

```bash
pnpm stack:down
```

## Direct API package validation

With a reachable MongoDB and required environment variables:

```bash
pnpm install
pnpm --filter @ptc-bale/platform-api lint
pnpm --filter @ptc-bale/platform-api typecheck
pnpm --filter @ptc-bale/platform-api test
pnpm --filter @ptc-bale/platform-api build
pnpm --filter @ptc-bale/platform-api seed:reset
pnpm --filter @ptc-bale/platform-api seed:status
```

Expected seed status:

```json
{"users":3,"cameras":4,"health":6,"events":257}
```

## API smoke checks

Unauthenticated operational checks:

```bash
curl --fail http://localhost:8080/api/healthz
curl --fail http://localhost:8080/api/readyz
```

Use the browser for cookie-backed authentication. Do not put demonstration passwords into shell history on shared machines.

## Objective validation paths

### GitHub-hosted runner

`.github/workflows/backend-ci.yml` runs:

- dependency installation;
- ESLint;
- strict TypeScript;
- Jest/Supertest/MongoDB integration tests;
- production build;
- deterministic seed/reset validation;
- output secret scan;
- production container build and health smoke test.

### Self-hosted fallback

When GitHub-hosted Actions cannot execute, attach a dedicated ephemeral Linux x64 runner with the label:

```text
ptc-api
```

Then manually run **Backend CI Self Hosted** from the Actions tab. The workflow is in `.github/workflows/backend-ci-self-hosted.yml`.

Runner requirements:

- current security updates;
- Node.js/Corepack;
- Docker and Docker Compose;
- no PTC credentials, footage, camera network access or production files;
- an ephemeral or clean workspace;
- runner removed after the validation record is captured.

## Manual browser UAT against the real API

1. Sign in as viewer and confirm review controls are disabled.
2. Confirm dashboard totals load from the persisted API.
3. Confirm four cameras and six health records appear.
4. Test page sizes, filters, search, sorting and direct event links.
5. Sign in as supervisor, update one event and refresh the browser.
6. Confirm the review persists after refresh.
7. Open the same event in two browser sessions and verify the stale update returns a version-conflict message.
8. Export a filtered CSV and confirm it matches the selected filter.
9. Restart the API and confirm review data persists.
10. Stop internet access while retaining the local Docker network and confirm local portal/API/database operation continues.

## Release evidence

Attach the following to issue #68 before declaring the first backend slice complete:

- successful CI or approved self-hosted workflow URL;
- seed status showing 3 users, 4 cameras, 6 health metrics and 257 events;
- API/container health results;
- browser UAT record against live API mode;
- confirmation that no real PTC/Bangladesh footage, RTSP credentials, production IPs or evidence files are included;
- PM and technical-review decisions.

## Known scope boundary

Passing this runbook validates the portal workflow backend and persisted synthetic records. It does not validate camera placement, AI accuracy, SOP detection, real evidence storage, Azure synchronization or production field readiness of the complete PoC.