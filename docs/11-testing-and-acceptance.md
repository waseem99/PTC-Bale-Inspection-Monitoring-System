# Testing and Acceptance

## Test strategy

Testing is organized across hardware, local edge services, PTC-specific AI behavior, local MERN application/data, dashboard, optional Azure synchronization, resilience, security, and client acceptance.

The Bangladesh implementation is a feasibility/reference source only. Final AI acceptance uses approved PTC footage and live PTC scenarios.

## Test levels

### Unit tests

- SOP state transitions;
- completed, missed, incomplete, unresolved, and health reason-code generation;
- event validation and idempotency;
- filter and report calculations;
- local spool and optional synchronization retry logic;
- configuration parsing, including camera orientation and zones;
- evidence naming and checksum logic.

### Component tests

- RTSP reconnect and stream orientation;
- camera-health detection;
- model runtime loading and inference;
- track/session lifecycle;
- rolling video buffer;
- local spool persistence;
- local Node.js API authentication/authorization;
- local MongoDB setup, indexes, and migrations;
- protected local evidence storage/retrieval;
- optional Azure/Blob synchronization.

### Integration tests

- camera or approved recorded PTC stream to AI detections;
- detections/tracks/interactions to SOP outcome;
- outcome to local evidence creation;
- edge event to local Node.js API/database;
- local API to dashboard;
- local Socket.IO event/health update to dashboard;
- review and remarks to audit record;
- export of filtered local records;
- optional local-to-Azure synchronization without duplicates.

### End-to-end tests

- completed PTC inspection appears in local dashboard;
- missed opening/frisking creates the approved violation and evidence;
- incomplete inspection creates the correct reason code;
- unresolved visibility is not reported as a definite violation;
- event review and remarks persist;
- filters and exports match visible records;
- camera outage appears as health failure, not inspection violation;
- internet/Azure outage leaves the local workflow operational;
- optional synchronization resumes without duplicates.

## Test frameworks

- **Python:** Pytest for edge, AI, compliance, spool, and evaluation tests.
- **Node.js API:** Jest and Supertest with an isolated local MongoDB-compatible test environment.
- **React:** Vitest and React Testing Library.
- **End to end:** Playwright.
- **Contracts:** JSON Schema/OpenAPI validation and compatibility checks.
- **Infrastructure:** local package/install tests and Bicep validation/what-if for approved Azure resources.

## Reference-to-PTC validation

Before final SOP and UAT approval:

- classify each relevant Bangladesh-reference feature;
- confirm the meaning of `Not Scanned` versus PTC opening/frisking;
- confirm that generic named-person, dwell-time, trail, and item-count features are excluded;
- record whether reference media is permitted for training;
- ensure reference media is never used as PTC acceptance evidence;
- record camera-geometry differences between the reference and PTC.

## Hardware and site acceptance

- all four cameras installed at PTC-approved positions;
- field of view covers the agreed opening/frisking zones;
- image orientation is correct for inference and dashboard display;
- images are usable under representative operating lighting;
- multiple workers and multiple bales are tested;
- no unresolved critical blind spot remains;
- PoE and network links are stable;
- timestamps are synchronized;
- local workstation processes all configured streams;
- UPS and safe shutdown behavior are tested;
- an eight-hour stream stability test completes without unresolved critical errors.

## PTC AI acceptance dataset

The client and Codistan must agree:

- PTC-specific scenario definitions;
- number and distribution of completed, missed, incomplete, and unresolved cases;
- all four camera/zone perspectives represented as applicable;
- multiple-worker/bale, rework, occlusion, and lighting cases;
- handling of ambiguous or insufficient-visibility cases;
- model, rule, zone, camera, and configuration versions used;
- quantitative acceptance thresholds;
- approved evaluation report format.

The locked PTC test set remains separate from training and routine calibration data. Bangladesh reference media remains separately manifested and cannot be used to claim PTC acceptance accuracy.

## Scenario matrix

| Scenario | Expected outcome |
|---|---|
| Bale enters, all required PTC opening/frisking actions are completed, bale exits | Completed inspection event |
| Bale enters and exits with no required opening/frisking interaction | Missed inspection violation |
| Interaction starts but one or more required conditions are not completed | Incomplete inspection violation |
| Multiple workers interact with one bale correctly | One session with the approved completed/incomplete outcome |
| Multiple bales are visible or processed simultaneously | Separate temporary sessions where the approved view supports it; ambiguous association becomes unresolved |
| Bale is reworked or re-enters the zone | Outcome follows the approved rework/session rule |
| Required action is severely occluded | Unresolved/insufficient visibility according to the approved rule |
| Camera goes offline or image becomes unusable | Camera health event; no inspection judgment from missing footage |
| Internet or Azure is unavailable | Local event, evidence, dashboard, and review continue; optional synchronization queues |
| Local API/database is temporarily unavailable | Python spool retains records and replays after recovery |
| Local/cloud API receives the same event twice | One event persists through idempotency |

## Non-functional tests

### Performance

- four simultaneous configured streams;
- sustained runtime over an agreed test duration;
- acceptable local event-to-dashboard latency;
- bounded CPU, GPU, RAM, disk, and queue use;
- evidence generation does not stop inference;
- local Node/Mongo/React services remain responsive under expected PoC event volume.

### Resilience

- camera disconnect and reconnect;
- Python service restart;
- Node.js service restart;
- local MongoDB restart;
- workstation reboot;
- internet and Azure outage;
- low disk warning;
- failed local evidence write;
- failed optional evidence synchronization and retry.

### Security

- unauthenticated local dashboard/API access rejected;
- unauthorized evidence access rejected;
- approved local users remain able to operate under the agreed offline model;
- optional Entra access behaves correctly where enabled;
- secrets absent from logs and repository;
- local evidence/database paths protected;
- approved Azure storage private;
- audit records created for review changes;
- service accounts have only required access;
- restricted reference and PTC media remain outside GitHub.

## Defect severity

- **P0:** data loss, security exposure, complete local system outage, or all-camera processing failure.
- **P1:** core inspection outcome, local evidence, local persistence, or review workflow materially incorrect.
- **P2:** non-blocking functional issue with a practical workaround, including optional cloud issues where local operation continues.
- **P3:** cosmetic or documentation issue not affecting operation.

PoC release requires all P0 and P1 defects closed or explicitly accepted in writing.

## UAT entry criteria

- reference-to-PTC mapping completed sufficiently for testing;
- approved PTC hardware and camera placement complete;
- local PoC features deployed;
- approved optional Azure components deployed where required;
- PTC test environment and users available;
- locked PTC acceptance footage/scenarios approved;
- no open P0 defects;
- critical documentation available;
- event retention and access configured.

## UAT exit criteria

- required PTC scenarios executed;
- local offline operation demonstrated;
- results and restricted evidence references recorded;
- all P0/P1 issues resolved or formally accepted;
- client training completed;
- user and operations documentation delivered;
- release manifest and installed versions recorded;
- acceptance, acceptance with limitations, or non-acceptance decision obtained.

## Evidence of completion

Each acceptance issue must include:

- environment and release version;
- test steps;
- expected and actual result;
- related camera/zone/scenario/event IDs;
- approved restricted evidence references stored outside GitHub;
- model/rule/configuration versions;
- client or joint acceptance decision.
