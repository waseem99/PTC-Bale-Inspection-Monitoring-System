# Shared Contracts

Versioned interfaces shared by the React dashboard, Node.js platform API and future Python edge services.

## Implemented

- `openapi/platform-api.yaml` — authentication, dashboard summary, cameras, health, paginated events, event detail, versioned review mutations, CSV exports and stable API errors.

## Contract rules

- Timestamps are ISO 8601 UTC values.
- Interactive roles are `viewer`, `supervisor` and `admin` for the PoC.
- Original AI outcome fields remain separate from human review fields.
- Event review uses optimistic concurrency through `expectedVersion`.
- The browser never receives RTSP credentials, MongoDB credentials or unrestricted local evidence paths.
- Synthetic records are for workflow validation and are not client acceptance evidence.

Future edge-ingestion, evidence-media and synchronization schemas will be added without changing the existing portal workflow contract unnecessarily.
