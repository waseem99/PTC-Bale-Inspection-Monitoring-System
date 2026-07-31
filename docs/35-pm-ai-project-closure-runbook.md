# Final Two-Workstream Delivery and Closure Runbook

**Controlling PM issue:** #75  
**Controlling technical/AI epic:** #86  
**Certified software baseline:** `e5095cb39fd5e41e8deb869c0a8b99dc7ba6fedb`  
**PM closure package baseline:** `a03c69032d271be6757c8cd8f96e69f6854a7ae3`

## 1. Final status

The repository-side application platform and one-machine deployment package are complete. The approved React dashboard, Node.js API, PostgreSQL/Prisma persistence, authentication and authorization, review/audit workflow, reports, protected evidence, realtime updates, camera/edge contracts, durable spool, simulator, backup/restore, local operations tooling, CI, and handover templates are implemented.

No additional undefined software-platform work remains.

Only two delivery workstreams remain:

1. **Actual PTC AI and site technical implementation** — Zubair leads, Qamar supports runtime/hardware, Arif accepts.
2. **PM/client feedback, acceptance, handover, and closure** — Arif leads and coordinates all client decisions.

Repository administration under #14 is a one-time prerequisite, not a third implementation workstream.

## 2. Ownership

| Responsibility | Owner |
|---|---|
| PM coordination, client feedback, decisions, UAT and acceptance | `arifkhannamal9288` |
| AI and technical implementation | `zubairahmed02` |
| Local runtime, GPU, camera/hardware and recovery support | `qamarmujtaba` |
| Repository and commercial/change control | `waseem99` |

## 3. One-time repository administration

Tracked in #14. Complete before any client-sensitive operational material is introduced:

- change repository visibility to private;
- confirm Arif, Qamar and Zubair retain suitable access;
- protect `main` with pull-request review and applicable required checks;
- restrict force pushes and branch deletion;
- enable available secret, dependency and security scanning;
- remove obsolete merged branches after preserving unique history;
- keep footage, annotations, datasets, camera credentials, database backups, evidence and model binaries outside GitHub.

GitHub may contain only source code, safe schemas, sanitized manifests, storage reference IDs, checksums, experiment configurations, sanitized metrics, decisions and runbooks.

## 4. Workstream A — actual PTC AI and site technical implementation

**Controlling issue:** #86  
**Implementation owner:** Zubair  
**Runtime/site support:** Qamar  
**PM acceptance:** Arif

### A1. Factory material and approved baseline

Use #74 and the PM/client decisions in #9, #10, #12, #13, #15, #27 and #59.

Before bulk annotation or final model selection, confirm:

- ordered PTC bale-inspection SOP;
- completed, missed, incomplete and unresolved definitions;
- operational exceptions, rework and insufficient-visibility behavior;
- approved reason codes;
- camera positions, zones, orientation and observable actions;
- data-use permission, access list and retention/deletion position;
- separation of training, validation, calibration and locked acceptance material;
- locked UAT scenario matrix and acceptance method;
- missing scenarios requiring additional safe capture.

Raw factory media must never be attached to GitHub.

### A2. Execute AI epic #86 in order

1. #27 — material audit, permission and split proposal;
2. #28 — annotation guide and quality control;
3. #29 — dataset v1 and frozen manifests;
4. #30 — reproducible detector experiments and licensing decision;
5. #31 — camera-local tracking and worker-to-bale association;
6. #32 — explainable opening/checking/frisking interaction observations;
7. #33 — deterministic versioned SOP state machine and reason codes;
8. #34 — locked evaluation, model packaging and four-stream benchmark.

Each issue must be delivered through an issue-linked pull request with tests, reproducibility instructions, safe version identifiers, runtime impact, and sanitized evidence. Model binaries and datasets remain in restricted storage.

Final model selection must not precede controlled data, annotation and evaluation preparation.

### A3. Actual camera and hardware integration

Execute #84 as the site-adapter phase of this same technical workstream:

- approve and mount four camera positions;
- establish secure stream access;
- record camera IDs, zones, orientation, codec, resolution, frame rate and time synchronization;
- validate cable, PoE/network, workstation, storage and UPS readiness;
- connect actual camera health, live view, frame sampling and rolling evidence capture;
- prove reconnect and one-camera failure isolation;
- complete sustained four-stream stability and resource measurements.

Camera credentials and network details remain outside GitHub.

### A4. Actual model integration and site validation

Execute #85:

- replace simulator outputs through the existing AI adapter without frontend/backend redesign;
- run actual events through API, PostgreSQL, evidence, dashboard, review, audit and reporting;
- verify camera/model failures never become false process violations;
- run locked evaluation with camera/scenario breakdowns;
- review false positives, false negatives, unresolved cases and limitations;
- verify model export/runtime parity;
- run all four actual streams and record throughput, latency, resources, queue and recovery behavior;
- freeze model, dataset, annotation, rules, configuration and camera versions;
- obtain PM/client acceptance.

Use `docs/37-ai-acceptance-release-template.md` for the sanitized release record.

## 5. Workstream B — PM/client feedback, acceptance and closure

**Controlling issue:** #75  
**Owner:** Arif  
**Technical support:** Zubair and Qamar

### B1. Target-workstation software acceptance

Execute #102 and record the decision under #83:

- fresh bootstrap on the intended workstation;
- complete `docs/34-local-uat-record.md`;
- offline operation and reboot recovery;
- database and evidence backup with checksums;
- guarded restore;
- simulator/hardware-ready separation;
- no unresolved P0/P1 local software defect without written acceptance;
- accepted local release manifest and tag.

This is PM acceptance of the already-implemented software package; it is not new software development and makes no actual AI accuracy claim.

### B2. Client feedback and decision control

Arif owns all client communication and classifies every item as one of:

1. **Defect** — implemented behavior does not meet an already-approved requirement.
2. **In-scope completion** — an approved acceptance item is incomplete.
3. **Clarification/configuration** — no architectural or scope expansion is required.
4. **Change request** — new feature, integration, camera, report, identity method, workflow or commercial commitment.

Only defects and approved in-scope completion enter the delivery backlog directly. Change requests require approval before implementation.

### B3. Client UAT and handover

Execute #52 and #53 after the technical release is frozen:

- run the approved client UAT;
- close or formally accept every P0/P1 defect;
- train supervisors and administrators;
- hand over daily operations, backup, restore, troubleshooting, escalation and secret rotation;
- record hardware, camera, model, dataset, annotation, rules, configuration, edge, API, database and frontend versions;
- publish final release notes and approved final tag;
- record client acceptance and support ownership.

### B4. Feedback-driven stabilization and hypercare

Use #8 and #54–#57 only when required by the agreement, client feedback or an explicit PM decision. This work is conditional and must not be treated as an unfinished software-platform feature set.

During any approved hypercare:

- establish monitoring and review cadence;
- collect confirmed false-positive and false-negative candidates by event ID;
- execute only evidence-supported model/rule/configuration improvements;
- rerun locked regression after every material change;
- resolve or accept production P0/P1 defects;
- publish the final stabilization release and closure report.

## 6. Completed repository-side scope

The following is complete and should not be reopened without a specific defect or approved change request:

- approved dashboard and live API integration;
- PostgreSQL/Prisma schema and migrations;
- authentication, sessions and server-side roles;
- events, review, remarks and transactional audit history;
- camera configuration/status and health contracts;
- machine-authenticated idempotent ingestion;
- durable local SQLite spool and outage replay;
- protected evidence upload, checksum, range playback and reconciliation;
- realtime SSE and polling fallback;
- CSV and PDF reports;
- Docker Compose local runtime and workstation-only ingress;
- Windows and Ubuntu bootstrap/operations scripts;
- backup, checksums, guarded restore, upgrade and secret rotation;
- simulator and hardware-ready modes;
- automated frontend, backend, recovery, contract, edge and local-runtime certification;
- release, UAT, restricted-material and AI-acceptance templates.

## 7. PM reporting cadence

Arif posts one sanitized update on #75 whenever a material decision or acceptance event occurs, covering:

- current workstream and issue;
- completed deliverables;
- client decisions or feedback received;
- blocked items and named owner;
- P0/P1 defects;
- data/annotation/model/rules/configuration versions;
- next acceptance event.

Do not publish passwords, tokens, IP addresses, camera URLs, private network details, media, annotations, datasets, evidence, database files or model binaries.

## 8. Closure definition

Close #75 only when:

- target-workstation local acceptance is recorded;
- repository and restricted-data administration is complete;
- #86 and #27–#34 are complete;
- #84 and #85 are accepted;
- client feedback/UAT and operator handover are complete;
- final release identity and support ownership are recorded;
- required hypercare is complete or formally waived;
- every remaining issue is closed, accepted, deferred, or converted to an approved change request with an explicit reason.
