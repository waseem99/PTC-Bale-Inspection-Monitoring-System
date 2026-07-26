# GitHub Issue Map

This is the implementation backlog created from the awarded scope. Each child issue references its parent epic and contains testable acceptance criteria.

## M0 — Scope and architecture

- #1 — Epic: lock scope, SOP, acceptance, and architecture
- #59 — Translate Bangladesh reference PoC into the approved PTC validation baseline
- #9 — Confirm the approved bale inspection SOP and operational exceptions
- #10 — Define violation taxonomy, reason codes, and unresolved outcomes
- #11 — Approve local-first edge and Azure-aligned deployment topology
- #12 — Confirm retention, evidence, review workflow, and report boundaries
- #13 — Define the locked UAT scenario set and AI acceptance method
- #14 — Complete repository governance and GitHub Project setup
- #60 — Approve PoC dashboard flow, demo fields, and PTC visual direction

## M1 — Site and hardware readiness

- #2 — Epic: site, hardware, camera, and network readiness
- #15 — Conduct site survey and approve four-camera placement plan
- #16 — Finalize BOQ-aligned hardware BOM, vendors, warranties, and delivery dates
- #17 — Define camera network, IP addressing, time synchronization, and security plan
- #18 — Install and configure cameras, cabling, PoE switch, workstation, storage, and UPS
- #19 — Validate image quality, four-stream stability, and workstation capacity

## M2 — Edge video and evidence platform

- #3 — Epic: local edge video, evidence, and optional synchronization platform
- #20 — Initialize edge services, configuration schema, and camera registry
- #21 — Implement RTSP camera ingestion, timestamps, orientation, and automatic reconnect
- #22 — Implement camera and edge service health monitoring
- #23 — Implement configurable zones, frame sampling, and browser-compatible live view
- #24 — Implement rolling video buffer and event evidence generation
- #25 — Implement durable local event spool and idempotent optional Azure synchronization
- #26 — Package edge runtime as managed services with watchdog, release, and recovery tests

## M3 — AI inspection compliance

- #4 — Epic: AI inspection compliance engine
- #27 — Approve PTC site-footage collection, reference-data use, staging, storage, and privacy plan
- #28 — Create annotation guide, dataset manifest, and quality-control process
- #29 — Collect, curate, annotate, and version PTC dataset v1
- #30 — Train and evaluate the baseline bale and worker detector
- #31 — Implement camera/zone-local tracking and worker-to-bale association
- #32 — Implement bale opening and frisking/inspection-interaction detection
- #33 — Implement versioned SOP state machine and violation reason codes
- #34 — Build AI evaluation harness, export runtime model, and benchmark four-stream inference

## M4 — Local MERN application, approved Azure management plane, and CI/CD

- #5 — Epic: local MERN application and approved Azure management plane
- #68 — Deliver the first backend/API vertical slice with persistent seeded demo data
- #35 — Initialize application packages and shared contracts from the approved monorepo scaffold
- #36 — Implement local MongoDB data model, indexes, migrations, and Azure-compatible persistence
- #37 — Implement secure idempotent local event and health ingestion API
- #38 — Implement secure local evidence storage, retrieval, retention, and optional Azure synchronization
- #39 — Implement event list, detail, filters, review status, remarks, and audit APIs
- #40 — Implement KPI summaries, health APIs, real-time notifications, and basic exports
- #41 — Implement simple fixed-user PoC access control and preserve a future Entra adapter
- #42 — Define and deploy the approved Azure management plane with Bicep
- #43 — Implement GitHub Actions CI, security checks, local packages, and approved Azure deployment workflows

## M5 — Dashboard and development demo

- #6 — Epic: local supervisor dashboard and approved central access
- #44 — Build React portal shell, fixed-user PoC authentication, and mock/live API adapter
- #45 — Build operations overview, four-camera monitoring, and system-status views
- #46 — Build inspection event list, violation filters, and demo data states
- #47 — Build event detail, evidence review, and supervisor feedback flow
- #48 — Complete reports, resilience states, accessibility, tests, and demo deployment readiness
- #61 — Provision isolated development portal hosting and demo configuration
- #63 — Make the dashboard frontend production-ready before live API integration
- #64 — Add production frontend architecture, routing, typed API client, and query caching
- #65 — Implement server-compatible pagination, filtering, sorting, exports, and mutation UX
- #66 — Complete frontend resilience, accessibility, responsive behavior, and performance hardening
- #67 — Add frontend automated tests, security controls, CI gates, and release readiness

## M6 — MVP integration and release

- #7 — Epic: integration, testing, calibration, training, and local PoC release
- #49 — Deploy and validate the complete local PoC and approved Azure synchronization
- #50 — Execute resilience, performance, security, and recovery test suite
- #51 — Perform live AI calibration and freeze the MVP model, SOP rules, and camera configuration
- #52 — Execute client UAT and close release-blocking defects
- #53 — Complete training, handover documentation, release manifest, and MVP tag

## M7 — Hypercare and stabilization

- #8 — Epic: five-week hypercare and final stabilization
- #54 — Establish hypercare monitoring, review cadence, and production defect triage
- #55 — Deliver controlled AI improvement cycle 1
- #56 — Resolve production defects and tune performance, storage, evidence, and monitoring
- #57 — Deliver AI improvement cycle 2, final regression, documentation, and closure release

## Critical dependency chain

```text
#59 -> #9 -> #10 -> #13
#59 -> #15 -> #16/#17 -> #18 -> #19
#15/#19/#59 -> #27 -> #28 -> #29 -> #30 -> #31/#32 -> #33 -> #34
#20 -> #21/#22/#23 -> #24/#25 -> #26
#60 -> #35 -> #41/#44 -> #45/#46/#47 -> #48 -> #61
#68 -> #35/#36/#41 -> #39/#40 -> frontend live-mode integration
#68 accepted -> #37/#38 -> Python edge/evidence integration -> #42/#43
#49 -> #50/#51 -> #52 -> #53 -> #54 -> #55/#56 -> #57
```

## Immediate execution queues

### Client and architecture queue

Continue #59, #14, #9, #11, #12, #13, #15, #16 and #17 in parallel with work that does not depend on final SOP interpretation.

### Frontend release queue

Complete #61 and #67, then close #63 after the protected demo and objective validation gates pass.

### Backend/API vertical-slice queue

Use #68 as the controlling execution issue:

1. #35 — initialize the Node.js/Express package, contracts and local startup;
2. #36 — implement MongoDB schemas, indexes and deterministic seed/reset tooling;
3. #41 — implement fixed-user server-side authentication and authorization;
4. #39 — implement paginated event, detail, review and audit APIs;
5. #40 — implement dashboard summary, cameras, health and filtered CSV export;
6. switch the existing frontend to live mode and run end-to-end tests against the seeded API;
7. after acceptance, proceed to #37 edge ingestion and #38 real evidence handling.

This queue intentionally uses synthetic persisted data first. It does not wait for camera installation, PTC footage or final AI models, and it does not treat the synthetic outcomes as client acceptance evidence.
