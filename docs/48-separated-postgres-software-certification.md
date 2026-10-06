# Separated PostgreSQL Software Certification

Status: software compatibility certification for #144. This document does **not** claim that a real PTC PostgreSQL VM/server, storage appliance, firewall rule or backup target has been provisioned.

## Certified software boundary

The CI certification uses this topology:

`API runtime container -> isolated Docker network -> PostgreSQL container`

PostgreSQL has **no host-published port**. The application receives a `DATABASE_URL` whose host is the dedicated database service/container name, not `localhost`, `127.0.0.1`, or the application container. Evidence is written to an external bind-mounted path supplied through `EVIDENCE_ROOT` and survives API container replacement.

The certification gate is `.github/workflows/separated-postgres-certification.yml`, implemented by `scripts/security/certify-separated-postgres.sh`.

## What CI proves

- Prisma migrations deploy successfully through a network/container boundary.
- The API starts and `/readyz` reports PostgreSQL connected.
- `/readyz` reports `503 / disconnected` when the database service is stopped and returns to ready after database recovery.
- Local PoC login and server-side session persistence work against the separated database.
- Machine event ingestion persists through the separated database connection.
- Supervisor review succeeds and a corresponding `AuditLog` record is persisted.
- Report summary and PDF generation work from the separated database.
- Evidence binary content is written under the external `EVIDENCE_ROOT`, while PostgreSQL stores evidence metadata/reference fields.
- Evidence remains readable after the API container is replaced using the same external evidence mount.
- The database container is not published to a browser/user host port.
- A hostile database credential canary is rejected from API logs/responses/certification artifacts and the built frontend output.

## Production configuration matrix

No real production values belong in this document or in Git.

| Variable | Component | Required | Secret? | Owner / source | Purpose |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Platform API / migrations / backup tooling | Yes | **Yes** | PTC infrastructure supplies; Codistan consumes | PostgreSQL endpoint. May point to a separate server/VM; no same-host requirement. |
| `EVIDENCE_ROOT` | Platform API | Yes for production evidence | No, but restricted path | PTC/Codistan deployment | External evidence filesystem/mount root. |
| `MAX_EVIDENCE_BYTES` | Platform API | Yes | No | Codistan | Evidence upload limit. |
| `NODE_ENV` | Platform API | Yes | No | Codistan deployment | Enables production safeguards. |
| `PORT` | Platform API | Optional/defaulted | No | Codistan deployment | Internal API listener. |
| `SESSION_COOKIE_NAME` | Platform API | Optional/defaulted | No | Codistan | Session cookie name. |
| `SESSION_TTL_HOURS` | Platform API | Yes for approved policy | No | Codistan/PTC approval | Rolling session lifetime ceiling. |
| `SESSION_ABSOLUTE_TTL_HOURS` | Platform API | Yes for approved policy | No | Codistan/PTC approval | Absolute session lifetime ceiling. |
| `COOKIE_SECURE` | Platform API | **Explicit in production** | No | Deployment | Must be `true` behind HTTPS; local isolated HTTP certification sets it explicitly to `false`. |
| `ALLOWED_ORIGINS` | Platform API | Yes | No | PTC/Codistan deployment | Approved browser origins only. |
| `TRUST_PROXY` | Platform API | Yes for proxied deployments | No | Deployment | Controls Express proxy trust. |
| `INGESTION_SERVICE_TOKEN` | Edge + Platform API | Yes for machine ingestion | **Yes** | Codistan generates; protected by deployment owner | Authenticates AI/edge ingestion. |
| `AUTH_MODE` | Platform API | Yes/default `local` | No | PTC/Codistan | `local` for PoC; `oidc` only when PTC IAM is activated. |
| `OIDC_ISSUER` | Platform API | Conditional | No | PTC IAM | Enterprise identity issuer. |
| `OIDC_CLIENT_ID` | Platform API | Conditional | Restricted identifier | PTC IAM | Registered application identifier. |
| `OIDC_CALLBACK_URL` | Platform API | Conditional | No | PTC IAM/Codistan | Approved OIDC callback URL. |
| `OIDC_AUDIENCE` | Platform API | Conditional | No | PTC IAM | Expected token audience. |
| `OIDC_*_GROUPS` | Platform API | Conditional | Restricted config | PTC IAM | Maps PTC groups to Viewer/Supervisor/Admin. |
| `BUILD_VERSION` | Platform API | Yes for release | No | Codistan CI/release | Release identity. |
| `BUILD_COMMIT` | Platform API | Yes for release | No | Codistan CI/release | Source commit identity. |
| `SCHEMA_VERSION` | Platform API / edge contract | Yes | No | Codistan | Runtime/contract schema identity. |
| `SIMULATOR_ENABLED` | Platform API | Yes | No | Codistan | Must remain `false` in production. |
| `PTC_RUNTIME_MODE` | Edge runtime | Yes | No | Deployment | Production default is `hardware-ready`; simulator requires explicit UAT/CI opt-in. |
| `EDGE_SPOOL_DATABASE` | Edge runtime | Yes | Restricted path | Codistan deployment | Local offline spool database path. |
| `API_ORIGIN` | Edge runtime | Yes | No | Deployment | Internal platform API origin. |
| `EDGE_FLUSH_INTERVAL_SECONDS` | Edge runtime | Optional | No | Codistan | Offline queue flush interval. |
| `EDGE_HTTP_TIMEOUT_SECONDS` | Edge runtime | Optional | No | Codistan | API timeout for edge delivery. |
| `VITE_DATA_MODE` | Dashboard build | Yes | No | Codistan | Selects live/mock data provider. |
| `VITE_API_BASE_URL` | Dashboard build | Yes | No | Codistan | Approved same-origin/proxy API path. Never contains DB credentials. |
| `VITE_CAMERA_PREVIEW_MODE` | Dashboard build | Optional | No | Codistan | Public preview selector only (`drive`/`local`). Real camera URLs stay outside browser configuration. |

## Explicitly not certified here

- a real PTC PostgreSQL VM/server;
- PTC routing/firewall/ACLs between final hosts;
- production backup retention infrastructure;
- PostgreSQL replication or automatic failover;
- storage appliance availability/HA;
- enterprise secrets-manager deployment.

Those are deployment/infrastructure inputs, not unfinished application development.

## Closure position

Passing this CI gate means the **software-certification portion of #144 is complete**: the application is proven compatible with a PostgreSQL endpoint and evidence path separated from the application runtime, with no browser dependency on the database and no detected DB credential leakage.

Final PTC hostnames, credentials, storage paths and network rules are inserted only during deployment and may be recorded as PTC-owned production dependencies without reopening the software scope.
