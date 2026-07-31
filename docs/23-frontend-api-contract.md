# Frontend API Contract

## Purpose and status

The production frontend supports both a fully functional mock provider and the implemented live Node.js/Express API backed by local PostgreSQL/Prisma. Both providers use the same interfaces and response shapes so the application switches through environment configuration only.

The first persisted vertical slice is implemented for authentication, dashboard summary, cameras, health, events, review and CSV export. Objective CI/container/browser validation remains required before release. Camera media, real evidence, Python edge ingestion, AI-generated outcomes, Socket.IO and approved Azure synchronization remain separate contracts/integrations.

Machine-readable source: `packages/contracts/openapi/platform-api.yaml`.

## General requirements

- Base URL is configured through `VITE_API_BASE_URL`.
- JSON endpoints return `Content-Type: application/json`.
- The preferred local/live authentication mechanism is a secure, `HttpOnly`, `SameSite` session cookie. A bearer-token or Microsoft Entra adapter may be used where approved.
- The frontend sends `credentials: same-origin` on live application requests.
- Requests include `X-Correlation-ID`; responses return the same or a server-generated correlation ID.
- Timestamps are ISO 8601 UTC values. PostgreSQL stores operational timestamps as `TIMESTAMPTZ(3)` and the frontend renders them in `Asia/Karachi`.
- Error responses use a stable `code`, user-safe `message`, `correlationId`, and optional `details` object.
- A `401` from an authenticated endpoint clears the active frontend session and returns the user to sign-in.
- API responses are runtime-validated before they enter the dashboard state layer.
- The browser never receives PostgreSQL credentials, RTSP credentials, unrestricted evidence paths or database backup locations.

## Authentication

### `POST /auth/login`

Request:

```json
{
  "username": "supervisor",
  "password": "secret"
}
```

Response:

```json
{
  "token": "",
  "expiresAt": "2026-07-24T20:00:00Z",
  "user": {
    "id": "usr-supervisor",
    "username": "supervisor",
    "displayName": "Supervisor Demo",
    "role": "supervisor"
  }
}
```

For cookie-backed sessions, `token` is an empty string and the response sets the HttpOnly session cookie. For an approved bearer-token adapter, `token` may contain the opaque access token. Supported roles are `viewer`, `supervisor`, and `admin`.

### `GET /auth/me`

Restores and validates the current server-side session. This endpoint enables browser refresh and direct-route access without storing a live access token in browser storage.

### `POST /auth/logout`

Revokes the PostgreSQL session row and clears the authentication cookie. The frontend also clears its local query cache and session state even where server revocation is temporarily unavailable.

## Dashboard summary

### `GET /dashboard/summary`

Returns `total`, `completed`, `violations`, `unresolved`, `unreviewed`, `completedRate`, `periodLabel`, and `generatedAt`, derived from persisted PostgreSQL event records.

## Cameras

### `GET /cameras`

Each camera includes `id`, `name`, `zone`, `status`, `aiStatus`, `lastFrameAt`, `fps`, `streamQuality`, and `todayEvents`.

The browser must not receive RTSP usernames or passwords. Authorized WebRTC/HLS references will be exposed through a separate media-gateway contract.

## Health

### `GET /health`

Returns local edge, AI runtime, GPU, PostgreSQL, storage, and optional Azure synchronization metrics. Each item includes `id`, `label`, `value`, `detail`, `state`, and `checkedAt`.

Operational database readiness is exposed separately by `GET /readyz` and reports `databaseEngine: postgresql`.

## Events

### `GET /events`

Supported query parameters:

- `page`
- `pageSize`
- `cameraId`
- `outcome`
- `reviewStatus`
- `search`
- `sortBy`
- `sortDirection`
- `from`
- `to`

The response contains `items`, `page`, `pageSize`, `total`, `totalPages`, `hasNextPage`, `hasPreviousPage`, and `generatedAt`.

Each event contains camera/zone details, timestamp, automated outcome/reason/confidence, review state, evidence availability, remarks/audit fields, model/rule versions, a concurrency `version`, and ordered observed workflow steps.

### `GET /events/:eventId`

Returns one event with the same shape.

### `PATCH /events/:eventId/review`

Request:

```json
{
  "reviewStatus": "confirmed",
  "remarks": "Reviewed by shift supervisor.",
  "expectedVersion": 2
}
```

The API rejects stale updates with HTTP `409` and code `VERSION_CONFLICT`. Successful responses return the updated event and increment `version`. Only `supervisor` and `admin` may change a review. The event update and audit-row creation occur in one PostgreSQL transaction. Original automated outcome fields are not modified by this route.

## Export

### `POST /exports/events`

Accepts date, camera, outcome, and review filters plus `format: csv`. Returns a bounded CSV file generated from PostgreSQL records. Evidence images and clips are excluded from CSV exports.

## HTTP behavior

- `400`: invalid filter or payload
- `401`: unauthenticated or expired session
- `403`: role does not permit operation
- `404`: event not found
- `409`: optimistic concurrency conflict
- `429`: rate limited
- `5xx`: transient server or database failure

GET requests may be retried by the frontend for network, timeout, `429`, and `5xx` failures. Mutations are never automatically retried.
