# Software-Completion Release Plan

**Approved:** July 31, 2026  
**Controlling epic:** #77  
**Final delivery control:** #75

## 1. Delivery Direction

The deployed frontend was reviewed and approved under #60. Backend/API implementation has formal go-ahead.

The immediate delivery target is a **software-complete PTC AI Bale platform** in which every application feature, API, database behavior, frontend integration, simulator contract, evidence flow, report, security control, test, deployment and runbook is complete.

At the software-complete checkpoint, only these two final integrations may remain:

1. #84 — actual factory hardware and camera streams;
2. #85 — actual PTC AI model, tuning and site validation.

No other unfinished software capability may be hidden under either issue.

## 2. Locked Architecture

- React, TypeScript and Vite frontend approved under #60;
- Node.js, Express and strict TypeScript API;
- PostgreSQL 17 and Prisma migrations;
- fixed viewer, supervisor and administrator PoC roles;
- secure server-side sessions and authorization;
- local-first/offline-capable factory application;
- shared OpenAPI/TypeScript contracts;
- Vercel frontend and reviewed AWS backend/deployment package;
- camera, edge and AI integrations behind versioned adapters;
- real footage, credentials, evidence, datasets and model binaries outside GitHub.

MongoDB/Mongoose, parallel MERN work, an independent frontend redesign and an unapproved competing cloud architecture are not permitted.

## 3. Ownership

| Area | Owner | Acceptance/review |
|---|---|---|
| Technical delivery and backend | `zubairahmed02` | PM review by `arifkhannamal9288` |
| Frontend source reconciliation and integration | `zubairahmed02` | PM review by `arifkhannamal9288` |
| Deployment, CI and operations | `qamarmujtaba` | Technical review by `zubairahmed02`; PM acceptance |
| Scope, UAT and client handover | `arifkhannamal9288` | Technical evidence from Zubair/Qamar |
| Repository privacy/governance | repository owner + PM | #14 acceptance |

## 4. Executable Release Train

### Gate 1 — Approved source reconciliation: #78

- identify the exact repository branch/commit deployed to the approved Vercel build;
- compare it with PR #69 and the older dashboard branch;
- bring any approved differences into `feature/68-platform-api` without redesign;
- record Vercel build settings and non-secret environment names;
- obtain PM confirmation on the reconciled build.

### Gate 2 — Baseline consolidation: PR #70 into PR #69

- Qamar and Zubair review PR #70;
- resolve deployment review feedback;
- merge PR #70 into `feature/68-platform-api`;
- rerun frontend, backend, PostgreSQL recovery, container and browser tests;
- Zubair completes technical review of PR #69;
- Arif records PM review;
- merge PR #69 into `main` only after green consolidated evidence.

### Gate 3 — Complete backend: #79

Complete and certify:

- authentication/session lifecycle and server authorization;
- Overview summaries and recent events;
- event list/detail/filter/search/sort/pagination;
- review/remarks, immutable machine outcome, audit and concurrency;
- camera registry/status and system-health APIs;
- reports/exports and release/configuration metadata;
- PostgreSQL schema, migrations, indexes, bootstrap, backup and restore;
- OpenAPI/contracts, validation, errors and correlation IDs.

Reconcile supporting issues #36, #39, #40 and #41 with objective evidence.

### Gate 4 — Live frontend/backend integration: #80

- connect every approved page to live APIs;
- connect every approved mutation to PostgreSQL persistence;
- configure secure same-origin proxy/origin and cookie behavior;
- prohibit silent mock fallback in live environments;
- test all routes, roles, states, filters, review conflict and downloads;
- preserve the approved visual design.

### Gate 5 — Pre-hardware contracts and simulators: #81

- version camera, edge-health, event, evidence-reference and AI-adapter contracts;
- implement machine/service authentication;
- implement idempotent ingestion and deterministic acknowledgements;
- define durable-spool retry/replay behavior;
- provide deterministic simulators for four logical cameras, health, outcomes, evidence states, duplicates, outages and load;
- ensure simulators are explicit and disabled in production by default.

### Gate 6 — Evidence, realtime and reporting: #82

- protected sample snapshot/clip storage and authorized retrieval;
- relational evidence metadata, checksum and lifecycle states;
- retention, consistency scan and recoverable failure states;
- authenticated realtime event/health updates with polling/resync fallback;
- bounded CSV and approved PDF reporting;
- operational health, release, storage and retention diagnostics.

### Gate 7 — Software certification: #83

- complete CI, security, migration, container, contract and browser gates;
- deploy approved frontend and backend/PostgreSQL stack;
- verify TLS, cookies, proxy/CORS, security headers and negative authorization;
- validate restart, database outage, duplicate replay, backup, restore and rollback;
- run complete simulator-driven UAT;
- resolve every P0/P1 software defect;
- publish release manifest, runbooks and PM acceptance.

Supporting release issues include #43, #49, #50, #63, #67, #68 and #71.

### Gate 8 — Final physical integrations

After #83 acceptance only:

- #84 replaces the camera/edge simulator with actual factory hardware and streams;
- #85 replaces the AI simulator with the actual PTC model and completes site evaluation.

## 5. Required Software Features

### User and access

- Login, session restore and logout;
- viewer, supervisor and administrator behavior;
- machine/service identity separate from users;
- server-side authorization and negative tests;
- secure cookie and session expiry/revocation.

### Overview

- inspection totals by approved outcome;
- unreviewed/pending count;
- camera/system state summary;
- recent events;
- consistent time range and UTC semantics.

### Live Monitoring

- camera registry and cards;
- online/offline/reconnecting/disabled/degraded states;
- explicit simulated/placeholder view before hardware;
- future live-view contract without frontend redesign.

### Events and review

- server-side search/filter/sort/pagination;
- stable detail routes;
- ordered SOP steps, outcome, reason, confidence and versions;
- evidence metadata and protected preview/download;
- supervisor/admin review and remarks;
- transactional audit and optimistic concurrency.

### System Health

- API, PostgreSQL, storage, camera adapter, edge adapter, AI adapter and spool/queue states;
- operational failures distinct from process violations;
- stale heartbeat and dependency diagnostics;
- release/schema identity.

### Reports

- summaries matching Overview/Events filters;
- bounded CSV;
- approved basic PDF;
- secure authenticated downloads;
- no scheduled email delivery unless later approved.

## 6. Release Test Matrix

### Automated

- frozen installs, lint and strict types;
- unit/component/service tests;
- PostgreSQL integration and migration tests;
- authorization and negative security matrix;
- idempotency and concurrent duplicate tests;
- review conflict and audit tests;
- evidence access/consistency/retention tests;
- realtime reconnect/resync tests;
- PDF/CSV reconciliation;
- full live Playwright against PostgreSQL;
- restart, backup and restore tests;
- secret/restricted-artifact and container scans.

### Manual/UAT

- each role and approved page;
- each mutation and permission boundary;
- loading, empty, stale, offline and retry states;
- 401, 403, 404, 409, 429 and 5xx behavior;
- camera/AI/evidence/storage/dependency states;
- refresh, deep links and browser navigation;
- deployment, rollback and recovery smoke;
- PM sign-off against the approved frontend.

## 7. PR and Branch Rules

- PR #70 merges into the PR #69 branch, not directly into `main`;
- PR #69 reaches `main` after source reconciliation, deployment consolidation, green checks and reviews;
- subsequent work uses small issue-linked PRs from current `main`;
- one primary issue per PR;
- schema/API/deployment impact and tests are mandatory;
- contracts and runbooks change with behavior;
- unrelated refactoring is excluded;
- PM reviews user-facing behavior;
- Zubair reviews backend/contracts;
- Qamar reviews deployment/runtime impact.

## 8. Software-Complete Definition of Done

The software release is complete when:

- the exact approved frontend source is in the authoritative branch;
- every approved page uses live APIs in live mode;
- every approved mutation persists and survives restart;
- auth, roles, events, review/audit, camera state, health, evidence, realtime and reports are complete;
- simulators prove every hardware/AI contract and operational state;
- PostgreSQL migrations, backup and restore are reproducible;
- deployment is repeatable and rollback is tested;
- CI/security/UAT are green;
- no known P0/P1 software defect remains;
- release manifest and all operational runbooks exist;
- PM accepts the release;
- only #84 and #85 remain.

## 9. Data and Security Boundary

Never commit:

- factory videos/images or real evidence;
- camera URLs, credentials or private IP plans;
- client security/network details;
- training/calibration/acceptance datasets;
- database or evidence backups;
- model binaries;
- generated runtime secret files.

Use restricted storage and reference only sanitized IDs, manifests, checksums, versions, metrics and decisions in GitHub.