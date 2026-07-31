# PTC Bale Inspection Dashboard

Production-structured React/TypeScript frontend for the PTC Bale Inspection & Monitoring PoC.

## Delivery status

The frontend uses the same routes, components, typed contracts, caching, pagination, mutations, resilience behavior and release controls in both modes:

- **Mock mode:** fully functional synthetic provider for client review, browser UAT and frontend delivery.
- **Live mode:** real Node.js API backed by local PostgreSQL and deterministic seeded records, without page or workflow rewrites.

It includes route-based screens, protected sessions, query caching, server-compatible pagination, filters, sorting, review mutations, exports, offline/failure handling, responsive layouts, accessibility controls, automated tests, security headers and CI quality gates.

Implemented backend-dependent workflow integrations include fixed-user authentication validation, persistent PostgreSQL events/reviews/audits, camera/health records and CSV export. Remaining integrations are authorized WebRTC/HLS camera URLs, real evidence files, Python/AI-generated events, Socket.IO updates and approved Azure synchronization.

## Routes

`/login`, `/overview`, `/live`, `/events`, `/events/:eventId`, `/health`, `/reports`

## Mock access

Users: `viewer`, `supervisor`, `admin`.

Local development uses `PTC-Demo-2026!` when `VITE_DEMO_PASSWORD` is not supplied. A production mock build requires either an explicit `VITE_DEMO_PASSWORD` or the deliberate CI/demo-credential flag.

Mock credentials are compiled into the frontend and only exercise application roles. They do not secure a shared deployment. Use hosting-platform authentication, VPN/reverse-proxy access control, or the container's runtime Basic Authentication.

## Commands

```bash
pnpm install
pnpm dev:dashboard
pnpm check:dashboard
pnpm --filter @ptc-bale/dashboard-web test:e2e
```

Dashboard: `http://localhost:4173`

## Seeded PostgreSQL live stack

From the repository root:

```bash
cp infrastructure/local/.env.example infrastructure/local/.env
# Replace PostgreSQL and fixed-user passwords.
pnpm stack:up
```

Portal: `http://localhost:8080`

The live stack keeps the browser on the same origin, proxies `/api` to the Node.js API, and stores workflow records in local PostgreSQL.

## Protected standalone mock deployment

Build from the repository root:

```bash
docker build \
  --file apps/dashboard-web/Dockerfile \
  --build-arg 'VITE_DEMO_PASSWORD=<demo-only-password>' \
  --tag ptc-bale-dashboard:demo \
  .
```

Run with hosting-layer access control:

```bash
docker run --detach \
  --name ptc-bale-dashboard \
  --env 'DEMO_BASIC_AUTH_USER=<reviewer-user>' \
  --env 'DEMO_BASIC_AUTH_PASSWORD=<strong-hosting-password>' \
  --publish 8080:8080 \
  ptc-bale-dashboard:demo
```

The standalone container serves the SPA on port `8080` and exposes unprotected `GET /healthz` for the approved health monitor. Place it behind HTTPS and follow `docs/25-frontend-deployment-runbook.md` before sharing the URL.

## Production controls

- memory cache with stale times, request deduplication, abort and safe retries;
- background refresh and query invalidation;
- URL-based server-compatible pagination, filters and sorting;
- versioned review mutation, duplicate-submit prevention and conflict handling;
- navigation warnings for unsaved review changes;
- local mock persistence only for synthetic review data;
- live session restoration through `/auth/me` with secure-cookie compatibility;
- no live access token persisted in browser storage by the cookie-backed provider;
- no PostgreSQL credentials, tokens, evidence or media cached by the service worker;
- SPA fallback and security headers supplied for static hosting and the included Nginx runtime;
- source maps disabled and CI scans for obvious secrets;
- direct RTSP URLs and camera credentials prohibited in browser code;
- responsive, keyboard-operable and WCAG-oriented screen behavior;
- unit, component, provider, route and Playwright workflow tests;
- deployable static artifact and container smoke-test gates in CI;
- scalable PTC brand asset and favicon derived from the supplied reference.
