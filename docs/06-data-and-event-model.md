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
    "snapshotLocalPath": "restricted-local-reference",
    "clipLocalPath": "restricted-local-reference",
    "snapshotBlobUri": null,
    "clipBlobUri": null,
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

The exact schema will be implemented through versioned contracts and reviewed before coding.

## Core tables

### Cameras

- `Id`
- `Code`
- `Name`
- `LocationDescription`
- `Status`
- `LastFrameAtUtc`
- `ConfigurationVersion`

### InspectionEvents

- `Id`
- `EventType`
- `OccurredAtUtc`
- `CameraId`
- `InspectionSessionId`
- `TemporaryTrackId`
- `Outcome`
- `ReasonCode`
- `Confidence`
- `ModelVersion`
- `RuleVersion`
- `ConfigurationVersion`
- `CreatedAtUtc`

### Evidence

- `Id`
- `EventId`
- `EvidenceType`
- `BlobPath`
- `MimeType`
- `StartAtUtc`
- `EndAtUtc`
- `SizeBytes`
- `Checksum`

### EventReviews

- `Id`
- `EventId`
- `Status`
- `Remarks`
- `ReviewedBy`
- `ReviewedAtUtc`

### HealthRecords

- `Id`
- `ComponentType`
- `ComponentId`
- `Status`
- `ObservedAtUtc`
- `Details`

### AuditRecords

- `Id`
- `ActorId`
- `Action`
- `EntityType`
- `EntityId`
- `OccurredAtUtc`
- `ChangeSummary`

## API boundaries

### Edge ingestion

- authenticate edge device/service;
- accept idempotent event submissions;
- issue or accept upload locations for evidence;
- confirm persisted event IDs;
- accept camera and service health summaries.

### Dashboard API

- list events with pagination and filters;
- retrieve event detail and evidence links;
- update review status and remarks;
- list cameras and health status;
- export filtered records;
- provide KPI summaries derived from persisted events.

## Idempotency

- event IDs are generated at the edge;
- the cloud API treats repeated submissions with the same event ID as the same event;
- evidence uploads use stable object paths and checksums;
- sync retries must not create duplicate events or evidence records.

## Time handling

- store all application timestamps in UTC;
- display local site time in the dashboard;
- synchronize camera, edge workstation, and application clocks to an approved time source;
- store original camera timestamps where needed for diagnostics.

## Retention

Retention periods are not assumed. The client must approve separate periods for:

- event metadata;
- snapshots;
- short clips;
- raw training footage;
- annotated datasets;
- audit records;
- local offline spool.

Deletion jobs and storage sizing will be implemented after those periods are approved.
