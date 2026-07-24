# PTC Bale Inspection Dashboard

Production-oriented React/TypeScript frontend for the PTC Bale Inspection & Monitoring PoC.

## Delivery status

The frontend uses the same typed interfaces in both modes:

- **Mock mode:** fully functional synthetic provider for client review and frontend UAT.
- **Live mode:** configured application API without page or workflow rewrites.

It includes route-based screens, protected sessions, query caching, server-compatible pagination, filters, sorting, review mutations, exports, offline/failure handling, responsive layouts, accessibility controls, tests, security headers and CI quality gates.

Backend-dependent integrations remain separate: real authentication validation, authorized WebRTC/HLS camera URLs, persistent database/evidence APIs, AI-generated events and Azure synchronization.

## Routes

`/login`, `/overview`, `/live`, `/events`, `/events/:eventId`, `/health`, `/reports`

## Mock access

Users: `viewer`, `supervisor`, `admin`. Default local password: `PTC-Demo-2026!`. Override with `VITE_DEMO_PASSWORD`.

## Commands

```bash
pnpm install
pnpm dev:dashboard
pnpm check:dashboard
```

Dashboard: `http://localhost:4173`

## Production controls

- memory cache with stale times, deduplication, abort and safe retries;
- URL-based server-compatible pagination, filters and sorting;
- versioned review mutation and conflict handling;
- local mock persistence only for synthetic review data;
- no credentials, tokens, evidence or media cached by the service worker;
- SPA fallback and security headers supplied for Azure Static Web Apps and compatible hosts;
- source maps disabled and CI scans for obvious secrets;
- direct RTSP URLs and camera credentials are prohibited in browser code.

The approved source logo asset must replace the screenshot-derived placeholder before final client deployment.
