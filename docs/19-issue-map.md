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
#11/#35 -> #36 -> #37/#38/#39/#40 -> #42/#43
#49 -> #50/#51 -> #52 -> #53 -> #54 -> #55/#56 -> #57
```

## Immediate execution queues

### Client and architecture queue

Start with #59, #14, #9, #11, #12, #13, #15, #16 and #17.

### Pre-visit dashboard queue

Run #60 first, then #35, #41/#44, #45/#46/#47, #48 and #61. This work may proceed with synthetic data and approved sample media without waiting for final camera, AI or SOP implementation, provided all unresolved fields are clearly marked as placeholders.

Do not begin final annotation definitions, compliance logic, camera approval, or acceptance commitments until the Bangladesh-reference mapping, PTC SOP, violation taxonomy, and PTC-specific UAT basis are sufficiently resolved.
