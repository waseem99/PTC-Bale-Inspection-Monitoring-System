# Frontend UAT and Release Checklist

## Purpose

This checklist is the final field-delivery gate for the PTC Bale Inspection dashboard. It applies to the fully functional mock-provider build and must be repeated after the live API and media gateway are connected.

## Release identification

- [ ] Pull request and commit SHA recorded.
- [ ] Build version is visible in the portal.
- [ ] Environment label is correct.
- [ ] Data mode is clearly shown as mock or live.
- [ ] Supplied PTC visual reference has been converted into the approved scalable release asset.
- [ ] No screenshot-crop or temporary placeholder asset remains in the external release.

## Installation and security

- [ ] Production build completes without source maps.
- [ ] HTTPS is enabled.
- [ ] Hosting-platform, VPN, reverse-proxy, or container Basic Authentication restricts the shared demo before the application login screen.
- [ ] Unauthenticated requests to the shared portal are rejected while `/healthz` remains available to the approved health monitor.
- [ ] SPA route fallback works on direct links and refresh.
- [ ] CSP, frame-ancestors, referrer, content-type, permissions and opener headers are present on HTML and static responses.
- [ ] Production mock workflow password is supplied through deployment configuration and is not reused from any real account.
- [ ] No real password, deployment token, RTSP URL, camera credential, production IP, private key, database string, or evidence file exists in the bundle.
- [ ] Reviewers understand that frontend mock credentials exercise UI roles only and are not a security boundary.
- [ ] Service worker does not cache `/api`, evidence or authenticated media.
- [ ] Browser storage contains only approved mock session/review data in mock mode.
- [ ] Live mode does not persist access tokens in browser storage when secure-cookie authentication is used.

## Supported environment

Record the approved matrix before release:

| Item | Approved value | Result |
|---|---|---|
| Browser | Current Microsoft Edge / Chrome version approved by PTC | Pending |
| Primary resolution | Client-confirmed desktop resolution | Pending |
| Minimum width | Client-confirmed laptop width | Pending |
| Network | PTC local network / approved dev host | Pending |
| Time zone | Asia/Karachi | Pending |

## Authentication and roles

### Viewer

- [ ] Valid viewer can sign in.
- [ ] Invalid credentials are rejected safely.
- [ ] Viewer can open overview, cameras, events, details, health and reports.
- [ ] Viewer cannot change review status or remarks.
- [ ] Session expiry returns the user to sign-in.
- [ ] Logout clears the session and protected cached data.

### Supervisor

- [ ] Valid supervisor can sign in.
- [ ] Supervisor can confirm an event.
- [ ] Supervisor can dismiss an event.
- [ ] Supervisor can enter remarks up to the approved limit.
- [ ] Duplicate review submissions are prevented.
- [ ] Version conflicts require refresh and do not overwrite another review.
- [ ] Saved mock review remains visible after refresh.
- [ ] Unsaved changes warn on internal navigation, browser history and page close.

### Administrator

- [ ] Valid administrator can sign in.
- [ ] Administrator has the approved PoC permissions only.
- [ ] No unapproved user-administration module is exposed.

## Overview

- [ ] Total, completed, violation and unreviewed values match the active provider response.
- [ ] Camera cards show camera, zone, status and AI state.
- [ ] Recent-event links open the correct event.
- [ ] Loading, refresh, stale and failure states are understandable.
- [ ] One failed panel does not blank unrelated information.

## Live monitoring

- [ ] Four camera cards render at the approved resolution.
- [ ] Camera and AI states are distinct from process outcomes.
- [ ] Last-frame time, FPS, quality and event count are readable.
- [ ] Degraded and offline states are visible through text and iconography, not color alone.
- [ ] Mock feed label is visible in mock mode.
- [ ] Live mode uses authorized WebRTC/HLS references and never exposes RTSP credentials.

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
- [ ] CSV export reflects the active approved filters.

## Event detail and evidence

- [ ] Direct event URL works after refresh.
- [ ] Event ID, camera, zone and timestamp are correct.
- [ ] AI outcome and reason remain immutable in human review.
- [ ] Confidence, model version and rule version are visible.
- [ ] SOP steps show complete, failed and unknown states clearly.
- [ ] Evidence available and unavailable states both render safely.
- [ ] Missing evidence does not block metadata review.
- [ ] Real evidence access is authorized and does not expose local paths.

## System health

- [ ] Local edge, AI, GPU, database, storage and Azure synchronization are displayed separately.
- [ ] Health data shows last checked time.
- [ ] Warning and critical states remain readable at 200% zoom.
- [ ] Local operation is not represented as dependent on Azure.

## Reports

- [ ] Date validation prevents an invalid range.
- [ ] Camera, outcome and review filters are applied.
- [ ] CSV is downloadable and opens correctly.
- [ ] CSV excludes evidence files.
- [ ] Print/PDF layout excludes navigation and hidden controls.
- [ ] Export failure preserves the selected criteria.

## Resilience

- [ ] Browser offline banner appears when connectivity is lost.
- [ ] Cached non-sensitive screen data remains readable where available.
- [ ] Mutations remain blocked or fail safely while offline.
- [ ] Reconnection allows refresh without a full application reset.
- [ ] Timeout and transient server errors provide retry actions.
- [ ] A session `401` clears access and returns to sign-in.
- [ ] Background refresh does not interrupt active review input.

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
- [ ] Timers, object URLs, subscriptions and media elements are cleaned up.
- [ ] No repeated console error occurs during a complete supervisor workflow.

## Automated quality gates

- [ ] Dependency installation succeeds from a clean environment.
- [ ] ESLint passes.
- [ ] Strict TypeScript check passes.
- [ ] Unit and component tests pass.
- [ ] Provider and query-cache tests pass.
- [ ] Production build passes.
- [ ] Production bundle security scan passes.
- [ ] Static deployment artifact is generated.
- [ ] Deployment container builds successfully.
- [ ] Container `/healthz`, SPA fallback, and security-header smoke tests pass.
- [ ] Playwright supervisor workflow passes.
- [ ] Automated accessibility checks pass.
- [ ] CI run URL and artifacts are attached to the release record.

## Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Technical reviewer |  | Pending |  |
| Project Manager |  | Pending |  |
| Client representative |  | Pending |  |

The frontend is not approved for field deployment until all release-blocking items are complete or formally accepted as documented deviations.
