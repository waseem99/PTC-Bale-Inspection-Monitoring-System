# Testing and Acceptance

## Test strategy

Testing is organized across hardware, local edge services, PTC-specific AI behavior, the local React/Node/PostgreSQL application, dashboard, optional Azure synchronization, resilience, security, database recovery, and client acceptance.

The Bangladesh implementation is a feasibility/reference source only. Final AI acceptance uses approved PTC footage and live PTC scenarios.

## Test levels

### Unit tests

- SOP state transitions;
- completed, missed, incomplete, unresolved, and health reason-code generation;
- event validation and idempotency;
- filter and report calculations;
- local spool and optional synchronization retry logic;
- configuration parsing, including camera orientation and zones;
- evidence naming and checksum logic;
- PostgreSQL query-filter construction and review-version rules.

### Component tests

- RTSP reconnect and stream orientation;
- camera-health detection;
- model runtime loading and inference;
- track/session lifecycle;
- rolling video buffer;
- local spool persistence;
- local Node.js API authentication/authorization;
- PostgreSQL startup, Prisma Client generation and migration deployment;
- PostgreSQL tables, constraints and indexes;
- protected local evidence storage/retrieval;
- optional Azure/Blob synchronization.

### Integration tests

- camera or approved recorded PTC stream to AI detections;
- detections/tracks/interactions to SOP outcome;
- outcome to local evidence creation;
- edge event to local Node.js API/PostgreSQL;
- local API to dashboard;
- local Socket.IO event/health update to dashboard;
- review and remarks to transactionally created audit record;
- stale review to `409 VERSION_CONFLICT` without overwrite;
- export of filtered PostgreSQL records;
- migration from an approved previous schema version;
- backup and restore of representative records;
- optional local-to-Azure synchronization without duplicates.

### End-to-end tests

- completed PTC inspection appears in local dashboard;
- missed opening/frisking creates the approved violation and evidence;
- incomplete inspection creates the correct reason code;
- unresolved visibility is not reported as a definite violation;
- event review and remarks persist in PostgreSQL;
- filters and exports match visible records;
- camera outage appears as health failure, not inspection violation;
- internet/Azure outage leaves the local workflow operational;
- API and PostgreSQL restart preserve approved records;
- optional synchronization resumes without duplicates.

## Test frameworks

- **Python:** Pytest for edge, AI, compliance, spool, and evaluation tests.
- **Node.js API:** Jest and Supertest with a dedicated isolated PostgreSQL test database.
- **Database:** Prisma Client, committed migrations, PostgreSQL constraints, `pg_dump` and `pg_restore` validation.
- **React:** Vitest and React Testing Library.
- **End to end:** Playwright.
- **Contracts:** JSON Schema/OpenAPI validation and compatibility checks.
- **Infrastructure:** local package/install/container tests and Bicep validation/what-if for approved Azure resources.

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
- model, rule, zone, camera, database schema, and configuration versions used;
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
| Internet or Azure is unavailable | Local event, evidence, dashboard, review and PostgreSQL persistence continue; optional synchronization queues |
| Local API is temporarily unavailable | Python spool retains records and replays after recovery |
| PostgreSQL is temporarily unavailable | API readiness fails, spool retains records, and replay occurs only after database recovery |
| Local/cloud API receives the same event twice | One event persists through the event primary/unique key |
| Two supervisors update the same event version | One succeeds; stale update receives `409 VERSION_CONFLICT` |
| API or PostgreSQL container restarts | Previously committed reviews, sessions according to validity, events and audits remain consistent |
| A database backup is restored to a controlled environment | Expected event totals, a reviewed event and audit records reconcile |

## Non-functional tests

### Performance

- four simultaneous configured streams;
- sustained runtime over an agreed test duration;
- acceptable local event-to-dashboard latency;
- bounded CPU, GPU, RAM, disk, PostgreSQL connections and queue use;
- evidence generation does not stop inference;
- local Node/PostgreSQL/React services remain responsive under expected PoC event volume;
- indexed filters and pagination remain within the approved response-time target;
- CSV export is bounded to the approved maximum rows.

### Resilience

- camera disconnect and reconnect;
- Python service restart;
- Node.js service restart;
- PostgreSQL restart with persistent volume;
- failed migration is contained before API rollout;
- PostgreSQL backup/restore;
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
- secrets and database URLs absent from logs and repository;
- PostgreSQL not directly exposed to unapproved networks/users;
- Prisma parameterized data access and field whitelisting used;
- local evidence/database/backup paths protected;
- approved Azure storage and managed PostgreSQL networking private/restricted;
- audit records created for review changes;
- service/database accounts have only required access;
- restricted reference and PTC media remain outside GitHub and PostgreSQL.

## Database acceptance

- committed migrations apply successfully to an empty PostgreSQL database;
- migration status is clean after deployment;
- expected schema constraints and indexes exist;
- deterministic seed reports exactly 3 users, 4 cameras, 6 health metrics and 257 events;
- normal seeding preserves human review fields and version;
- synthetic reset is blocked in production mode;
- transactional review plus audit behavior is verified;
- data persists across API and PostgreSQL restarts;
- `pg_dump` creates a usable protected backup;
- `pg_restore` restores the representative dataset in a controlled environment;
- restored event, review and audit totals reconcile;
- no raw evidence binary is stored in PostgreSQL.

## Defect severity

- **P0:** data loss, security exposure, complete local system outage, failed database recovery, or all-camera processing failure.
- **P1:** core inspection outcome, local evidence, PostgreSQL persistence, review/audit workflow, or migration materially incorrect.
- **P2:** non-blocking functional issue with a practical workaround, including optional cloud issues where local operation continues.
- **P3:** cosmetic or documentation issue not affecting operation.

PoC release requires all P0 and P1 defects closed or explicitly accepted in writing.

## UAT entry criteria

- reference-to-PTC mapping completed sufficiently for testing;
- approved PTC hardware and camera placement complete;
- local PoC features deployed;
- PostgreSQL migrations applied and readiness healthy;
- database backup/restore method documented and tested in a controlled environment;
- approved optional Azure components deployed where required;
- PTC test environment and users available;
- locked PTC acceptance footage/scenarios approved;
- no open P0 defects;
- critical documentation available;
- event retention and access configured.

## UAT exit criteria

- required PTC scenarios executed;
- local offline operation demonstrated;
- PostgreSQL persistence and recovery demonstrated;
- results and restricted evidence references recorded;
- all P0/P1 issues resolved or formally accepted;
- client training completed;
- user and operations documentation delivered;
- release manifest, database migration version and installed versions recorded;
- acceptance, acceptance with limitations, or non-acceptance decision obtained.

## Evidence of completion

Each acceptance issue must include:

- environment and release version;
- database engine/version and migration version;
- test steps;
- expected and actual result;
- related camera/zone/scenario/event IDs;
- approved restricted evidence references stored outside GitHub;
- model/rule/configuration versions;
- backup/restore record where applicable;
- client or joint acceptance decision.
