# Frontend Production Readiness

## Objective

Deliver a frontend that is operationally complete before backend integration. Mock mode and live mode use the same routes, components, query behavior and domain contracts; only the provider changes.

## Implemented controls

### Architecture

- route-based screens with direct-link support;
- lazy-loaded pages;
- protected authentication boundary;
- centralized runtime configuration;
- typed API and domain interfaces;
- runtime checks on critical session and event payloads;
- application and route-level failure handling.

### Data UX

- in-memory query cache with stale times;
- request deduplication;
- background refresh;
- abortable requests and timeouts;
- retry policy limited to safe retryable GET failures;
- server-compatible pagination, filtering and sorting;
- URL-preserved query state;
- debounced search;
- data freshness indicators;
- loading, empty, stale, offline and error states.

### Mutations

- role-based review access;
- pending-state control and duplicate-submit prevention;
- persisted synthetic review changes in mock mode;
- record-version conflict handling;
- user remarks and dirty-form navigation warning;
- query invalidation after successful review.

### Accessibility and responsiveness

- semantic landmarks and navigation;
- skip link;
- visible focus indicators;
- keyboard-operable forms, tables and navigation;
- status text in addition to color;
- large supervisor-friendly typography;
- responsive desktop, laptop and narrow-screen layouts;
- reduced-motion support;
- print styles.

### Security and release

- no camera credentials or direct RTSP URLs in browser code;
- no production footage or evidence in Git;
- service worker excludes APIs and evidence;
- security-header configurations supplied;
- source maps disabled;
- exact dependency versions;
- automated lint, type-check, unit, build and browser tests;
- build scan for common secrets;
- visible build version and environment.

## Backend integration boundary

The connected backend must implement the same contracts for:

- login and current session;
- KPI summary;
- cameras and health;
- paginated event list;
- event detail;
- versioned event review mutation;
- filtered CSV export.

Actual media is delivered through the authorized local stream/evidence gateway rather than raw API JSON or exposed camera URLs.
