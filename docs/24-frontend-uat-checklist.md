# Frontend and Seeded PostgreSQL UAT and Release Checklist

## Purpose

This checklist is the release gate for the PTC Bale Inspection dashboard in both supported validation modes:

1. the fully functional frontend mock provider; and
2. the real Node.js API backed by deterministic local PostgreSQL records.

The dashboard/API/PostgreSQL checks must pass before the application slice is presented as field-deliverable. Camera streams, real evidence, Python edge ingestion and AI-generated events require an additional integration/UAT cycle and are not made complete by this checklist.

## Release identification

- [ ] Pull request and commit SHA recorded.
- [ ] Build version is visible in the portal.
- [ ] Environment label is correct.
- [ ] Data mode is clearly shown as mock or live.
- [ ] API build, PostgreSQL version and Prisma migration version are recorded for live mode.
- [ ] Supplied PTC visual reference has been converted into the approved scalable release asset.
- [ ] No screenshot-crop or temporary placeholder asset remains in the external release.

## Installation, database and security

- [ ] Production build completes without source maps.
- [ ] HTTPS is enabled for a shared deployment.
- [ ] Hosting-platform, VPN, reverse-proxy, or container authentication restricts a shared mock demo before the application login screen.
- [ ] Live mode uses the real server-side application login and HttpOnly session cookie.
- [ ] Unauthenticated requests to the shared portal/API are rejected while the approved health endpoints remain available.
- [ ] SPA route fallback works on direct links and refresh.
- [ ] CSP, frame-ancestors, referrer, content-type, permissions and opener headers are present on HTML and static responses.
- [ ] Production mock workflow password is supplied through deployment configuration and is not reused from any real account.
- [ ] PostgreSQL password, database URL and fixed-user passwords are supplied through ignored/protected configuration.
- [ ] PostgreSQL is not exposed directly to normal portal users or an unapproved network.
- [ ] Prisma migrations deploy successfully and migration status is clean.
- [ ] No real password, deployment token, RTSP URL, camera credential, production IP, private key, database string, database dump, or evidence file exists in the frontend bundle or repository.
- [ ] Reviewers understand that frontend mock credentials exercise UI roles only and are not a security boundary.
- [ ] Service worker does not cache `/api`, evidence or authenticated media.
- [ ] Browser storage contains only approved mock session/review data in mock mode.
- [ ] Live mode does not persist access tokens or PostgreSQL credentials in browser storage.

## Supported environment

Record the approved matrix before release:

| Item | Approved value | Result |
|---|---|---|
| Browser | Current Microsoft Edge / Chrome version approved by PTC | Pending |
| Primary resolution | Client-confirmed desktop resolution | Pending |
| Minimum width | Client-confirmed laptop width | Pending |
| Network | PTC local network / approved dev host | Pending |
| Time zone | Asia/Karachi | Pending |
| PostgreSQL | Approved local major version and persistent volume | Pending |
| Prisma migration | Approved migration identifier | Pending |

## Authentication and roles

### Viewer

- [ ] Valid viewer can sign in.
- [ ] Invalid credentials are rejected safely.
- [ ] Viewer can open overview, cameras, events, details, health and reports.
- [ ] Viewer cannot change review status or remarks.
- [ ] Session expiry returns the user to sign-in.
- [ ] Logout revokes the PostgreSQL session and clears protected cached data.

### Supervisor

- [ ] Valid supervisor can sign in.
- [ ] Supervisor can confirm an event.
- [ ] Supervisor can dismiss an event.
- [ ] Supervisor can enter remarks up to the approved limit.
- [ ] Duplicate review submissions are prevented.
- [ ] Version conflicts require refresh and do not overwrite another review.
- [ ] Saved mock review remains visible after refresh in mock mode.
- [ ] Saved live review remains visible after browser, API and PostgreSQL restart in live mode.
- [ ] Normal reseeding preserves the saved live review and event version.
- [ ] Review update and audit record are created atomically.
- [ ] Unsaved changes warn on internal navigation, browser history and page close.

### Administrator

- [ ] Valid administrator can sign in.
- [ ] Administrator has the approved PoC permissions only.
- [ ] No unapproved user-administration module is exposed.

## Overview

- [ ] Total, completed, violation and unreviewed values match the active provider response.
- [ ] Live-mode totals reconcile with persisted PostgreSQL event records.
- [ ] Camera cards show camera, zone, status and AI state.
- [ ] Recent-event links open the correct event.
- [ ] Loading, refresh, stale and failure states are understandable.
- [ ] One failed panel does not blank unrelated information.

## Live monitoring

- [ ] Four camera cards render at the approved resolution.
- [ ] Camera and AI states are distinct from process outcomes.
- [ ] Last-frame time, FPS, quality and event count are readable.
- [ ] Degraded and offline states are visible through text and iconography, not color alone.
- [ ] Mock/seeded placeholder feed label is visible until a real media gateway is connected.
- [ ] Future live mode uses authorized WebRTC/HLS references and never exposes RTSP credentials.

## Events

- [ ] Direct `/events` route works after refresh.
- [ ] Page size 10, 20, 50 and 100 works.
- [ ] Previous and next controls respect page boundaries.
- [ ] Total and visible range are correct.
- [ ] Camera, outcome, review, date and search filters combine correctly.
- [ ] Changing filters resets invalid pagination.
- [ ] Timestamp, camera, outcome, confidence and review sorting works.
- [ ] Filters, sorting and page survive refresh and direct-link sharing.
- [ ] Debounced search does not submit every keystroke.
- [ ] Loading, refreshing, stale, empty and failure states are distinct.
- [ ] Live-mode filter and pagination results reconcile with PostgreSQL queries.
- [ ] CSV export reflects the active approved filters.

## Event detail and evidence

- [ ] Direct event URL works after refresh.
- [ ] Event ID, camera, zone and timestamp are correct.
- [ ] PostgreSQL `TIMESTAMPTZ` values render correctly in `Asia/Karachi`.
- [ ] AI outcome and reason remain immutable in human review.
- [ ] Confidence, model version, rule version and record version are visible.
- [ ] SOP steps remain ordered and show complete, failed and unknown states clearly.
- [ ] Evidence pending and unavailable states render safely in the seeded slice.
- [ ] Missing evidence does not block metadata review.
- [ ] Future real evidence access is authorized and does not expose local paths.

## System health

- [ ] Local edge, AI, GPU, PostgreSQL, storage and Azure synchronization are displayed separately.
- [ ] `/api/readyz` reports `databaseEngine: postgresql` and connected status.
- [ ] Health data shows last checked time.
- [ ] Warning and critical states remain readable at 200% zoom.
- [ ] Local operation is not represented as dependent on Azure.

## Reports

- [ ] Date validation prevents an invalid range.
- [ ] Camera, outcome and review filters are applied.
- [ ] CSV is downloadable and opens correctly.
- [ ] CSV rows reconcile with persisted PostgreSQL records.
- [ ] CSV excludes evidence files and database/internal fields.
- [ ] Print/PDF layout excludes navigation and hidden controls.
- [ ] Export failure preserves the selected criteria.

## PostgreSQL persistence and recovery

- [ ] Clean PostgreSQL database initializes using committed migrations.
- [ ] Seed status reports exactly 3 users, 4 cameras, 6 health metrics and 257 events.
- [ ] API restart preserves events, reviews and audits.
- [ ] PostgreSQL restart with the persistent volume preserves events, reviews and audits.
- [ ] Stale review returns `409 VERSION_CONFLICT` without overwrite.
- [ ] `pg_dump` creates a protected usable backup.
- [ ] `pg_restore` into a controlled database reconciles event totals, one reviewed event and its audit record.
- [ ] Destructive synthetic reset is blocked in production code.
- [ ] No MongoDB/Mongoose service, volume, dependency or runtime remains.

## Resilience

- [ ] Browser offline banner appears when connectivity is lost.
- [ ] Cached non-sensitive screen data remains readable where available.
- [ ] Mutations remain blocked or fail safely while offline.
- [ ] Reconnection allows refresh without a full application reset.
- [ ] Timeout and transient server/database errors provide retry actions.
- [ ] A session `401` clears access and returns to sign-in.
- [ ] Background refresh does not interrupt active review input.
- [ ] PostgreSQL outage makes readiness fail without acknowledging uncommitted future edge events.

## Accessibility and interaction

- [ ] Skip link reaches main content.
- [ ] All primary workflows are keyboard operable.
- [ ] Visible focus is present on links, buttons and fields.
- [ ] Form labels and error messages are announced correctly.
- [ ] Core screens pass automated WCAG A/AA smoke checks with no critical violation.
- [ ] Core screens remain usable at 200% zoom.
- [ ] Reduced-motion preference is respected.
- [ ] Status information does not depend on color alone.

## Performance and browser behavior

- [ ] Route-level code splitting is present.
- [ ] Production bundle stays within the approved size budget.
- [ ] Event table does not render the entire dataset.
- [ ] Pagination and filtering remain responsive at the agreed test volume.
- [ ] PostgreSQL query/index performance is recorded for common filter combinations.
- [ ] Timers, object URLs, subscriptions and media elements are cleaned up.
- [ ] No repeated console error occurs during a complete supervisor workflow.

## Automated quality gates

- [ ] Reviewed `pnpm-lock.yaml` is committed and frozen installation succeeds.
- [ ] Prisma Client generation passes.
- [ ] Prisma migration deploy passes against clean PostgreSQL.
- [ ] ESLint passes.
- [ ] Strict TypeScript check passes.
- [ ] Frontend unit, component, provider and query-cache tests pass.
- [ ] Jest/Supertest/PostgreSQL integration tests pass.
- [ ] Production frontend and API builds pass.
- [ ] Production bundle/output security scans pass.
- [ ] Static deployment artifact is generated.
- [ ] Dashboard and API containers build successfully.
- [ ] Container `/healthz`, `/readyz`, SPA fallback, proxy and security-header smoke tests pass.
- [ ] Playwright supervisor workflow passes against mock mode.
- [ ] Playwright supervisor workflow passes against the seeded PostgreSQL live stack.
- [ ] Automated accessibility checks pass.
- [ ] CI/self-hosted run URL and artifacts are attached to the release record.

## Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Technical reviewer |  | Pending |  |
| Project Manager |  | Pending |  |
| Client representative |  | Pending |  |

The application slice is not approved for field deployment until all release-blocking frontend, API, PostgreSQL and security items are complete or formally accepted as documented deviations. Camera, AI and real-evidence acceptance remains a separate later gate.
