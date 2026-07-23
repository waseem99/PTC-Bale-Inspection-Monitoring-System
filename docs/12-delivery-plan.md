# Delivery Plan

## Timeline

- **MVP:** 8 weeks
- **Hypercare and improvements:** 5 weeks

The schedule assumes timely site access, hardware availability, representative footage, approved SOP definitions, Azure access, and client UAT participation.

## Workstreams

1. scope, SOP, and acceptance;
2. site, hardware, and camera readiness;
3. edge video and evidence platform;
4. AI detection, tracking, and compliance engine;
5. API, data, and Azure platform;
6. dashboard;
7. integration, UAT, training, and release;
8. hypercare and model improvements.

## Week-by-week MVP plan

| Week | Scope and client decisions | Site and edge | AI | Application and Azure | Test and release |
|---|---|---|---|---|---|
| 1 | Confirm SOP, violations, architecture, acceptance scenarios, retention decisions | Complete site survey and camera plan | Define data collection and annotation guide | Define contracts, environments, identity, and Azure prerequisites | Create test strategy and baseline backlog |
| 2 | Approve camera positions and hardware BOM | Install/configure hardware or prepare final installation; begin footage collection | Curate initial dataset | Initialize API, dashboard, database, Bicep, CI | Hardware and stream acceptance begins |
| 3 | Close outstanding workflow decisions | Implement RTSP ingest, camera health, zones, rolling buffer | Annotate dataset and train baseline detector | Implement API skeleton, schema, authentication skeleton, dashboard shell | Unit and component tests |
| 4 | Review baseline system behavior | Complete local spool, evidence clips, service packaging | Implement tracking and initial worker-bale association | Implement event ingestion, storage, list/detail APIs | First end-to-end recorded-footage flow |
| 5 | Validate reason codes and review workflow | Stabilize reconnect and service recovery | Implement interaction signals and SOP state machine | Build event table, detail, filters, evidence access | Scenario testing and AI error review |
| 6 | Confirm MVP reporting scope | Integrate edge synchronization | Tune violation rules and export model runtime | Complete review status, remarks, exports, health, Azure deployment | Security, resilience, and performance testing |
| 7 | Prepare UAT users and schedule | Deploy full edge stack on site | Live calibration and threshold tuning | Deploy UAT platform and complete dashboard | End-to-end site testing; close P0/P1 defects |
| 8 | Conduct UAT and sign-off | Final production configuration and release package | Freeze MVP model/rules/configuration | Production-approved deployment, documentation, and training | UAT, release notes, handover, `v1.0.0-mvp` |

## Hypercare plan

| Hypercare week | Outcome |
|---|---|
| 1 | Monitor operations, review false positives/negatives, close production P0/P1 issues |
| 2 | AI refinement cycle 1 and dashboard/API defect fixes |
| 3 | Performance, evidence, storage, and configuration tuning |
| 4 | AI refinement cycle 2 and regression testing against locked acceptance set |
| 5 | Final stabilization, documentation update, release, and closure report |

## Milestone definitions

### M0 — Scope and architecture locked

- approved SOP sequence;
- approved violation taxonomy;
- architecture decision recorded;
- acceptance scenarios defined;
- client dependencies logged.

### M1 — Site and hardware ready

- camera plan approved;
- hardware and network installed/configured;
- camera streams accepted;
- edge workstation baseline complete.

### M2 — Edge video platform ready

- stable ingest from four cameras;
- camera health;
- zones;
- rolling evidence buffer;
- durable local event spool;
- service restart and reconnect behavior.

### M3 — AI compliance model ready

- detector and tracker validated;
- interaction signal implemented;
- SOP rules generate normal/missed/incomplete outcomes;
- versioned model and configuration package available.

### M4 — Backend and Azure platform ready

- event ingestion and idempotency;
- Azure SQL and evidence storage;
- authentication;
- filtering, review, remarks, exports, and monitoring;
- CI/CD and infrastructure templates.

### M5 — Dashboard ready

- live view;
- KPI cards;
- event table and detail;
- evidence preview;
- filters, review, remarks, exports, and health.

### M6 — MVP accepted

- end-to-end deployment;
- acceptance scenarios executed;
- P0/P1 issues closed or accepted;
- training and documentation complete;
- release tagged.

### M7 — Hypercare completed

- agreed improvement cycles delivered;
- regression results accepted;
- operational documentation updated;
- closure report issued.

## Dependencies that can affect the schedule

- camera and workstation procurement;
- site induction and working-hour permissions;
- final SOP availability;
- availability of realistic missed/incomplete scenarios;
- client security approval for footage handling;
- Azure subscription, identity, networking, and deployment access;
- client review turnaround;
- hardware or lighting changes after the site survey.

## Change control

A requirement that affects scope, architecture, camera quantity, external integration, retention, accuracy commitments, or delivery timeline must be:

1. documented;
2. impact-assessed;
3. commercially and technically approved;
4. scheduled only after approval.

Unapproved change requests remain outside the MVP backlog.
