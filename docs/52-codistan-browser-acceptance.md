# Codistan Browser Acceptance Runbook

Status: operational UAT runbook for the Codistan-hosted PTC Bale Inspection deployment.

This runbook does not replace `docs/51-current-release-and-control-state.md`. It defines the browser-level acceptance gate for a deployed Codistan UAT environment.

## Purpose

The deployment is not accepted merely because API health checks pass. Final staging/UAT acceptance must prove the user-visible application through real browsers against the deployed stack:

`Browser -> HTTPS/reverse proxy -> dashboard -> API -> PostgreSQL -> evidence/review/report flows`

## Required target

Use the actual Codistan staging/UAT URL through `PLAYWRIGHT_BASE_URL`.

Do not run the mutation tests against a PTC production dataset. Use the Codistan UAT environment and a controlled synthetic/staging event ID.

Default controlled event ID:

`EVT-2407-0253`

## Credentials

Store test passwords only in a protected local environment file or GitHub Secrets. Do not commit them or post them in GitHub issues, WhatsApp, or project documentation.

Supported local/runtime variables:

- `E2E_PASSWORD` for one shared seeded password; or
- `E2E_VIEWER_PASSWORD`
- `E2E_SUPERVISOR_PASSWORD`
- `E2E_ADMIN_PASSWORD`

Usernames default to `viewer`, `supervisor`, and `admin` and can be overridden with `E2E_VIEWER_USERNAME`, `E2E_SUPERVISOR_USERNAME`, and `E2E_ADMIN_USERNAME`.

GitHub Actions uses the corresponding protected `CODISTAN_E2E_*` secrets.

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

## One-command local certification

The repository contains a GitHub-runner-independent certification wrapper:

`scripts/certify-codistan-browser.sh`

The preferred execution is from the repository root using a protected local environment file:

```bash
pnpm certify:codistan-browser -- --env-file /secure/ptc-browser-cert.env
```

A template is provided at:

`scripts/browser-certification.env.example`

The same command can be run with an explicit URL while credentials are already exported in the shell:

```bash
pnpm certify:codistan-browser -- --url https://<codistan-uat-host>
```

For a first-time Linux machine that also needs Playwright OS packages installed, run the same certification command with:

```bash
pnpm certify:codistan-browser -- --env-file /secure/ptc-browser-cert.env --with-system-deps
```

That option may require root/sudo privileges because Playwright installs operating-system browser dependencies.

### What the command does

The wrapper performs the following in one controlled run:

1. validates Git, Node.js 20+, pnpm, curl, tar and SHA-256 tooling;
2. refuses to certify a dirty working tree so the result maps to an exact Git SHA;
3. validates that protected Viewer/Supervisor/Admin credentials are available without printing them;
4. installs repository dependencies from the committed pnpm lockfile unless explicitly skipped;
5. ensures Chromium and Firefox are installed unless explicitly skipped;
6. calls the deployed `/readyz` endpoint and requires `status=ready` plus `database=connected`;
7. runs the real deployed Playwright acceptance suite against `PLAYWRIGHT_BASE_URL`;
8. retains the Playwright HTML report and failure screenshots/videos/traces;
9. records the suite Git SHA, target URL, event ID, browser matrix and PASS/FAIL result;
10. creates a timestamped certification directory, SHA-256 manifest, compressed archive and archive checksum.

The local output is written under:

`runtime/browser-certification/`

That location is already excluded from Git by the repository's `runtime/` ignore rule.

A typical successful run ends by printing:

```text
Certification result: PASS
Suite commit: <git-sha>
Target: https://<codistan-uat-host>
Evidence directory: .../runtime/browser-certification/<timestamp>-<sha>
Evidence archive: .../runtime/browser-certification/<timestamp>-<sha>.tar.gz
Archive checksum: .../<timestamp>-<sha>.tar.gz.sha256
```

No credential values are intentionally written to the certification metadata.

### Optional execution switches

- `--event-id <ID>` — use a different controlled staging event.
- `--skip-install` — skip `pnpm install --frozen-lockfile` when dependencies are already prepared.
- `--skip-browser-install` — skip Playwright browser installation when browsers are already prepared.
- `--with-system-deps` — install Playwright OS browser dependencies too.

The strict default is deliberate: a dirty repository cannot produce a trustworthy commit-based certification record.

## Certification evidence

Every local one-command certification run produces, where applicable:

- `certification.txt` with PASS/FAIL and tested suite SHA;
- `readiness.json` from the deployed environment;
- dependency/browser-install logs;
- Playwright acceptance log;
- Playwright HTML report;
- screenshots, videos and traces retained by Playwright on failures;
- `manifest.sha256` for the certification directory;
- a `.tar.gz` evidence bundle;
- a SHA-256 checksum for that archive.

A failed browser acceptance run means the deployment is not accepted, even if lower-level API checks pass.

## GitHub Actions

Workflow:

`.github/workflows/codistan-browser-acceptance.yml`

Run it manually after Qamar deploys the selected commit, supplying the Codistan UAT base URL. It can also be called from a deployment workflow using `workflow_call` once the Codistan deployment pipeline is connected.

If GitHub-hosted runners are unavailable, use the one-command local certification above. The browser acceptance criteria remain the same; the runner location changes, not the test standard.

## Direct Playwright execution

For debugging only, the underlying suite can still be run directly from `apps/dashboard-web`:

```bash
PLAYWRIGHT_BASE_URL=https://<codistan-uat-host> \
E2E_PASSWORD='<protected-password>' \
E2E_EVENT_ID='EVT-2407-0253' \
pnpm test:e2e:acceptance
```

For formal local certification, prefer the root-level one-command wrapper because it also captures readiness, Git SHA, logs, manifest, archive and checksum.

## Deployment acceptance rule

A Codistan release may be described as browser-tested only when the deployed-environment Playwright suite passes against the intended deployment and the resulting workflow reference or local certification bundle is retained.

Server restart/recovery testing remains a controlled DevOps step: Qamar restarts the applicable services, then the same certification command is re-run to prove login, persisted review data, reports and protected navigation still work after restart.
