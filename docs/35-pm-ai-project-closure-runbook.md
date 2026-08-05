# Final Testing, Acceptance and Closure Runbook

**Controlling PM issue:** #75  
**Controlling AI/testing epic:** #86  
**Certified application baseline:** `e5095cb39fd5e41e8deb869c0a8b99dc7ba6fedb`  
**Current integrated AI/testing baseline:** `2e1857da8acbf1915b6e1550e828a378dc152bde`  
**Testing-readiness audit:** `docs/40-final-testing-readiness-audit.md`

## 1. Current status

Repository-side platform and AI implementation work is complete enough to begin proper testing. The dashboard, API, PostgreSQL, evidence, reporting, realtime services, durable edge delivery, local deployment tooling, YOLO/ByteTrack adapters, hand-inspection logic, grading, routing, scale-display OCR, SOP/anomaly engine, evaluation tools and test harness are present on `main`.

The team has reported that the solution backend is deployed. Deployment is treated as **reported but not formally accepted** until the team records the deployed commit, environment, migration status, health checks and smoke-test evidence.

No additional undefined platform development remains.

## 2. Ownership

| Responsibility | Owner |
|---|---|
| PM coordination, client feedback, UAT and acceptance | `arifkhannamal9288` |
| AI model/data/configuration and technical validation | `zubairahmed02` |
| Deployment, runtime, database, GPU and camera support | `qamarmujtaba` |
| Repository and commercial/change control | `waseem99` |

## 3. Verified repository status

- repository is private;
- Arif, Qamar and Zubair have write access;
- no pull requests are open;
- latest integrated baseline is `2e1857da8acbf1915b6e1550e828a378dc152bde`;
- PR #117 AI Pipeline CI passed compile, 27 tests and deterministic replay;
- restricted factory videos, annotations, datasets, credentials, evidence, database files and model binaries remain outside GitHub.

Manual GitHub Settings verification remains under #14 for branch protection, required checks, force-push/deletion restrictions, deployment reviewers and security features.

## 4. Testing sequence

### Gate 1 — deployed release verification

Qamar records, without exposing secrets:

- frontend and backend environment names/URLs;
- deployed Git commit and image/build identifiers;
- database engine and migration version;
- service health and startup status;
- environment-variable/secrets ownership;
- database connectivity and seed/admin readiness;
- evidence/storage path readiness;
- backup and rollback position;
- sanitized deployment and smoke-test logs.

A deployment reported as online is not accepted until these checks pass.

### Gate 2 — controlled factory-video and dataset readiness

Zubair and Arif complete #27–#29 and #74:

- inventory approved videos by protected reference ID;
- confirm training/calibration/validation/locked-test permission;
- map each camera/view to opening, hand inspection, grading, routing and scale display;
- freeze annotation definitions and QA;
- build leakage-safe dataset manifests;
- identify missing normal, anomaly and low-visibility scenarios.

### Gate 3 — model and component testing

Zubair executes #30–#34 and #114–#116:

- train/select PTC-specific detector weights;
- validate Bale ID tracking and inspector-to-bale association;
- validate opening and genuine hand inspection;
- validate grading completion;
- validate accepted/rejected routing, with left meaning rejection;
- validate scale-display OCR and Bale ID association;
- run deterministic SOP/anomaly outcomes;
- report locked metrics and limitations by camera/scenario;
- package the selected release and benchmark resource use.

Generic pretrained weights or simulator output are not PTC acceptance evidence.

### Gate 4 — integrated deployed-solution testing

Use #85 as the single integrated test control:

- run approved recorded videos through the actual AI runtime;
- ingest events through the deployed backend;
- verify PostgreSQL records, dashboard display, evidence, review, audit and reports;
- test completed, missed, incomplete and unresolved outcomes;
- verify specific opening, hand-inspection, grading, routing and OCR anomalies;
- confirm camera/model/service failures remain operational events;
- test idempotency, retry, restart and recovery;
- record false positives, false negatives, latency and evidence availability.

### Gate 5 — actual camera/site validation

Where live cameras form part of final acceptance, complete #84 and the live portion of #85:

- approve camera IDs, streams, orientation and time synchronization;
- version inspection, grading, accepted, rejected and scale-display ROIs;
- verify reconnect and partial-camera failure isolation;
- run all required streams and sustained stability testing;
- record CPU, GPU, RAM, disk, queue and network behavior.

Recorded-video testing may start before this gate, but it does not close live-site acceptance.

### Gate 6 — PM/client UAT and handover

Arif executes #52 and #53:

- run the approved UAT matrix;
- classify findings as defect, in-scope gap, configuration or change request;
- close or formally accept P0/P1 defects;
- record known limitations;
- train supervisors and administrators;
- hand over operations, backup, restore, troubleshooting and escalation;
- publish final release identity and support ownership;
- obtain PM/client acceptance.

## 5. Required testing evidence

Every final test record must identify:

- deployed commit/build/image;
- frontend, backend, database/migration and edge versions;
- dataset, annotation, detector, tracker, action, grading, routing, OCR and rules versions;
- camera/ROI configuration version;
- test input manifest and scenario;
- expected and actual outcome;
- event/evidence reference IDs;
- metrics, defects and accepted limitations;
- tester, date and approval decision.

Do not place raw footage, credentials, private URLs, annotations, model files, evidence binaries or database dumps in GitHub.

## 6. Feedback and change control

Every finding must be classified before implementation:

1. **Defect** — approved behavior is not working.
2. **In-scope completion gap** — an approved acceptance item is incomplete.
3. **Configuration/calibration** — thresholds, ROIs or environment settings require adjustment.
4. **Change request** — new feature, integration, camera, report, workflow or commercial commitment.

Only the first three enter the active testing backlog directly. Change requests require approval.

## 7. Project completion definition

Close #75 only after:

- deployed release verification is recorded;
- applicable #14 governance checks are complete;
- controlled data/model/ROI testing is complete;
- #85 records integrated acceptance;
- #52 client UAT is complete;
- #53 training, handover and final release identity are complete;
- required hypercare is completed or formally waived;
- every remaining issue is closed, accepted, deferred or converted into an approved change request.

Until these records exist, the correct status is **implementation complete and ready for testing**, not formally completed and accepted.