# Security Policy

## Supported release

Security fixes apply to the current production-readiness release path and the deployed release derived from `main`.

## Reporting a vulnerability

Do not open a public issue containing vulnerability details, credentials, camera/network information, factory imagery, evidence, database content or client-sensitive operational information.

Use GitHub private vulnerability reporting when enabled. Otherwise, contact the repository owner and Project Manager through the established private project channel and include only the minimum information required to reproduce the issue safely.

A useful report contains:

- affected release/commit;
- affected component and endpoint;
- impact and required privileges;
- safe reproduction steps using synthetic data;
- relevant sanitized logs and correlation IDs;
- proposed mitigation, when known.

Do not attach real factory footage, credentials, database dumps, restricted annotations/datasets or model binaries.

## Security boundaries

- Core operation remains local-first and must not require internet or cloud availability.
- Production secrets remain outside Git and are injected through approved runtime secret storage.
- Raw evidence and model/data artifacts remain outside GitHub.
- Machine ingestion uses a separately rotated service credential.
- User-facing mutations require an approved origin and server-side authorization.
- Operational failures and insufficient visibility must not become false process violations.
- No facial recognition, biometric identity or cross-camera personal identification is permitted.

## Disclosure and remediation

The repository owner, technical owner, DevOps owner and PM acceptance owner will classify severity, contain exposure, prepare a tested fix, document deployment/rollback impact and coordinate disclosure with the client where required.
