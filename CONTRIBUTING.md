# Contributing

## Before starting

1. Confirm the work is represented by a GitHub issue.
2. Verify the issue is within PoC/MVP or hypercare scope.
3. Confirm acceptance criteria and dependencies.
4. Check `docs/20-bangladesh-reference-poc-analysis.md` when the work could be influenced by a reference-video feature.
5. Check ADR-012 and the Prisma migration history before changing persistence.
6. Do not begin blocked work by filling missing client decisions with assumptions.

## Branches

Create a short-lived branch from the approved integration/base branch:

- `feature/<issue>-<name>`
- `fix/<issue>-<name>`
- `docs/<issue>-<name>`
- `test/<issue>-<name>`

## Pull requests

- link the issue using `Closes #<number>` when appropriate;
- explain what changed and what did not change;
- list local/offline tests and deployment impact;
- identify PostgreSQL schema/migration impact;
- identify optional Azure impact separately;
- update relevant documentation;
- do not commit restricted client data, database URLs/dumps, or production secrets;
- request review from the appropriate technical owner and Project Manager where scope/client acceptance is affected.

## Code boundaries

- shared JSON Schema/OpenAPI contracts belong in `packages/contracts/`;
- camera and optional synchronization behavior belongs in `services/edge-agent/`;
- model execution belongs in `services/ai-inference/`;
- SOP rules and outcomes belong in `services/compliance-engine/`;
- Node.js/Express event management and PostgreSQL access belong in `apps/platform-api/`;
- Prisma schema and SQL migrations belong in `apps/platform-api/prisma/`;
- React local/approved central user interface belongs in `apps/dashboard-web/`;
- the complete local PostgreSQL/API/dashboard stack belongs under `infrastructure/local/`;
- local workstation provisioning belongs under `infrastructure/edge/`;
- approved Azure provisioning belongs under `infrastructure/azure/`.

Do not duplicate SOP logic in the frontend or platform API. Do not allow the browser or Python edge service to connect directly to PostgreSQL. Do not implement a feature merely because it appears in the Bangladesh reference or generic computer-vision demonstration.

## PostgreSQL and migration rules

- use PostgreSQL and Prisma; do not introduce MongoDB, Mongoose or another active operational database;
- update `schema.prisma` and include a reviewed SQL migration for schema changes;
- generate migrations only against a dedicated developer database;
- use `prisma migrate deploy` for shared/UAT/field environments;
- explain data-loss, locking, index, backup and rollback/compensation impact;
- include tests for constraints, queries and migration-dependent behavior;
- back up before destructive or data-transforming field migrations;
- do not commit database dumps;
- preserve event IDs, original AI outcome, review version and auditability;
- use JSONB only for approved flexible payloads, not to avoid relational design.

## Security and restricted data

Never commit:

- camera URLs, usernames, or passwords;
- PostgreSQL URLs, passwords, dumps or backup archives;
- Azure secrets or certificates;
- site IP addresses or detailed production network diagrams;
- footage, frames, annotations, evidence, or client source documents;
- Bangladesh reference media;
- production model binaries;
- personal or biometric data.

The repository being private does not authorize storage of restricted operational media or database backups. Use the approved Drive/Azure/local restricted storage and reference event IDs, migration versions or manifests in GitHub.

## Tests

Changes must include the appropriate tests:

- Python unit/regression tests for edge and AI behavior;
- Jest/Supertest integration tests for the local Node.js API and PostgreSQL behavior;
- Prisma Client generation and migration-deploy validation;
- PostgreSQL constraint, transaction, pagination, backup/recovery and restart tests where applicable;
- Vitest and Playwright tests for local dashboard and end-to-end workflows;
- offline/internet-outage tests for core PoC behavior;
- optional synchronization tests where Azure is approved;
- infrastructure validation for Bicep changes;
- contract compatibility tests for shared JSON Schema/OpenAPI definitions.

## Documentation

Update documentation when changing:

- architecture or local/Azure service boundaries;
- event contracts or PostgreSQL tables/indexes/migrations;
- SOP rules and reason codes;
- camera orientation, zones, and physical workflow assumptions;
- deployment, migration, backup or recovery steps;
- configuration;
- security, retention, or access behavior;
- model/versioning and evaluation behavior;
- reference-to-PTC scope mapping.

## Lockfile

`pnpm` is the only approved Node package manager. The reviewed `pnpm-lock.yaml` is authoritative. Do not commit npm or Yarn lockfiles.

## Definition of done

The issue acceptance criteria are met, tests pass, review is complete, documentation is current, no restricted data is committed, local/offline behavior is preserved, PostgreSQL migration/recovery impact is addressed, and release/deployment impact is recorded.
