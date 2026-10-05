# Security Event Catalogue

This document defines the application-side security telemetry emitted by the PTC Bale Inspection platform for production collection. Records are newline-delimited JSON written to standard output. PTC may collect these records with its approved host agent/SIEM; the application does not depend on a specific SIEM vendor.

## Record contract

Every security record uses `recordType: security_event` and contains only sanitized fields:

- `timestamp` — UTC ISO-8601 event time;
- `eventType` — stable event identifier from the catalogue below;
- `severity` — `info`, `warning`, or `error`;
- `correlationId` — request correlation ID when available;
- `actorId` — internal application user ID when authenticated/known;
- `actorRole` — Viewer/Supervisor/Admin role when known;
- `targetId` — event/evidence/health identifier when applicable;
- `source` — emitting service (`ptc-platform-api` by default);
- `result` — `success`, `denied`, or `failure`;
- `reasonCode` — bounded machine-readable reason.

Undefined fields are omitted from JSON.

## Event catalogue

| Event | Severity | Meaning |
| --- | --- | --- |
| `auth.login.succeeded` | info | Local application authentication succeeded. |
| `auth.login.failed` | warning | Authentication failed or the login request was denied. |
| `auth.logout` | info | User logout completed. |
| `auth.session.expired` | warning | Presented session is expired or no longer valid by time policy. |
| `auth.session.revoked` | info/warning | Session was explicitly revoked, including logout revocation. |
| `auth.user.disabled` | warning | Session belongs to a disabled application user. |
| `auth.access.denied` | warning | Authenticated role is not authorized for the requested action. |
| `origin.denied` | warning | Mutating request Origin is outside the configured allow-list. |
| `rate_limit.triggered` | warning | Application request limiter rejected the request. |
| `ingestion.credential.invalid` | warning | Machine-ingestion bearer credential is missing/invalid. |
| `event.review.updated` | info | Supervisor/Admin completed an event review mutation. The authoritative before/after record remains in PostgreSQL `AuditLog`. |
| `evidence.metadata.accessed` | info | Protected evidence metadata was read. |
| `evidence.content.accessed` | info | Protected evidence content was delivered. |
| `report.generated` | info | Authenticated user generated a PDF report. |
| `export.generated` | info | Authenticated user generated a CSV export. |
| `operational.health.changed` | info/warning/error | Runtime-observed health state changed between successive machine health reports. |
| `operational.service.failure` | error | A security-relevant readiness/evidence/operations request exposed a server-side service failure. |

## Data minimization / prohibited fields

Security telemetry must never contain:

- passwords or password hashes;
- session cookies or bearer/session tokens;
- machine-ingestion token values;
- `DATABASE_URL` or PostgreSQL credentials;
- RTSP/RTSPS credentials or full private stream URLs;
- request bodies;
- raw image/video/evidence contents;
- unrestricted evidence filesystem paths;
- before/after review remarks or other business payloads.

The logger accepts only controlled identifiers, roles, reason codes, correlation IDs and event metadata. Unknown or unsafe free-form strings are dropped rather than serialized.

## Audit relationship

Console security events supplement, not replace, the existing transactional `AuditLog` table. Business review mutations remain transactionally recorded in PostgreSQL with their before/after state. The structured security event records only that the privileged action occurred, who performed it, the target ID and correlation ID.

## Collection / retention ownership

Codistan emits vendor-neutral NDJSON records. PTC owns:

- host log collection agent configuration;
- SIEM/SOC routing and alert rules;
- central retention period;
- enterprise timestamp/host enrichment;
- escalation and incident-management workflow.

Lack of a PTC SIEM collector does not block application-side security logging acceptance.
