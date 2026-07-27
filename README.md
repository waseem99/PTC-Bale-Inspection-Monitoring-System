# PTC Bale Inspection & Monitoring System

AI-assisted Proof of Concept for monitoring the PTC bale inspection process through four fixed IP cameras, a local GPU workstation, computer vision, timestamped evidence and an operational browser dashboard.

## Current status

The repository now contains:

- the approved local-first architecture and delivery documentation;
- a production-structured React/TypeScript dashboard with mock/live provider parity;
- a real Node.js/Express/TypeScript platform API;
- local PostgreSQL persistence through Prisma, reviewed SQL migrations and deterministic seed/reset tooling;
- fixed PoC users with server-side sessions and role authorization;
- dashboard, camera, health, event, review, audit and CSV-export APIs;
- a same-origin local Docker stack joining dashboard, API and PostgreSQL;
- OpenAPI, Jest/Supertest and CI validation assets.

The persisted dataset is synthetic and supports workflow/API validation before camera, Python AI and real evidence integration. It is not PTC acceptance evidence.

## Run the seeded end-to-end stack

```bash
cp infrastructure/local/.env.example infrastructure/local/.env
# Replace every password and confirm the allowed browser origins.
pnpm stack:up
```

Portal:

```text
http://localhost:8080
```

The complete local stack uses only the supplied workstation and local storage. PostgreSQL is self-hosted in Docker and does not require a paid cloud database.

See [`docs/28-backend-validation-and-local-runbook.md`](docs/28-backend-validation-and-local-runbook.md) for startup, migration, backup, reset, validation and UAT instructions.

## Delivery objective

Deliver an eight-week PoC that:

- ingests four approved camera feeds;
- detects bales and anonymous workers in the inspection area;
- evaluates the client-approved opening/frisking sequence;
- identifies completed, missed, incomplete and unresolved inspections;
- stores timestamped snapshots and short evidence clips;
- provides local live monitoring, event review, filters, remarks and basic exports;
- continues core operation without internet or Azure availability;
- supports a five-week hypercare and controlled improvement period.

## Architecture

The PoC is **local-first and Azure-aligned**.

### Required local system

The supplied cameras and GPU workstation support the complete operational PoC:

- Python camera ingestion and health;
- Python AI inference and temporary tracking;
- versioned SOP compliance engine;
- local evidence generation and durable event spool;
- Node.js/Express portal API;
- local PostgreSQL database;
- protected local evidence storage;
- React intranet dashboard;
- browser-compatible live-view gateway.

### Optional approved Azure layer

Azure may later provide separately hosted development/central access, Microsoft Entra ID, synchronized metadata/evidence, Blob Storage, monitoring, Key Vault and approved deployment automation. Where a managed database is later approved, Azure Database for PostgreSQL is the compatible path. Azure is not a dependency for core local PoC operation.

## Technical stack

- **Dashboard:** React, TypeScript and Vite
- **Portal API:** Node.js, Express and TypeScript
- **Local metadata and workflow records:** PostgreSQL with Prisma ORM and committed SQL migrations
- **Flexible AI/configuration fields:** relational columns plus PostgreSQL `JSONB` where explicitly required
- **Camera/AI/edge:** Python, OpenCV, PyTorch training and ONNX Runtime CUDA deployment
- **Local updates:** Socket.IO after the REST vertical slice
- **Optional Azure:** Bicep, Entra ID, Azure Database for PostgreSQL, Blob Storage, Key Vault and Application Insights
- **CI/CD:** GitHub Actions with self-hosted validation fallbacks

No .NET, Entity Framework Core, Azure SQL, MongoDB, Mongoose or SignalR dependency is planned for the PoC.

## Repository layout

```text
apps/
  dashboard-web/              React operational portal
  platform-api/               Node.js/Express/Prisma portal API
services/
  edge-agent/                 Camera, health, evidence and synchronization
  ai-inference/               Python computer-vision runtime
  compliance-engine/          PTC SOP state machine and reason codes
packages/
  contracts/                  Shared OpenAPI/JSON Schema contracts
  ui-components/              Small reusable dashboard component layer
infrastructure/
  local/                      Seeded dashboard/API/PostgreSQL stack
  edge/                       Local GPU-workstation deployment assets
  azure/                      Optional approved Azure assets
tests/
  integration/                Cross-module integration tests
  acceptance/                 PTC-specific PoC/UAT scenarios
docs/                         Project and technical documentation
```

## Implemented portal/API workflows

- fixed viewer, supervisor and administrator login;
- operations summary;
- four-camera monitoring states;
- system-health states;
- paginated/filterable/sortable inspection events;
- event detail and observed SOP steps;
- supervisor confirm/dismiss decision and remarks;
- transactional optimistic concurrency and audit records;
- filtered CSV export;
- 257 deterministic persistent synthetic events.

A future Microsoft Entra ID adapter may replace or extend the fixed-user login after client approval. Full user administration and enterprise RBAC are not part of the first PoC implementation.

## Database lifecycle

- Prisma schema: `apps/platform-api/prisma/schema.prisma`
- reviewed SQL migrations: `apps/platform-api/prisma/migrations/`
- local deployment migration command: `prisma migrate deploy`
- local backup: PostgreSQL `pg_dump`
- local restore: PostgreSQL `pg_restore`
- deterministic synthetic dataset: `seed`, `seed:reset` and `seed:status`

Destructive reset commands are blocked in `NODE_ENV=production`.

## Next integrations

- Python edge-event ingestion and durable-spool acknowledgement;
- real camera and stream gateway integration;
- real snapshots and short evidence clips;
- AI-generated event outcomes;
- Socket.IO updates;
- approved Azure synchronization and identity components.

## Source of truth

The awarded BOQ, approved technical proposal, confirmed PTC SOP, written clarifications and signed change requests are authoritative. The Bangladesh reference project informs feasibility and workflow understanding but does not automatically add features to the PTC scope.

## Documentation

See [`docs/README.md`](docs/README.md) for the complete index.

## Security

Do not commit credentials, database connection strings, camera URLs, production IP addresses, site diagrams, client documents, Bangladesh reference media, PTC footage, annotations, evidence clips, production model binaries or personal data. Restricted materials remain in approved external storage and are referenced through IDs, manifests and checksums only.

The repository is private, but private visibility does not change these data-handling rules.
