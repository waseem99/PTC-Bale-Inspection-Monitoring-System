# PostgreSQL Validation Status

## Purpose

This record separates implemented PostgreSQL/Prisma work from validation evidence that still requires an executable Linux environment with Node.js, pnpm, Docker, PostgreSQL and browser-test support.

It prevents implementation review, runner availability and final release approval from being treated as the same activity.

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
- removal of an accidental placeholder file.

Historical decision records and acceptance checks may still name MongoDB/Mongoose only to state that the old direction was superseded or to verify that it is absent. Such references are not active implementation dependencies.

## GitHub-hosted validation result

The earlier backend run `30254000176` was retried and again failed before any step.

After workflow and repository cleanup, fresh runs were triggered from the current PR branch:

- Backend CI run `30258171753`;
- Frontend CI run `30258171756`.

For both workflows, GitHub created the first `quality` job and failed it before checkout or any workflow step. Each job returned no step list and no downloadable logs. All dependent container and browser jobs were skipped.

Because no action, command, dependency installation, migration or test started, these results do not demonstrate an application, PostgreSQL, Prisma, frontend or workflow-code failure. They are treated as an external GitHub-hosted runner/account provisioning blocker until hosted execution is restored.

## Lockfile completion path

The backend hosted and self-hosted workflows now:

- use `pnpm install --frozen-lockfile` automatically when `pnpm-lock.yaml` is present;
- bootstrap with `--no-frozen-lockfile` only while the reviewed lockfile is absent;
- require the generated lockfile to be non-empty;
- upload `pnpm-lock.yaml` as a workflow artifact before database and test execution;
- preserve the lockfile in the self-hosted validation artifact.

Once either runner executes, download the generated lockfile artifact, review it, commit it to the PR branch and rerun. Subsequent runs will enforce frozen installation.

## Approved validation path

Use one of these execution paths:

1. restore GitHub-hosted Actions execution; or
2. attach an approved ephemeral Linux x64 self-hosted runner with the label `ptc-api`, then run **Backend CI Self Hosted**.

The validation host requires:

- Node.js 22.16.0 or the reviewed compatible version;
- Corepack and pnpm 9.15.4;
- Docker Engine and Docker Compose;
- enough disk for PostgreSQL, browser and container artifacts;
- outbound access required to install the reviewed dependencies and browser runtime;
- no production credentials or client data.

## Required execution evidence

The PR remains draft until all applicable evidence is attached:

- reviewed `pnpm-lock.yaml` committed;
- clean `pnpm install --frozen-lockfile`;
- Prisma Client generation;
- `prisma migrate deploy` against a clean PostgreSQL database;
- ESLint and strict TypeScript pass;
- Jest/Supertest/PostgreSQL integration tests pass;
- deterministic seed status reports 3 users, 4 cameras, 6 health metrics and 257 events;
- production API build and container readiness pass;
- React live mode works against the seeded PostgreSQL API;
- Playwright login, navigation, filters, pagination, review persistence, conflict and accessibility checks pass;
- API and PostgreSQL restart preserve committed events, reviews and audits;
- normal seeding preserves human review state and event version;
- stale review returns HTTP 409 without overwriting current data;
- viewer, supervisor and administrator permissions are enforced server-side;
- filtered CSV reconciles with PostgreSQL records;
- controlled `pg_dump` and `pg_restore` restoration reconciles representative records;
- static repository scan confirms no active MongoDB/Mongoose runtime, dependency, environment key, service or data volume;
- no restricted client data, database dump, evidence file or production secret is present;
- technical and Project Manager review are recorded.

## Validation command sequence

From a clean checkout of the PR branch:

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install --no-frozen-lockfile
# Review and commit pnpm-lock.yaml before the release run.
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

Then execute the production-container, live Playwright, restart-persistence and backup/restore sections in `docs/28-backend-validation-and-local-runbook.md`.

## Release rule

Do not mark PR #69 ready, merge it, close issue #68 or tag a release solely because the implementation and documentation exist.

The release gate opens only after objective execution evidence is available or a named approver formally accepts a documented deviation. The absence of a runnable CI host is not an acceptable basis for recording tests as passed.