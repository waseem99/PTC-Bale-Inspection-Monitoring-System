# Frontend Production Readiness

## Delivery position

The dashboard frontend is implemented as a production-grade application shell and workflow using a synthetic provider. The frontend is complete without fabricating backend, camera, evidence, AI, or Azure integrations.

Mock and live modes use the same routes, components, domain types, query model, caching, mutations, error behavior, exports, and release controls. Switching to live mode requires the backend contract in `docs/23-frontend-api-contract.md` and environment configuration rather than page rewrites.

## Implemented application controls

- direct-linkable routes for login, overview, live monitoring, events, event detail, health, reports, and not-found behavior;
- protected application session boundary with viewer, supervisor, and administrator role checks;
- mock provider for complete frontend UAT and a secure-cookie-compatible live provider boundary;
- typed API requests with runtime response validation, correlation IDs, timeouts, cancellation, normalized errors, and safe GET retries;
- query caching, request deduplication, stale-time handling, background refresh, invalidation, and adjacent-page prefetch;
- server-compatible event pagination, page size, filtering, sorting, search, and URL-preserved query state;
- versioned review mutations, duplicate-submit prevention, conflict handling, and unsaved-change navigation warnings;
- filtered CSV export, print behavior, and failure recovery;
- loading, skeleton, empty, stale, offline, timeout, partial-failure, unavailable-evidence, expired-session, permission, and fatal-error states;
- responsive desktop/laptop behavior, large operational typography, keyboard navigation, visible focus, skip links, reduced motion, and text-backed statuses;
- scalable PTC visual asset and dashboard favicon derived from the supplied reference;
- service-worker restrictions that exclude API, evidence, media, sessions, and credentials;
- source maps disabled and production bundle secret scanning;
- static-host and Nginx security-header configurations.

## Deployment readiness

The repository now contains:

- a multi-stage dashboard `Dockerfile`;
- hardened Nginx runtime with `/healthz`, SPA fallback, compression, caching, CSP, anti-framing, referrer, permissions, content-type, and cross-origin controls;
- optional runtime Basic Authentication for a protected shared demo;
- Docker Compose profile that requires hosting-layer and application-demo credentials;
- static deployment configuration and CI artifact packaging;
- container build, health, route-fallback, and header smoke-test steps in CI;
- deployment, HTTPS, validation, and rollback runbook in `docs/25-frontend-deployment-runbook.md`;
- field UAT/release gate in `docs/24-frontend-uat-checklist.md`.

Frontend mock credentials exist only to exercise UI roles and are compiled into the browser bundle. They are not a security boundary. Shared demos must be protected by the hosting platform, VPN, authenticated reverse proxy, or the container's runtime Basic Authentication.

## Automated quality implementation

The repository includes:

- strict TypeScript checks;
- ESLint rules;
- unit tests for utilities, query serialization, routing, mock data, provider behavior, permissions, and cache handling;
- component interaction tests;
- Playwright supervisor workflow, URL state, review persistence, and accessibility checks;
- CI jobs for lint, type-check, tests, production build, secret/source-map scan, static artifact packaging, container validation, browser tests, and report artifacts.

## Current release gate

The implementation is complete, but objective execution evidence is not yet available. GitHub Actions jobs are being created and then fail before any step starts, with `steps: null` and no logs. Container and browser jobs are consequently skipped. This behavior is outside application code and indicates unavailable GitHub-hosted execution due to repository/account quota, billing, policy, or runner provisioning.

Before the draft PR is marked ready or merged:

1. Restore GitHub-hosted Actions execution or attach an approved self-hosted runner.
2. Pass quality, static artifact, container smoke, Playwright, and accessibility gates.
3. Provision the isolated protected HTTPS demo endpoint under issue #61.
4. Complete and sign the UAT checklist.

## Backend and edge integration boundary

The following remain intentionally outside the frontend-only completion goal:

- real credential validation and server-side sessions;
- persistent KPI, camera, health, event, review, audit, and export APIs;
- database and evidence storage;
- authorized WebRTC/HLS media delivery;
- AI-generated events, model outputs, and approved SOP logic;
- Azure synchronization and infrastructure secrets.

These integrations must follow the documented API and security contracts. They must not be simulated and described as connected production functionality.
