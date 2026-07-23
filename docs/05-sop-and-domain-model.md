# SOP and Domain Model

## Purpose

This document defines the domain concepts and state-machine structure for the PTC PoC. Final transitions and thresholds require PTC process-owner approval under issues #59 and #9.

## Reference terminology warning

The Bangladesh reference video appears to display `Not Scanned`. This label is not adopted as a PTC event or requirement until the client confirms whether `scan` means:

- physical bale opening;
- frisking/checking;
- barcode/device scanning;
- another operational step.

PTC event names and reason codes must use the client-approved local terminology.

## Domain entities

### Camera

A physical PTC camera with:

- camera/zone ID;
- approved location and orientation;
- stream configuration reference;
- entry, inspection, exit, and ignored regions;
- health and last-frame status;
- configuration version.

### Temporary bale track

A camera/zone-local visual track while the bale remains observable. It is not a permanent bale identifier and cannot be guaranteed across cameras, re-entry, or extended occlusion.

### Anonymous person track

A temporary visual track used only to evaluate interaction with the bale. It contains no employee name, face identity, attendance, dwell KPI, or performance score.

### Inspection session

A bounded evaluation associated with one temporary bale track and approved camera/zone. A session records:

- entry/start condition;
- relevant worker-bale associations;
- observed opening/frisking signals;
- visibility quality;
- exit/timeout/rework condition;
- final outcome and reason code;
- model/rule/camera/zone/configuration versions.

### Event

A completed, violation, unresolved, or operational-health occurrence persisted locally for dashboard review and optionally synchronized where approved.

### Evidence

A snapshot and/or short clip associated with one event/session, with timestamps, checksum, camera/zone, and retention status.

## Proposed state model

The exact sequence is pending PTC approval. The implementation skeleton should support:

```text
NOT_PRESENT
  -> ENTERED_ZONE
  -> AWAITING_REQUIRED_INTERACTION
  -> OPENING_OBSERVED
  -> FRISKING_IN_PROGRESS
  -> REQUIRED_ACTIONS_COMPLETED
  -> EXITED_COMPLETED
```

Alternative terminal paths:

```text
AWAITING_REQUIRED_INTERACTION -> EXITED_MISSED
OPENING_OBSERVED/FRISKING_IN_PROGRESS -> EXITED_INCOMPLETE
ANY_ACTIVE_STATE -> UNRESOLVED_VISIBILITY
ANY_ACTIVE_STATE -> CANCELLED_OPERATIONAL_OUTAGE
ANY_ACTIVE_STATE -> REWORK_OR_REENTRY according to the approved PTC rule
```

State names may be revised after #9; code must use versioned machine-readable values rather than UI-only wording.

## Outcome taxonomy

### Completed inspection

All mandatory PTC actions and completion/exit conditions are observed with sufficient evidence.

### Missed inspection

The bale reaches the approved terminal/exit condition without the required opening/frisking interaction being observed, while visibility and system health were sufficient to evaluate it.

### Incomplete inspection

One or more required actions began or partial evidence was observed, but the complete approved sequence/conditions were not satisfied before the terminal condition.

### Unresolved / insufficient visibility

The system cannot make a supported process decision because of severe occlusion, track ambiguity, simultaneous-bale association uncertainty, unusable image, or another approved limitation.

### Operational health event

Camera, stream, service, database, storage, or workstation failure. Health events are not process violations.

## Required PTC decisions

- exact bale entry and exit conditions;
- exact number/location of opening/frisking points;
- sequence and minimum duration/observable condition for each step;
- whether opening alone is the immediate/basic PoC requirement or frisking is equally mandatory for acceptance;
- whether multiple bales can be processed simultaneously in one view;
- whether one camera/zone is authoritative or multiple views are combined;
- rules for rework, re-entry, conveyor stoppage, supervisor override, and abandoned sessions;
- behavior under temporary and severe occlusion;
- approved reason-code and dashboard wording.

## Multi-worker and multi-bale rules

- multiple anonymous workers may associate with one bale session;
- proximity alone is not necessarily a valid inspection action;
- a worker may not be assigned to two bales simultaneously unless the approved logic supports it;
- multiple bale sessions are created only where detection/tracking separation is sufficiently reliable;
- ambiguous association produces unresolved behavior rather than unsupported violation certainty;
- no cross-camera permanent identity is claimed.

## Initial machine-readable event types

### Compliance

- `inspection.completed`

### Violations

- `inspection.missed`
- `inspection.incomplete`

### Non-violation evaluation

- `inspection.unresolved`

### Operational

- `camera.offline`
- `camera.recovered`
- `edge.service_degraded`
- `local.application_degraded`
- `sync.pending`
- `sync.recovered`

## Reason-code examples

Final reason codes depend on the approved PTC SOP. Candidate forms include:

- `NO_REQUIRED_INTERACTION`
- `OPENING_NOT_OBSERVED`
- `FRISKING_NOT_OBSERVED`
- `REQUIRED_ACTION_INCOMPLETE`
- `ACTION_DURATION_BELOW_THRESHOLD`
- `BALE_EXITED_BEFORE_COMPLETION`
- `TRACK_ASSOCIATION_AMBIGUOUS`
- `TRACK_LOST_IN_EVALUATION_ZONE`
- `INSUFFICIENT_VISIBILITY`
- `CAMERA_OR_SYSTEM_UNAVAILABLE`

The reference phrase `Not Scanned` is not a PTC reason code unless expressly approved.

## Event contract requirements

Each final event includes:

- stable event ID;
- inspection session ID;
- camera and zone ID;
- temporary bale track ID;
- outcome and approved reason code;
- event start/end and occurrence timestamps;
- confidence/visibility metadata;
- model, rule, zone, camera, and threshold configuration versions;
- evidence metadata;
- local persistence and optional synchronization status;
- human review status and remarks stored separately from the original AI outcome.

## Versioning

The following must be versioned together for release compatibility:

- SOP/state-machine rules;
- outcome/reason-code taxonomy;
- model artifact;
- camera orientation and zone definitions;
- thresholds/timeouts;
- event contract version.

## Human review

The dashboard supports approved review statuses, operator remarks, evidence review, reason-code display, and an audit trail. Human review must not silently modify the original AI outcome.

Any change to the approved physical workflow or addition of barcode/RFID/scanner/IoT identity is a change request, not a calibration adjustment.
