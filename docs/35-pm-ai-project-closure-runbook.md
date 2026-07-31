# PM Takeover and Project Closure Runbook

**Controlling delivery issue:** #75  
**Controlling AI epic:** #86  
**Local software acceptance:** #83 and #102  
**Factory-material baseline:** #74  
**Actual hardware integration:** #84  
**Actual model/site acceptance:** #85  
**Software baseline:** `e5095cb39fd5e41e8deb869c0a8b99dc7ba6fedb`

## 1. Purpose

This is the single execution path for the Project Manager after the local application software has been merged and certified in automation. It replaces historical release-order assumptions that required AWS or Vercel before local acceptance.

The application platform is implemented. The remaining delivery work is limited to:

1. governance and target-workstation acceptance;
2. controlled factory-material preparation;
3. PTC-specific AI development and evaluation;
4. physical camera/hardware integration;
5. actual-model integration and site UAT;
6. training, handover, hypercare and formal closure.

No historical software or cloud ticket may be used to add scope outside this sequence without an approved change request.

## 2. Ownership

| Responsibility | Owner |
|---|---|
| PM coordination, client decisions and acceptance | `arifkhannamal9288` |
| AI and technical implementation | `zubairahmed02` |
| Local runtime, GPU, deployment and recovery | `qamarmujtaba` |
| Repository and commercial/change control | `waseem99` |

## 3. Gate 0 — governance before sensitive work

Owner: Waseem and Qamar. Tracked in #14.

Before factory material, camera configuration or model artifacts are introduced:

- change the repository to private;
- confirm Arif, Qamar and Zubair retain suitable access;
- protect `main` with pull-request review and required checks;
- restrict force pushes and branch deletion;
- enable available secret, dependency and security scanning;
- keep all restricted media, annotations, datasets, camera credentials, database backups, evidence and model binaries outside GitHub.

GitHub may contain only code, safe schemas, sanitized manifests, storage reference IDs, checksums, experiment configuration, sanitized metrics, decisions and runbooks.

## 4. Gate 1 — target-workstation software acceptance

Owners: Arif and Qamar. Tracked in #83, #100 and #102.

On the intended Windows 11/WSL2/Docker Desktop workstation:

1. clone the repository and checkout the approved release commit;
2. run the documented PowerShell bootstrap;
3. record OS, Docker, Compose, workstation hardware, commit and local URL;
4. execute every test in `docs/34-local-uat-record.md`;
5. verify operation with internet disconnected;
6. verify stop/start and workstation reboot recovery;
7. create a database backup and evidence archive with checksums;
8. execute the guarded restore test;
9. verify simulator and hardware-ready modes remain distinct;
10. record defects and close or formally accept every P0/P1 item;
11. publish the local software release tag and completed manifest;
12. record PM acceptance in #102 and close #83/#98/#100/#102 as appropriate.

No actual AI accuracy claim is permitted at this gate.

## 5. Gate 2 — factory-material and operational baseline

Owners: Arif and Zubair. Tracked in #74, #9, #10, #12, #13, #15, #27 and #59.

Arif must create one restricted material location and provide Zubair access through the approved secure channel. Use `docs/36-restricted-material-manifest-template.md` for sanitized planning records.

Required decisions before bulk annotation or final model selection:

- approved ordered PTC bale-inspection SOP;
- definitions of completed, missed, incomplete and unresolved;
- operational exceptions, rework and insufficient-visibility behavior;
- approved reason codes;
- four camera positions, zones, orientation and observable actions;
- approved data-use permission, access list and retention/deletion position;
- separation of training, validation, calibration and locked acceptance material;
- locked UAT scenario matrix and acceptance method;
- identification of missing scenarios requiring additional safe capture.

Raw factory media must never be attached to GitHub.

## 6. Gate 3 — execute AI epic #86 in order

Owner: Zubair. PM acceptance: Arif. Runtime support: Qamar.

The mandatory order is:

1. #27 — material audit, permission and split proposal;
2. #28 — annotation guide and quality control;
3. #29 — dataset v1 and frozen manifests;
4. #30 — reproducible detector experiments and licensing decision;
5. #31 — camera-local tracking and worker-to-bale association;
6. #32 — explainable opening/checking/frisking interaction observations;
7. #33 — deterministic versioned SOP state machine and reason codes;
8. #34 — locked evaluation, model packaging and four-stream benchmark.

Each issue must be delivered through an issue-linked pull request containing tests, reproducibility instructions, safe version identifiers, runtime impact and sanitized evidence. Model binaries and datasets remain in restricted storage.

Final model selection must not precede the controlled data, annotation and evaluation preparation.

## 7. Gate 4 — actual cameras and hardware

Owners: Zubair and Qamar. PM/site acceptance: Arif. Tracked in #84.

Required completion:

- approve and mount four camera positions;
- establish secure RTSP/approved stream access;
- record camera IDs, zones, orientation, codec, resolution, frame rate and time synchronization;
- validate cable, PoE/network, workstation, storage and UPS readiness;
- connect actual camera health, live view, frame sampling and rolling evidence capture;
- prove reconnect and one-camera failure isolation;
- verify opening/checking/frisking visibility under real conditions;
- complete the required sustained four-stream stability test;
- record CPU, GPU, RAM, network, disk and evidence baseline;
- obtain PM/site approval.

Camera credentials and network details stay outside GitHub.

## 8. Gate 5 — actual model integration and acceptance

Owner: Zubair. Runtime support: Qamar. PM/client acceptance: Arif. Tracked in #85.

Required completion:

- replace the simulator through the existing AI adapter without frontend/backend redesign;
- run actual events through API, PostgreSQL, evidence, dashboard, review, audit and reporting;
- verify camera/model failures never become false process violations;
- run the locked evaluation with camera/scenario breakdowns;
- review false positives, false negatives, unresolved cases and accepted limitations;
- verify ONNX/export parity and the selected optimized runtime;
- run four actual streams simultaneously and record performance, queue and recovery behavior;
- freeze model, dataset, annotation, rules, configuration and camera versions;
- obtain PM/client acceptance in #85.

Use `docs/37-ai-acceptance-release-template.md` for the sanitized release record.

## 9. Gate 6 — client UAT, handover and closure

Owners: Arif and Qamar, with Zubair supporting AI findings. Tracked in #52, #53 and #75.

Required completion:

- execute the approved client UAT against the frozen release;
- close or formally accept all P0/P1 defects;
- train supervisors and administrators;
- hand over daily operations, backup, restore, troubleshooting, escalation and secret-rotation procedures;
- record hardware, camera, model, dataset, annotation, rules, configuration, edge, API, database and frontend versions;
- publish final release notes and the approved MVP/final tag;
- record client acceptance and support ownership;
- classify every new request as defect, in-scope completion, clarification/configuration or change request.

## 10. Hypercare and final closure

Unless formally waived or replaced in writing, execute the agreed hypercare work under #8 and #54–#57:

- establish the production monitoring and review cadence;
- collect confirmed false-positive and false-negative candidates by event ID;
- execute only evidence-supported model/rule/configuration improvements;
- rerun locked regression after every material change;
- resolve or accept production P0/P1 defects;
- publish the final stabilization release and closure report.

The project is closed only when final acceptance, documentation, release identity and support ownership are recorded.

## 11. PM reporting cadence

Arif should publish one sanitized weekly update on #75 containing:

- current gate and issue;
- completed deliverables;
- decisions required from client/Waseem;
- blocked items and named owner;
- P0/P1 defects;
- data/annotation/model/rules/configuration versions;
- next acceptance event.

Do not publish passwords, tokens, IP addresses, camera URLs, private network details, media, annotations, datasets, evidence, database files or model binaries.

## 12. Closure definition

The project may be closed only when:

- target-workstation local UAT is accepted;
- repository and restricted-data governance are complete;
- #86 and child workstreams #27–#34 are complete;
- #84 actual hardware integration is accepted;
- #85 actual model integration and client acceptance are recorded;
- client UAT and operator training are complete;
- final release and version manifest are published;
- backup, restore, retention, monitoring and support ownership are accepted;
- required hypercare is completed or formally waived;
- all remaining issues are closed, accepted, deferred or converted to approved change requests with explicit reasons.
