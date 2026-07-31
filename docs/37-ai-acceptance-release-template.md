# AI Acceptance and Release Record Template

This document stores sanitized release facts only. Do not attach model binaries, datasets, annotations, footage, evidence files, camera credentials, database files or secrets.

## Release identity

| Field | Value |
|---|---|
| Release/tag | `________` |
| Git commit | `________` |
| Dashboard version | `________` |
| API version | `________` |
| Database schema/migration | `________` |
| Edge version | `________` |
| Camera configuration version | `________` |
| Model version/checksum reference | `________` |
| Dataset manifest version | `________` |
| Annotation version | `________` |
| SOP rules version | `________` |
| Runtime configuration version | `________` |
| Locked acceptance manifest | `________` |
| Target workstation | `sanitized asset/reference ID` |

## Data and evaluation controls

| Control | Result | Reference |
|---|---|---|
| Permitted-use records approved | Pass / Fail | `________` |
| Train/validation/calibration/locked acceptance separated | Pass / Fail | `________` |
| No sequence/frame leakage | Pass / Fail | `________` |
| Locked set frozen before final tuning | Pass / Fail | `________` |
| Bangladesh/reference material excluded from PTC acceptance | Pass / Fail | `________` |
| Licensing suitable for intended deployment | Pass / Fail | `________` |
| Model/export parity verified | Pass / Fail | `________` |

## Event-level acceptance

Report results by camera and scenario. Do not use one aggregate score to hide weak cases.

| Metric | Overall | CAM-01 | CAM-02 | CAM-03 | CAM-04 | Agreed target/status |
|---|---:|---:|---:|---:|---:|---|
| Completed precision | `__` | `__` | `__` | `__` | `__` | `________` |
| Completed recall | `__` | `__` | `__` | `__` | `__` | `________` |
| Missed precision | `__` | `__` | `__` | `__` | `__` | `________` |
| Missed recall | `__` | `__` | `__` | `__` | `__` | `________` |
| Incomplete precision | `__` | `__` | `__` | `__` | `__` | `________` |
| Incomplete recall | `__` | `__` | `__` | `__` | `__` | `________` |
| Unresolved-case quality | `__` | `__` | `__` | `__` | `__` | `________` |
| False violation alerts/hour | `__` | `__` | `__` | `__` | `__` | `________` |
| Missed violations | `__` | `__` | `__` | `__` | `__` | `________` |
| Event latency | `__` | `__` | `__` | `__` | `__` | `________` |
| Evidence availability | `__` | `__` | `__` | `__` | `__` | `________` |

## Detector, tracking and association summary

| Area | Metrics/results | Known weak cases | Decision/reference |
|---|---|---|---|
| Bale detection | `________` | `________` | `________` |
| Anonymous worker detection | `________` | `________` | `________` |
| Tracking continuity/fragmentation | `________` | `________` | `________` |
| Worker-to-bale association | `________` | `________` | `________` |
| Occlusion recovery | `________` | `________` | `________` |
| Opening/checking/frisking observations | `________` | `________` | `________` |
| SOP state-machine outcomes | `________` | `________` | `________` |

## Four-stream runtime benchmark

| Measurement | Result | Accepted target/limitation |
|---|---:|---|
| Simultaneous streams | `4 / other` | `________` |
| Throughput/FPS | `________` | `________` |
| End-to-end latency | `________` | `________` |
| CPU utilization | `________` | `________` |
| GPU utilization | `________` | `________` |
| GPU memory | `________` | `________` |
| RAM | `________` | `________` |
| Disk/evidence rate | `________` | `________` |
| Queue age | `________` | `________` |
| Dropped frames | `________` | `________` |
| Sustained run duration | `________` | `________` |
| Camera/model failure isolation | Pass / Fail | `________` |
| Spool/replay/idempotency recovery | Pass / Fail | `________` |

## End-to-end integration

| Test | Result | Sanitized evidence/reference |
|---|---|---|
| Actual camera health reaches portal | Pass / Fail | `________` |
| Actual model replaces simulator through adapter | Pass / Fail | `________` |
| Event ingestion is idempotent | Pass / Fail | `________` |
| Evidence snapshot and clip are protected | Pass / Fail | `________` |
| Supervisor review and audit work | Pass / Fail | `________` |
| Reports reconcile with PostgreSQL | Pass / Fail | `________` |
| Camera/model failure does not create false violation | Pass / Fail | `________` |
| Internet outage does not stop local operation | Pass / Fail | `________` |
| Backup/restore/reboot recovery pass | Pass / Fail | `________` |

## Defects and accepted limitations

| ID | Classification | Severity | Owner | Resolution/accepted limitation | Due/acceptance reference |
|---|---|---|---|---|---|
| `________` | `defect / in-scope / clarification / change request` | `P0/P1/P2/P3` | `________` | `________` | `________` |

## Acceptance decision

- [ ] Accepted
- [ ] Accepted with documented limitations
- [ ] Not accepted — precise corrective actions recorded

| Role | Name | Decision/date | Reference |
|---|---|---|---|
| AI technical owner | `________` | `________` | `________` |
| Runtime/DevOps owner | `________` | `________` | `________` |
| Project Manager | `________` | `________` | `________` |
| Client/site representative | `________` | `________` | `________` |

## Closure controls

- [ ] Final runbooks and release notes match the installed release.
- [ ] Operator training and acknowledgement are recorded.
- [ ] Backup, restore, retention, monitoring and support ownership are accepted.
- [ ] Restricted data and credentials remain outside GitHub.
- [ ] Required hypercare is scheduled/completed or formally waived.
- [ ] Remaining requests are closed, accepted, deferred or converted to approved change requests.
