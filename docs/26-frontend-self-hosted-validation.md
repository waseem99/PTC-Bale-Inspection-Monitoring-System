# Frontend Self-hosted Validation Fallback

## Purpose

Use a dedicated self-hosted GitHub Actions runner when GitHub-hosted private-repository jobs cannot start because of account quota, billing, policy, or hosted-runner provisioning.

This is a validation fallback only. It does not replace branch protection, technical review, protected demo deployment, or client UAT.

## Runner requirements

Use a dedicated Linux x64 machine or disposable VM with:

- at least 4 CPU cores, 8 GB RAM, and 25 GB free disk;
- Docker Engine with permission for the runner service account;
- outbound HTTPS access to GitHub, the npm registry, Playwright browser downloads, and container registries;
- no PTC production footage, camera credentials, evidence, production database copy, or deployment secrets;
- an operating-system account used only for this runner;
- current security updates and endpoint protection appropriate to Codistan policy.

Do not register a personal workstation that also stores client credentials or restricted project data.

## Registration

1. Open repository **Settings → Actions → Runners**.
2. Select **New self-hosted runner** and choose Linux x64.
3. Follow GitHub's generated commands on the dedicated machine. Registration tokens are short-lived and must not be copied into Git, issues, chat, or documentation.
4. Add the custom runner label `ptc-dashboard`.
5. Configure the runner as a service and confirm it appears online with labels `self-hosted`, `linux`, `x64`, and `ptc-dashboard`.

## Execute the gate

Run the manual workflow **Frontend CI — Self-hosted Fallback** and select:

- `ref`: `feature/44-dashboard-v1` or the exact candidate commit;
- `run_e2e`: enabled.

The workflow performs:

- dependency installation;
- ESLint;
- strict TypeScript checking;
- unit, provider, cache, routing and component tests;
- production mock build and bundle scan;
- deployment-container build;
- `/healthz`, SPA fallback and security-header smoke tests;
- Playwright supervisor workflows and axe accessibility checks;
- static portal and browser-report artifact upload.

## Pass criteria

- every workflow step succeeds;
- static portal and Playwright report artifacts are present;
- no source maps or secret-pattern findings are reported;
- the container health, direct-route fallback and security headers pass;
- the exact run URL and commit are recorded on issue #67 and PR #62.

After a successful run, deploy the protected HTTPS demo under #61 and complete `docs/24-frontend-uat-checklist.md`.

## Cleanup

For a temporary runner:

1. Remove the runner from repository settings.
2. Stop and delete the runner VM or securely remove its work directory.
3. Remove validation containers and images.
4. Confirm no repository token, npm cache containing private packages, build artifact, demo credential, or browser report remains outside the approved evidence location.
