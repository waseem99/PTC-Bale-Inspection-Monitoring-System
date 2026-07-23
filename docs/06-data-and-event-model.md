# Data and Event Model

## Data classes

### Restricted video data

- live camera streams;
- raw footage collected for training;
- annotated frames;
- event snapshots and clips;
- site images and camera layouts.

These artifacts must not be committed to GitHub.

### Application metadata

- camera records;
- event timestamps and types;
- track/session identifiers;
- reason codes and confidence values;
- evidence object references;
- review status and remarks;
- system health and synchronization status;
- model, rule, and configuration versions.

## Proposed event contract

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

The exact schema will be implemented through versioned JSON Schema/OpenAPI contracts and reviewed before coding.

## MongoDB persistence design

The preferred metadata store is **Azure Cosmos DB for MongoDB** or another client-approved MongoDB deployment. Mongoose schemas provide application validation, but API boundary validation remains independent through shared contracts.

### `cameras` collection

- `_id`
- `code`
- `name`
- `locationDescription`
- `status`
- `lastFrameAtUtc`
- `configurationVersion`
- `createdAtUtc`
- `updatedAtUtc`

Required indexes:

- unique `code`;
- `status`;
- `lastFrameAtUtc`.

### `inspectionEvents` collection

- `_id`
- `eventId` generated at the edge
- `schemaVersion`
- `eventType`
- `occurredAtUtc`
- `cameraId`
- `inspectionSessionId`
- `temporaryTrackId`
- `outcome`
- `reasonCode`
- `confidence`
- `modelVersion`
- `ruleVersion`
- `configurationVersion`
- evidence metadata/references
- latest review summary where denormalization is approved
- `createdAtUtc`
- `updatedAtUtc`

Required indexes:

- unique `eventId` for idempotency;
- compound `cameraId + occurredAtUtc`;
- compound `outcome + occurredAtUtc`;
- compound `reviewStatus + occurredAtUtc`, if review status is denormalized;
- `inspectionSessionId`.

### `eventReviews` collection

- `_id`
- `eventId`
- `status`
- `remarks`
- `reviewedBy`
- `reviewedAtUtc`
- `createdAtUtc`

The original AI outcome remains immutable. Human review is a separate record or versioned review history.

### `healthRecords` collection

- `_id`
- `componentType`
- `componentId`
- `status`
- `observedAtUtc`
- `details`
- `createdAtUtc`

A separate current-health summary may be maintained for dashboard speed while detailed history follows approved retention.

### `auditRecords` collection

- `_id`
- `actorId`
- `action`
- `entityType`
- `entityId`
- `occurredAtUtc`
- `changeSummary`
- `correlationId`

### Evidence objects

Evidence binaries are not stored inside MongoDB. Metadata is associated with the event and points to private Azure Blob paths.

Evidence metadata includes:

- evidence type;
- Blob path or object key;
- MIME type;
- start/end timestamps;
- size;
- checksum;
- upload/status fields.

## Schema and migration management

MongoDB does not remove the need for controlled schema changes.

- every document includes a schema or contract version where relevant;
- Mongoose schemas and shared contract schemas are version-controlled;
- indexes are created through repeatable migration/setup scripts;
- data transformations are idempotent and tested against representative fixtures;
- destructive or irreversible changes require a rollback and backup plan;
- application code supports staged compatibility where UAT and production versions may briefly differ.

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

## Idempotency

- event IDs are generated at the edge;
- the API enforces a unique `eventId` index and treats repeated submissions as the same event;
- evidence uploads use stable object paths and checksums;
- sync retries must not create duplicate events or evidence records.

## Time handling

- store all application timestamps in UTC using BSON Date values where applicable;
- display local site time in the dashboard;
- synchronize camera, edge workstation, and application clocks to an approved time source;
- retain original camera timestamps where needed for diagnostics.

## Retention

Retention periods are not assumed. The client must approve separate periods for:

- event metadata;
- snapshots;
- short clips;
- raw training footage;
- annotated datasets;
- audit records;
- health history;
- local offline spool.

Deletion jobs, TTL indexes where appropriate, Blob lifecycle rules, and storage sizing will be implemented only after those periods are approved. Unsynchronized edge records must never be removed by routine retention cleanup.
