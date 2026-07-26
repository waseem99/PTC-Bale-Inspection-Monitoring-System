# Frontend Deployment Runbook

## Purpose

Deploy the PTC Bale Inspection dashboard as an isolated HTTPS development/demo portal without connecting production cameras, PTC operational records, evidence files, or final Azure resources.

The frontend is built once with either the mock or live provider. Vite environment values are compile-time settings, so changing the provider or API URL requires a new build; page and workflow code does not change.

## Approved deployment modes

### Static artifact

The `Frontend CI` workflow produces `ptc-dashboard-static-<commit>` after lint, type-check, unit tests, production build, and bundle scanning succeed. Deploy the artifact contents as the web root of an HTTPS static host that supports SPA fallback to `index.html`.

The repository includes `apps/dashboard-web/staticwebapp.config.json` for Azure Static Web Apps and `public/_headers` for compatible static hosts.

### Container

Build from the repository root:

```bash
docker build \
  --file apps/dashboard-web/Dockerfile \
  --build-arg VITE_DATA_MODE=mock \
  --build-arg 'VITE_ENVIRONMENT_NAME=Isolated Development Demo' \
  --build-arg VITE_BUILD_VERSION=$(git rev-parse --short HEAD) \
  --build-arg 'VITE_DEMO_PASSWORD=<demo-only-password>' \
  --build-arg VITE_ALLOW_DEMO_CREDENTIALS=false \
  --tag ptc-bale-dashboard:demo \
  .
```

Run locally or behind an HTTPS reverse proxy/load balancer:

```bash
docker run --detach \
  --name ptc-bale-dashboard \
  --restart unless-stopped \
  --publish 8080:8080 \
  ptc-bale-dashboard:demo
```

Health endpoint:

```text
GET /healthz
```

The included Nginx configuration supplies SPA fallback, cache controls, compression, CSP, anti-framing, content-type, referrer, permissions, and cross-origin isolation headers.

### Docker Compose

From `apps/dashboard-web/deploy`:

```bash
VITE_DEMO_PASSWORD='<demo-only-password>' \
DASHBOARD_BUILD_VERSION=$(git rev-parse --short HEAD) \
DASHBOARD_PORT=8080 \
docker compose --file docker-compose.demo.yml up --build --detach
```

## Demo configuration

Recommended isolated demo values:

```text
VITE_DATA_MODE=mock
VITE_ENVIRONMENT_NAME=Isolated Development Demo
VITE_BUILD_VERSION=<release-or-commit>
VITE_API_BASE_URL=/api
VITE_DEMO_PASSWORD=<demo-only-password>
VITE_ALLOW_DEMO_CREDENTIALS=false
VITE_MOCK_LATENCY_MS=250
VITE_MOCK_FAILURE_RATE=0
```

Demo users are `viewer`, `supervisor`, and `admin`. A production-mode mock build rejects login when neither `VITE_DEMO_PASSWORD` nor the explicit CI/demo-credential flag is configured.

`VITE_DEMO_PASSWORD` is compiled into the browser bundle and is therefore not a security boundary. It exists only to exercise the complete frontend sign-in and role workflow before the real authentication API is connected. Protect every shared demo with hosting-platform authentication, an access-controlled VPN, or an authenticated reverse proxy. Do not commit deployment tokens, hostname credentials, reverse-proxy secrets, or any real PTC password.

## HTTPS and network boundary

- Terminate TLS at the approved static host, ingress, application gateway, or reverse proxy.
- Do not expose the container directly to the internet without HTTPS and hosting-layer access controls.
- Restrict the demo hostname to the agreed client/reviewer audience.
- Keep the environment physically and logically separate from PTC cameras, edge hosts, databases, and evidence storage.
- Do not add camera usernames/passwords or direct RTSP URLs to frontend configuration.

## Deployment validation

Before sharing the URL:

1. Confirm `/healthz` returns HTTP 200.
2. Confirm the hosting-layer access restriction is enabled.
3. Open `/login`, sign in with each intended role, and confirm permissions.
4. Directly open `/overview`, `/live`, `/events`, an event-detail URL, `/health`, and `/reports` after authentication.
5. Refresh each route and confirm the SPA fallback works.
6. Confirm the environment label says `Isolated Development Demo` and the data state says mock/synthetic.
7. Confirm no PTC operational footage, live event records, credentials, production IPs, or restricted documents are present.
8. Run the checklist in `docs/24-frontend-uat-checklist.md` and attach the CI/build evidence to issue #67.

## Rollback

### Static host

Retain the previous successful artifact. Roll back by redeploying that artifact and verify the hosting health check, login, overview, and one event-detail route.

### Container host

Tag every approved image with an immutable commit or release value. Roll back by replacing the running image tag:

```bash
docker pull <registry>/ptc-bale-dashboard:<previous-version>
docker rm --force ptc-bale-dashboard
docker run --detach --name ptc-bale-dashboard --restart unless-stopped --publish 8080:8080 <registry>/ptc-bale-dashboard:<previous-version>
```

## Live API cutover

After the backend implements `docs/23-frontend-api-contract.md`, rebuild with:

```text
VITE_DATA_MODE=live
VITE_API_BASE_URL=<approved HTTPS API base URL>
VITE_ALLOW_DEMO_CREDENTIALS=false
```

Complete authentication, API contract, evidence authorization, camera-media gateway, security-header, browser, and UAT validation before calling the connected deployment production-ready.
