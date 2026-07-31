# PostgreSQL Validation Status

## Purpose

This record separates implemented PostgreSQL/Prisma work from objective release evidence and the remaining approval or recovery checks.

## Authoritative pull request

PR #69 is the single authoritative implementation pull request against `main`.

The obsolete stacked pull requests were closed as superseded:

- PR #58 — previous foundation and MongoDB direction;
- PR #62 — previous stacked dashboard pull request.

Neither superseded pull request is to be merged.

## Static implementation and cleanup completed

The active PR contains:

- local PostgreSQL 17 deployment with a persistent volume;
- Prisma schema and generated-client workflow;
- committed SQL migration;
- relational users, sessions, cameras, inspection events, ordered event steps, health metrics, evidence metadata and audit logs;
- foreign keys, uniqueness, enum types, check constraints and compound indexes;
- UTC-aware PostgreSQL operational timestamps;
- transactional review and audit creation;
- optimistic concurrency using the event version;
- PostgreSQL-backed fixed-user sessions;
- deterministic PostgreSQL seed, reset and status tooling;
- PostgreSQL-aware Node.js API, React live mode, Docker Compose and CI definitions;
- backup and recovery procedures based on `pg_dump` and `pg_restore`;
- optional Azure Database for PostgreSQL alignment;
- updated architecture, scope, data, security, testing, deployment, operations, delivery and issue documentation.

Repository cleanup completed in the active implementation includes:

- removal of `apps/platform-api/src/models.ts`;
- removal of Mongoose and MongoDB test-server dependencies;
- replacement of MongoDB Docker, environment and CI configuration;
- replacement of `MONGODB_URI` with `DATABASE_URL`;
- removal of active Cosmos DB for MongoDB planning;
- PostgreSQL/Prisma wording in the pull-request template and delivery issues;
- closure of superseded pull requests;
- removal of embedded PostgreSQL fallback credentials from source;
- production test files excluded from the API build output;
- removal of an accidental placeholder file.

Historical decision records and acceptance checks may still name MongoDB/Mongoose only to state that the old direction was superseded or to verify that it is absent. Such references are not active implementation dependencies.

## Restored GitHub-hosted validation

GitHub-hosted execution is operational again.

### Frontend evidence

Frontend CI run `30289726687` completed successfully on commit `fd7b308f163d0c9892a21454bcb5cc30daad114f`.

The successful workflow covered:

- dependency installation;
- ESLint;
- strict TypeScript;
- Vitest unit/component tests;
- production mock build;
- production bundle scan;
- Nginx container build and health/SPA smoke test;
- Playwright navigation, filtering, pagination, review persistence and accessibility checks.

### Backend and live-stack evidence

Backend CI run `30289726686` completed successfully on commit `fd7b308f163d0c9892a21454bcb5cc30daad114f`.

The successful workflow covered:

- dependency installation;
- Prisma Client generation;
- `prisma migrate deploy` against PostgreSQL 17;
- ESLint;
- strict TypeScript;
- Jest/Supertest/PostgreSQL integration tests;
- production build;
- deterministic seed reset and status;
- production-output secret scan;
- API build-stage and runtime container construction;
- runtime Prisma Client availability;
- API readiness and health checks;
- complete dashboard/API/PostgreSQL Docker Compose startup;
- same-origin readiness;
- Playwright execution against the real seeded PostgreSQL API.

## Committed lockfile

The lockfile bootstrap workflow completed successfully and committed `pnpm-lock.yaml` to the PR branch.

The committed lockfile:

- uses lockfile format 9.0;
- contains the dashboard and platform API dependency graph;
- was checked for credential-like registry or authentication values before commit;
- is now used by hosted workflows through `pnpm install --frozen-lockfile`.

A new user-authored documentation commit was made after the bot-generated lockfile commit so the normal frontend and backend workflows execute again against the committed lockfile.

## Required execution evidence

Completed:

- [x] reviewed `pnpm-lock.yaml` committed;
- [x] Prisma Client generation;
- [x] `prisma migrate deploy` against a clean PostgreSQL database;
- [x] frontend and backend ESLint;
- [x] frontend and backend strict TypeScript;
- [x] frontend Vitest tests;
- [x] Jest/Supertest/PostgreSQL integration tests;
- [x] deterministic seed reset/status execution;
- [x] production frontend build and bundle scan;
- [x] production frontend container health and SPA fallback;
- [x] production API build and secret scan;
- [x] production API image build and readiness;
- [x] dashboard/API/PostgreSQL live-stack startup;
- [x] Playwright against mock mode and the real seeded PostgreSQL API;
- [x] server-side review, role and version-conflict behavior covered by integration tests;
- [x] no active MongoDB/Mongoose runtime, dependency, environment key, service or data volume.

Still required before final field-release approval:

- [ ] frozen-install reruns complete successfully on the latest lockfile-containing commit;
- [ ] API and PostgreSQL restart preserve representative committed reviews and audits in an explicit recovery test;
- [ ] normal seed preserves human review state and event version in an explicit recovery test;
- [ ] filtered CSV is reconciled against representative PostgreSQL records in the release record;
- [ ] controlled `pg_dump` and `pg_restore` restoration reconciles representative records;
- [ ] no restricted client data, database dump, evidence file or production secret is present;
- [ ] technical review is recorded;
- [ ] Project Manager review is recorded.

## Validation command sequence

From a clean checkout of the PR branch:

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile

pnpm --filter @ptc-bale/platform-api db:generate
pnpm --filter @ptc-bale/platform-api db:migrate:deploy
pnpm --filter @ptc-bale/platform-api lint
pnpm --filter @ptc-bale/platform-api typecheck
pnpm --filter @ptc-bale/platform-api test
pnpm --filter @ptc-bale/platform-api build
pnpm --filter @ptc-bale/platform-api seed:reset
pnpm --filter @ptc-bale/platform-api seed:status
```

Then execute the restart-persistence and backup/restore sections in `docs/28-backend-validation-and-local-runbook.md`.

## Release rule

Do not mark PR #69 ready, merge it, close issue #68 or tag a field release solely because the feature implementation exists.

The next release gates are the frozen-lockfile rerun, explicit restart/backup/restore evidence, restricted-data confirmation and recorded technical/Project Manager approval.