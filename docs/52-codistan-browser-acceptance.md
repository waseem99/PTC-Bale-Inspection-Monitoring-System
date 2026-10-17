# Codistan Browser Acceptance Runbook

Status: operational UAT runbook for the Codistan-hosted PTC Bale Inspection deployment.

This runbook does not replace `docs/51-current-release-and-control-state.md`. It defines the browser-level acceptance gate for a deployed Codistan UAT environment.

## Purpose

The deployment is not accepted merely because API health checks pass. Final staging/UAT acceptance must prove the user-visible application through real browsers against the deployed stack:

`Browser -> HTTPS/reverse proxy -> dashboard -> API -> PostgreSQL -> evidence/review/report flows`

## Required target

Use the actual Codistan staging/UAT URL through `PLAYWRIGHT_BASE_URL`.

Do not run the mutation tests against a PTC production dataset. Use the Codistan UAT environment and a controlled synthetic/staging event ID.

Default controlled event ID used by the workflow:

`EVT-2407-0253`

Override it with the workflow `event_id` input when needed.

## Credentials

Store test passwords only in GitHub Secrets or the protected CI environment. Do not commit them or post them in GitHub issues.

Supported secrets:

- `CODISTAN_E2E_PASSWORD` for one shared seeded password; or
- `CODISTAN_E2E_VIEWER_PASSWORD`
- `CODISTAN_E2E_SUPERVISOR_PASSWORD`
- `CODISTAN_E2E_ADMIN_PASSWORD`

Usernames default to `viewer`, `supervisor`, and `admin` and can be overridden locally with `E2E_VIEWER_USERNAME`, `E2E_SUPERVISOR_USERNAME`, and `E2E_ADMIN_USERNAME`.

## Browser matrix

The Playwright configuration executes:

- Chromium at 1366x768
- Firefox at 1920x1080

External/deployed acceptance runs serially to avoid concurrent review mutations against the same controlled event.

## Browser acceptance coverage

The deployed suite verifies:

1. `/readyz` is genuinely ready and PostgreSQL is connected.
2. Invalid credentials fail cleanly.
3. Protected routes redirect unauthenticated users.
4. Viewer, Supervisor, and Admin can authenticate through the real deployed browser flow.
5. Authenticated sessions survive page reload.
6. Viewer review controls remain read-only.
7. Supervisor can navigate Overview, Live Monitoring, Events, search/filter/sort, open event detail, and use browser back/forward history.
8. Supervisor review/remarks persist after reload and a fresh login.
9. Evidence/audit sections render without exposing filesystem, PostgreSQL, or RTSP paths.
10. CSV and PDF report downloads complete and produce non-empty files.
11. Logout removes access to protected screens.
12. Core screens have no critical WCAG A/AA accessibility violations.
13. Normal acceptance flows do not produce unexpected browser console errors, page errors, failed document/XHR/fetch requests, or HTTP 5xx responses.

## Failure evidence

On failure the workflow retains:

- Playwright HTML report
- screenshots
- browser video
- Playwright trace
- browser acceptance log
- `/readyz` response
- tested commit SHA
- target URL
- workflow run reference

A failed browser acceptance run means the deployment is not accepted, even if lower-level API checks pass.

## GitHub Actions

Workflow:

`.github/workflows/codistan-browser-acceptance.yml`

Run it manually after Qamar deploys the selected commit, supplying the Codistan UAT base URL. It can also be called from a deployment workflow using `workflow_call` once the Codistan deployment pipeline is connected.

## Local/manual execution

From `apps/dashboard-web`:

```bash
PLAYWRIGHT_BASE_URL=https://<codistan-uat-host> \
E2E_PASSWORD='<protected-password>' \
E2E_EVENT_ID='EVT-2407-0253' \
pnpm test:e2e:acceptance
```

If the three roles do not share one password, use the role-specific password variables instead.

## Deployment acceptance rule

A Codistan release may be described as browser-tested only when the deployed-environment Playwright suite passes against the exact deployed commit and the resulting workflow/artifact reference is retained.

Server restart/recovery testing remains a controlled DevOps step: Qamar restarts the applicable services, then the same browser acceptance suite is re-run to prove login, persisted review data, reports, and protected navigation still work after restart.
