# Delivery Plan

## Timeline

- **MVP / PoC:** 8 weeks
- **Hypercare and improvements:** 5 weeks

The schedule assumes timely reference-to-PTC mapping, site access, hardware availability, representative PTC footage, approved SOP definitions, local deployment decisions, any required Azure access, and client UAT participation.

## Workstreams

1. Bangladesh-reference mapping, PTC SOP, scope, and acceptance;
2. site, hardware, and camera readiness;
3. local edge video and evidence platform;
4. PTC-specific AI detection, tracking, and compliance engine;
5. local Node.js API, MongoDB data, evidence storage, and approved Azure management plane;
6. local React dashboard and approved central access;
7. integration, UAT, training, and PoC release;
8. hypercare and model improvements.

## Week-by-week MVP plan

| Week | Scope and client decisions | Site and edge | AI | Local MERN application and approved Azure | Test and release |
|---|---|---|---|---|---|
| 1 | Complete #59 reference mapping; confirm PTC SOP, terminology, violations, local/Azure boundary, acceptance scenarios, and retention decisions | Complete site survey; compare overhead/oblique/side views; prepare camera plan | Define PTC data collection, annotation, and reference-data rules | Define local contracts, MongoDB approach, local access, deployment modes, and approved Azure prerequisites | Create test strategy, PoC stage gates, and baseline backlog |
| 2 | Approve camera positions, hardware BOM, and reference-to-PTC exclusions | Install/configure hardware or prepare final installation; begin PTC footage collection | Curate initial PTC dataset | Initialize local Node API, React dashboard, local MongoDB schemas, edge deployment scripts, conditional Bicep, and CI | Hardware, field-of-view, and stream acceptance begins |
| 3 | Close outstanding physical workflow and exception decisions | Implement RTSP ingest, orientation, camera health, zones, and rolling buffer | Annotate PTC dataset and train baseline detector | Implement local API skeleton, schemas/indexes, local access skeleton, and dashboard shell | Unit and component tests |
| 4 | Review baseline system behavior against the approved PTC workflow | Complete local spool, local evidence clips, and service packaging | Implement tracking and initial worker-bale association | Implement local event ingestion, protected evidence storage, MongoDB persistence, and list/detail APIs | First end-to-end recorded-PTC-footage flow |
| 5 | Validate reason codes and review workflow | Stabilize reconnect and service recovery | Implement opening/frisking interaction signals and SOP state machine | Build event table, detail, filters, evidence access, local real-time channel, and health | Scenario testing and AI error review |
| 6 | Confirm final on-demand reporting and access scope | Integrate local application persistence and optional approved synchronization | Tune violation rules and export model runtime | Complete review status, remarks, exports, local access, health, and approved Azure management plane | Security, offline resilience, and performance testing |
| 7 | Prepare UAT users, schedule, and locked PTC scenarios | Deploy full local stack on site | Live PTC calibration and threshold tuning | Deploy local UAT application; deploy approved Azure components where applicable | End-to-end site testing; close P0/P1 defects |
| 8 | Conduct UAT and record PoC decision | Final local production configuration and release package | Freeze PoC model/rules/configuration | Final approved local/hybrid deployment, documentation, and training | UAT, release notes, handover, `v1.0.0-mvp` |

## Hypercare plan

| Hypercare week | Outcome |
|---|---|
| 1 | Monitor local operation, review false positives/negatives, close production P0/P1 issues |
| 2 | AI refinement cycle 1 and dashboard/API defect fixes |
| 3 | Performance, evidence, storage, database, synchronization, and configuration tuning |
| 4 | AI refinement cycle 2 and regression testing against the locked PTC acceptance set |
| 5 | Final stabilization, documentation update, release, and closure report |

## Milestone definitions

### M0 — Reference, scope, and architecture locked

- Bangladesh reference mapped to PTC as in-scope, excluded, future, or unresolved;
- approved PTC SOP sequence and terminology;
- approved violation taxonomy;
- local-first and approved Azure responsibility decision recorded;
- PTC-specific acceptance scenarios defined;
- data-use rights and critical client dependencies logged.

### M1 — Site and hardware ready

- camera plan approved from PTC sample views;
- hardware and network installed/configured;
- camera streams, orientation, and timestamps accepted;
- edge workstation and UPS baseline complete.

### M2 — Local edge video platform ready

- stable ingest from four cameras;
- camera health;
- zones and temporary sessions;
- rolling evidence buffer;
- durable local event spool;
- service restart and reconnect behavior;
- optional synchronization boundary ready.

### M3 — PTC AI compliance model ready

- detector and tracker validated on PTC footage;
- opening/frisking interaction signal implemented;
- SOP rules generate completed/missed/incomplete/unresolved outcomes;
- Bangladesh media is not used as PTC acceptance evidence;
- versioned model and configuration package available.

### M4 — Local MERN application and approved Azure management plane ready

- locally deployed Node.js/Express event ingestion and idempotency;
- local MongoDB-compatible metadata persistence and indexes;
- local protected evidence storage;
- approved local access control;
- filtering, review, remarks, exports, local real-time updates, and health;
- optional approved Azure database/Blob/Entra/monitoring components;
- CI/CD, local release package, and conditional Bicep templates.

### M5 — Local React dashboard ready

- local live view;
- KPI cards;
- event table and detail;
- local evidence preview;
- filters, review, remarks, exports, and health;
- optional approved central access.

### M6 — PoC accepted

- complete local deployment;
- PTC-specific acceptance scenarios executed;
- offline behavior validated;
- approved Azure synchronization validated where applicable;
- P0/P1 issues closed or accepted;
- training and documentation complete;
- PoC decision recorded and release tagged.

### M7 — Hypercare completed

- agreed improvement cycles delivered;
- regression results accepted;
- operational documentation updated;
- closure report issued.

## Dependencies that can affect the schedule

- reference-feature clarification and data-use rights;
- camera and workstation procurement;
- site induction and working-hour permissions;
- final PTC SOP availability;
- availability of realistic missed/incomplete PTC scenarios;
- client security approval for footage handling;
- local dashboard/access decisions;
- Azure subscription, identity, networking, MongoDB service, and deployment access where required;
- client review turnaround;
- hardware, camera-angle, or lighting changes after the site survey.

## Change control

A requirement that affects scope, architecture, camera quantity, scanner/IoT/external integration, retention, accuracy commitments, technology standards, or delivery timeline must be:

1. documented;
2. impact-assessed;
3. commercially and technically approved;
4. scheduled only after approval.

Features visible in the Bangladesh reference or generic computer-vision demonstration are not automatically included. Unapproved change requests remain outside the PoC backlog.
