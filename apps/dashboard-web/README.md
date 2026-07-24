# PTC Bale Inspection Dashboard

Production-ready React/TypeScript frontend for the PTC Bale Inspection & Monitoring PoC.

## Delivery status

The frontend uses the same routes, components, typed contracts, caching, pagination, mutations, resilience behavior and release controls in both modes:

- **Mock mode:** fully functional synthetic provider for client review, browser UAT and frontend delivery.
- **Live mode:** configured application API without page or workflow rewrites.

It includes route-based screens, protected sessions, query caching, server-compatible pagination, filters, sorting, review mutations, exports, offline/failure handling, responsive layouts, accessibility controls, automated tests, security headers and CI quality gates.

Backend-dependent integrations remain separate: real authentication validation, authorized WebRTC/HLS camera URLs, persistent database/evidence APIs, AI-generated events and Azure synchronization.

## Routes

`/login`, `/overview`, `/live`, `/events`, `/events/:eventId`, `/health`, `/reports`

## Mock access

Users: `viewer`, `supervisor`, `admin`.

Local development uses `PTC-Demo-2026!` when `VITE_DEMO_PASSWORD` is not supplied. Any shared or production-hosted mock build must set a private `VITE_DEMO_PASSWORD`; the fallback is intentionally disabled for production builds.

## Commands

```bash
pnpm install
pnpm dev:dashboard
pnpm check:dashboard
pnpm --filter @ptc-bale/dashboard-web test:e2e
```

Dashboard: `http://localhost:4173`

## Production controls

- memory cache with stale times, request deduplication, abort and safe retries;
- background refresh and query invalidation;
- URL-based server-compatible pagination, filters and sorting;
- versioned review mutation, duplicate-submit prevention and conflict handling;
- navigation warnings for unsaved review changes;
- local mock persistence only for synthetic review data;
- live session restoration through `/auth/me` with secure-cookie compatibility;
- no live access token persisted in browser storage by the cookie-backed provider;
- no credentials, tokens, evidence or media cached by the service worker;
- SPA fallback and security headers supplied for Azure Static Web Apps and compatible hosts;
- source maps disabled and CI scans for obvious secrets;
- direct RTSP URLs and camera credentials prohibited in browser code;
- responsive, keyboard-operable and WCAG-oriented screen behavior;
- unit, component, provider, route and Playwright workflow tests.

The approved source logo asset must replace the screenshot-derived placeholder before final external client deployment.
