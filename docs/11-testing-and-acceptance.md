# Testing and Acceptance

## Test strategy

Testing is organized across hardware, edge services, AI behavior, API/data, dashboard, Azure deployment, resilience, security, and client acceptance.

## Test levels

### Unit tests

- SOP state transitions;
- reason-code generation;
- event validation and idempotency;
- filter and report calculations;
- synchronization retry logic;
- configuration parsing;
- evidence naming and checksum logic.

### Component tests

- RTSP reconnect behavior;
- camera-health detection;
- model runtime loading and inference;
- track lifecycle;
- rolling video buffer;
- local spool persistence;
- API authentication and authorization;
- database migrations;
- Blob upload and retrieval.

### Integration tests

- camera or recorded stream to AI detections;
- detections to SOP outcome;
- outcome to evidence creation;
- edge event to cloud API;
- API to database and Blob Storage;
- SignalR event to dashboard;
- review and remarks to audit record;
- export of filtered records.

### End-to-end tests

- completed inspection appears in dashboard;
- missed inspection creates correct violation and evidence;
- incomplete inspection creates correct reason code;
- event review and remarks persist;
- filters and exports match visible records;
- camera outage appears as health failure, not inspection violation;
- internet outage queues events and later synchronizes without duplicates.

## Hardware and site acceptance

- all four cameras installed at approved positions;
- field of view covers the agreed zones;
- images are usable under normal operating lighting;
- no critical blind spots remain in the approved coverage;
- PoE and network links are stable;
- timestamps are synchronized;
- edge workstation processes all configured streams;
- UPS and safe shutdown behavior are tested;
- an eight-hour stream stability test completes without unresolved critical errors.

## AI acceptance dataset

The client and Codistan must agree:

- scenario definitions;
- number and distribution of completed, missed, and incomplete cases;
- handling of ambiguous or insufficient-visibility cases;
- model and configuration version used;
- quantitative acceptance thresholds;
- approved evaluation report format.

The final test set remains separate from training and routine calibration data.

## Scenario matrix

| Scenario | Expected outcome |
|---|---|
| Bale enters, required inspection is completed, bale exits | Completed inspection event |
| Bale enters and exits with no required interaction | Missed inspection violation |
| Interaction starts but required action/duration is not completed | Incomplete inspection violation |
| Camera goes offline | Camera health event; no inspection judgment from missing footage |
| Track is lost due to severe occlusion | Insufficient visibility or unresolved outcome according to approved rule |
| Internet is unavailable | Event remains locally queued and synchronizes later |
| Cloud receives the same event twice | One event persists through idempotency |

## Non-functional tests

### Performance

- four simultaneous configured streams;
- sustained runtime over an agreed test duration;
- acceptable event-to-dashboard latency;
- bounded CPU, GPU, RAM, disk, and queue use;
- evidence generation does not stop inference.

### Resilience

- camera disconnect and reconnect;
- service restart;
- workstation reboot;
- temporary Azure/API outage;
- network interruption;
- low disk warning;
- failed evidence upload and retry.

### Security

- unauthenticated dashboard/API access rejected;
- unauthorized evidence access rejected;
- secrets absent from logs and repository;
- production storage private;
- audit records created for review changes;
- service accounts have only required access.

## Defect severity

- **P0:** data loss, security exposure, system unusable, or all-camera processing failure.
- **P1:** core inspection outcome, evidence, synchronization, or review workflow materially incorrect.
- **P2:** non-blocking functional issue with a practical workaround.
- **P3:** cosmetic or documentation issue not affecting operation.

MVP release requires all P0 and P1 defects closed or explicitly accepted in writing.

## UAT entry criteria

- approved hardware and camera placement complete;
- MVP features deployed;
- test environment and users available;
- acceptance footage/scenarios approved;
- no open P0 defects;
- critical documentation available;
- event retention and access configured.

## UAT exit criteria

- required scenarios executed;
- results and evidence recorded;
- all P0/P1 issues resolved or formally accepted;
- client training completed;
- user and operations documentation delivered;
- release manifest and installed versions recorded;
- acceptance sign-off obtained.

## Evidence of completion

Each acceptance issue must include:

- environment and release version;
- test steps;
- expected and actual result;
- related camera/scenario IDs;
- approved screenshots or references stored outside public GitHub;
- client or joint acceptance decision.
