# Data and Event Model

## Data classes

### Restricted video data

- live camera streams;
- raw footage collected for training;
- annotated frames;
- event snapshots and clips;
- site images and camera layouts.

These artifacts must not be committed to GitHub and are not stored inside PostgreSQL.

### Application metadata

- camera records;
- event timestamps and types;
- track/session identifiers;
- reason codes and confidence values;
- evidence object references;
- review status and remarks;
- system health and synchronization status;
- model, rule, and configuration versions.

## Proposed edge event contract

```json
{
  "schemaVersion": "1.0",
  "eventId": "uuid",
  "eventType": "inspection.incomplete",
  "occurredAtUtc": "2026-07-23T10:15:30Z",
  "cameraId": "CAM-01",
  "inspectionSessionId": "uuid",
  "temporaryBaleTrackId": "CAM-01:track-481",
  "outcome": "violation",
  "reasonCode": "REQUIRED_ACTION_NOT_OBSERVED",
  "confidence": 0.91,
  "modelVersion": "detector-1.0.0",
  "ruleVersion": "sop-1.0.0",
  "configurationVersion": "cam01-config-3",
  "evidence": {
    "snapshotLocalReference": "restricted-local-reference",
    "clipLocalReference": "restricted-local-reference",
    "snapshotBlobPath": null,
    "clipBlobPath": null,
    "clipStartUtc": "2026-07-23T10:15:25Z",
    "clipEndUtc": "2026-07-23T10:15:35Z"
  },
  "sync": {
    "status": "pending",
    "attemptCount": 0,
    "lastAttemptAtUtc": null
  }
}
```

The edge-ingestion schema will be implemented through versioned JSON Schema/OpenAPI contracts and reviewed before issue #37 is developed.

## PostgreSQL persistence design

The operational metadata store is local **PostgreSQL**. Prisma supplies type-safe application access and committed SQL migrations. API boundary validation remains independent through Zod and shared OpenAPI/JSON Schema contracts.

The initial implemented relational schema is in `apps/platform-api/prisma/schema.prisma`.

### `users`

- `id` — stable internal identifier;
- `username` — unique login name;
- `displayName`;
- `role` — viewer, supervisor or admin;
- `passwordHash`;
- `enabled`;
- `dataset` marker;
- created/updated timestamps.

Indexes and constraints:

- primary key on `id`;
- unique `username`;
- index on `dataset`.

### `sessions`

- UUID `id`;
- unique SHA-256 `tokenHash`;
- `userId` foreign key;
- `expiresAt`;
- `lastSeenAt`;
- optional `revokedAt`;
- created/updated timestamps.

Indexes and constraints:

- cascade delete when a user is removed;
- unique token hash;
- indexes on user, expiry and active-session lookup fields.

PostgreSQL does not use MongoDB-style TTL indexes. Expired sessions are rejected by every authenticated request and may be removed by a controlled cleanup task after retention is approved.

### `cameras`

- `id`;
- name and zone;
- connection status;
- AI status;
- last-frame timestamp;
- FPS and stream quality;
- today's event count;
- configuration version;
- dataset marker and timestamps.

Indexes and constraints:

- primary key on `id`;
- non-negative FPS and event-count checks;
- indexes on dataset and operational status.

### `inspection_events`

- stable `id` generated at the edge for real events;
- `cameraId` foreign key;
- camera/zone display fields;
- UTC timestamp;
- outcome, reason and confidence;
- review status and remarks;
- reviewer and review timestamp;
- model/rule versions;
- optimistic-concurrency `version`;
- contract/schema version;
- dataset marker;
- created/updated timestamps.

Indexes and constraints:

- primary/unique event ID for idempotency;
- foreign key to camera;
- confidence check from 0 to 100;
- version/schema-version checks greater than or equal to 1;
- compound timestamp/ID pagination index;
- camera/time, outcome/time and review/time indexes;
- combined camera/outcome/review/time index for common portal filters.

The original automated outcome remains immutable through the review endpoint. Human review fields are updated transactionally and produce an audit record.

### `event_steps`

- UUID `id`;
- `eventId` foreign key;
- explicit `sequence`;
- label;
- state;
- optional observed time.

Constraints:

- cascade delete with the event;
- unique event/sequence pair;
- ordered retrieval by sequence.

### `health_metrics`

- component `id`;
- label, value and detail;
- health state;
- checked timestamp;
- source and dataset fields;
- created/updated timestamps.

A future health-history table may be added after retention and reporting requirements are confirmed. The current table represents the latest dashboard health state.

### `evidence_metadata`

- stable metadata `id`;
- unique event foreign key;
- available, unavailable or pending state;
- snapshot, clip or none type;
- MIME type, size and checksum where real evidence exists;
- protected storage key where approved;
- dataset marker and timestamps.

Evidence binaries are stored in the protected local filesystem and optionally Azure Blob Storage. PostgreSQL stores only safe metadata and protected references.

### `audit_logs`

- UUID row ID and unique action ID;
- actor ID, display name and role;
- action and target;
- safe before/after `JSONB` summaries;
- correlation ID;
- UTC occurrence timestamp;
- created timestamp.

The before/after JSON fields are intentionally limited to audit-safe summaries. They are not a general-purpose replacement for relational schema.

## Schema and migration management

- Prisma schema and migrations are version-controlled;
- the initial PostgreSQL migration includes tables, enum types, foreign keys, indexes and check constraints;
- new migrations are generated only against a dedicated developer database;
- shared/UAT/field environments use `prisma migrate deploy`;
- migration SQL is reviewed for data loss, lock duration, index impact and rollback/recovery needs;
- database backup is required before destructive or data-transforming migrations;
- application code supports staged compatibility where UAT and field versions may briefly differ;
- one reviewed `pnpm-lock.yaml` is authoritative before release.

## JSONB policy

PostgreSQL `JSONB` may be used for:

- versioned AI diagnostic details;
- flexible configuration snapshots;
- audit before/after summaries;
- external integration payload archives where approved.

It must not be used to avoid normal tables for users, sessions, cameras, events, evidence, health or reviews.

## API boundaries

### Edge ingestion

- authenticate edge device/service;
- validate versioned event payloads;
- accept idempotent event submissions;
- issue or accept upload locations for evidence;
- confirm persisted event IDs;
- accept camera and service health summaries.

### Dashboard API

- list events with pagination and filters;
- retrieve event detail and authorized evidence access;
- update review status and remarks;
- list cameras and health status;
- export filtered records;
- provide KPI summaries derived from persisted events.

## Idempotency and concurrency

- event IDs are generated at the edge;
- PostgreSQL primary/unique constraints enforce idempotency;
- duplicate edge submissions resolve to the existing event rather than creating another row;
- evidence uses one-to-one event metadata plus stable storage keys and checksums;
- sync retries must not create duplicate events or evidence records;
- review mutations require `expectedVersion` and use a transaction;
- stale review writes return `409 VERSION_CONFLICT` without overwriting current data.

## Time handling

- store all application timestamps in PostgreSQL as UTC `DateTime` values;
- display local site time in the dashboard;
- synchronize camera, edge workstation, API and database hosts to an approved time source;
- retain original camera timestamps where needed for diagnostics.

## Backup and recovery

- use `pg_dump` for protected local backups;
- use `pg_restore` for controlled restoration tests;
- store backups outside Git and outside unrestricted user folders;
- verify event totals, a reviewed event and an audit record after restoration;
- retain the durable edge spool until database recovery and replay are confirmed.

## Retention

Retention periods are not assumed. The client must approve separate periods for:

- event metadata;
- snapshots;
- short clips;
- raw training footage;
- annotated datasets;
- audit records;
- health history;
- sessions;
- local offline spool;
- database backups.

Scheduled SQL cleanup, evidence lifecycle rules, backup rotation and storage sizing will be implemented only after those periods are approved. Unsynchronized edge records must never be removed by routine retention cleanup.
