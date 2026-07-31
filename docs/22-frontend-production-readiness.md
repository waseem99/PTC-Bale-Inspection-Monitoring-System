# Frontend Production Readiness

## Delivery position

The dashboard frontend is implemented as a production-structured application shell and workflow. It supports both a deterministic in-browser mock provider and the real Node.js API backed by local PostgreSQL/Prisma.

Mock and live modes use the same routes, components, domain types, query model, caching, mutations, error behavior, exports, and release controls. The live provider connects through the documented contract in `docs/23-frontend-api-contract.md`; switching modes is environment configuration rather than a page rewrite.

The frontend and PostgreSQL-backed API implementation are present, but field-release status remains gated by objective CI/container/browser execution, a reviewed lockfile, protected deployment, PM/client UAT, and the later camera/AI/evidence integrations.

## Implemented application controls

- direct-linkable routes for login, overview, live monitoring, events, event detail, health, reports, and not-found behavior;
- protected application session boundary with viewer, supervisor, and administrator role checks;
- mock provider for isolated frontend UAT and a secure-cookie live provider connected to the Node/PostgreSQL API;
- typed API requests with runtime response validation, correlation IDs, timeouts, cancellation, normalized errors, and safe GET retries;
- query caching, request deduplication, stale-time handling, background refresh, invalidation, and adjacent-page prefetch;
- server-compatible event pagination, page size, filtering, sorting, search, and URL-preserved query state;
- versioned review mutations, duplicate-submit prevention, PostgreSQL conflict handling, and unsaved-change navigation warnings;
- filtered CSV export, print behavior, and failure recovery;
- loading, skeleton, empty, stale, offline, timeout, partial-failure, unavailable-evidence, expired-session, permission, and fatal-error states;
- responsive desktop/laptop behavior, large operational typography, keyboard navigation, visible focus, skip links, reduced motion, and text-backed statuses;
- scalable PTC visual asset and dashboard favicon derived from the supplied reference;
- service-worker restrictions that exclude API, evidence, media, sessions, and credentials;
- source maps disabled and production bundle secret scanning;
- static-host and Nginx security-header configurations.

## Live backend capabilities now implemented

- fixed viewer, supervisor and administrator credential validation;
- server-side opaque sessions stored as hashes in PostgreSQL;
- persistent dashboard summary, camera, health, event, review and audit records;
- paginated filters, search and whitelisted sorting;
- event detail with ordered SOP-step records;
- transactional review and audit creation;
- optimistic concurrency through `expectedVersion` and `409 VERSION_CONFLICT`;
- filtered CSV export;
- deterministic seed/reset/status tooling;
- same-origin Nginx proxy and local dashboard/API/PostgreSQL Compose stack;
- Prisma schema and committed SQL migration.

The seeded records and placeholder evidence states are for workflow validation, not PTC acceptance evidence.

## Deployment readiness

The repository contains:

- a multi-stage dashboard `Dockerfile`;
- hardened Nginx runtime with `/healthz`, SPA fallback, compression, caching, CSP, anti-framing, referrer, permissions, content-type, and cross-origin controls;
- optional runtime Basic Authentication for a protected standalone mock demo;
- a full local PostgreSQL/API/dashboard stack with migration and seed jobs;
- static deployment configuration and CI artifact packaging;
- container build, health, route-fallback, API readiness and header smoke-test definitions;
- deployment, HTTPS, validation, and rollback runbook in `docs/25-frontend-deployment-runbook.md`;
- field UAT/release gate in `docs/24-frontend-uat-checklist.md`;
- PostgreSQL/backend validation and recovery runbook in `docs/28-backend-validation-and-local-runbook.md`.

Frontend mock credentials exist only to exercise UI roles and are compiled into the browser bundle. They are not a security boundary. Shared mock demos must be protected by the hosting platform, VPN, authenticated reverse proxy, or the container's runtime Basic Authentication. Live mode uses the server-side session API.

## Automated quality implementation

The repository includes:

- strict TypeScript checks;
- ESLint rules;
- unit tests for utilities, query serialization, routing, mock data, provider behavior, permissions, and cache handling;
- component interaction tests;
- Jest/Supertest/PostgreSQL API tests;
- Prisma Client generation and migration-deploy checks;
- Playwright supervisor workflow, URL state, review persistence, live API mode and accessibility checks;
- CI jobs for lint, type-check, tests, migrations, production builds, secret/source-map scans, static artifact packaging, container validation, browser tests, and report artifacts;
- self-hosted runner fallbacks for frontend and backend validation.

## Current release gate

Implementation is present, but objective execution evidence is not yet available. GitHub Actions jobs are being created and then fail before any step starts, with `steps: null` and no logs. Container and browser jobs are consequently skipped. This behavior is outside application code and indicates unavailable GitHub-hosted execution due to repository/account quota, billing, policy, or runner provisioning.

Before the draft frontend/backend PRs are marked ready or merged:

1. Generate, review and commit `pnpm-lock.yaml`.
2. Restore GitHub-hosted Actions execution or attach the approved self-hosted runners.
3. Pass frontend quality, static artifact, container, Playwright, and accessibility gates.
4. Pass Prisma generation/migration, PostgreSQL API tests, API container and live-stack browser gates.
5. Demonstrate PostgreSQL restart persistence plus `pg_dump`/`pg_restore` in a controlled environment.
6. Provision the isolated protected HTTPS demo endpoint under issue #61.
7. Complete and sign the UAT checklists.

## Remaining camera, AI and evidence integration boundary

The following are intentionally not represented as connected production functionality yet:

- authorized WebRTC/HLS delivery from real camera streams;
- real evidence snapshot and clip storage/retrieval;
- Python edge event and health ingestion;
- AI-generated events, model outputs, and approved SOP logic;
- Socket.IO event/health updates;
- Azure synchronization, Entra ID and infrastructure secrets.

These integrations must follow the documented API, PostgreSQL, evidence and security contracts. They must not be simulated and described as completed field functionality.
