# GitHub Issue Map

This is the implementation backlog created from the awarded scope. Each child issue references its parent epic and contains testable acceptance criteria.

## M0 — Scope and architecture

- #1 — Epic: lock scope, SOP, acceptance, and architecture
- #9 — Confirm the approved bale inspection SOP and operational exceptions
- #10 — Define violation taxonomy, reason codes, and unresolved outcomes
- #11 — Approve hybrid edge and Azure deployment topology
- #12 — Confirm retention, evidence, review workflow, and report boundaries
- #13 — Define the locked UAT scenario set and AI acceptance method
- #14 — Make the repository private and apply GitHub governance

## M1 — Site and hardware readiness

- #2 — Epic: site, hardware, camera, and network readiness
- #15 — Conduct site survey and approve four-camera placement plan
- #16 — Finalize BOQ-aligned hardware BOM, vendors, warranties, and delivery dates
- #17 — Define camera network, IP addressing, time synchronization, and security plan
- #18 — Install and configure cameras, cabling, PoE switch, workstation, storage, and UPS
- #19 — Validate image quality, four-stream stability, and workstation capacity

## M2 — Edge video and evidence platform

- #3 — Epic: edge video, evidence, and synchronization platform
- #20 — Initialize edge services, configuration schema, and camera registry
- #21 — Implement RTSP camera ingestion, timestamps, and automatic reconnect
- #22 — Implement camera and edge service health monitoring
- #23 — Implement configurable zones, frame sampling, and browser-compatible live view
- #24 — Implement rolling video buffer and event evidence generation
- #25 — Implement durable local event spool and idempotent cloud synchronization
- #26 — Package edge runtime as managed services with watchdog, release, and recovery tests

## M3 — AI inspection compliance

- #4 — Epic: AI inspection compliance engine
- #27 — Approve site-footage collection, staging, storage, and privacy plan
- #28 — Create annotation guide, dataset manifest, and quality-control process
- #29 — Collect, curate, annotate, and version dataset v1
- #30 — Train and evaluate the baseline bale and worker detector
- #31 — Implement camera-local tracking and worker-to-bale association
- #32 — Implement bale opening and inspection-interaction detection
- #33 — Implement versioned SOP state machine and violation reason codes
- #34 — Build AI evaluation harness, export runtime model, and benchmark four-stream inference

## M4 — MERN API, data, Azure, and CI/CD

- #5 — Epic: Node.js platform API, MongoDB data layer, and Azure foundation
- #35 — Initialize MERN/Python monorepo application skeleton and shared contracts
- #36 — Implement MongoDB collections, Mongoose schemas, indexes, migrations, and test fixtures
- #37 — Implement secure idempotent edge event and health ingestion API
- #38 — Implement secure evidence upload, metadata, retrieval, and retention hooks
- #39 — Implement event list, detail, filters, review status, remarks, and audit APIs
- #40 — Implement KPI summaries, health APIs, real-time notifications, and basic exports
- #41 — Integrate Microsoft Entra ID and enforce the approved access model
- #42 — Define and deploy Azure infrastructure with Bicep, Key Vault, and monitoring
- #43 — Implement GitHub Actions CI, security checks, and Azure deployment workflows

## M5 — Dashboard

- #6 — Epic: supervisor and management dashboard
- #44 — Build dashboard shell, Entra sign-in, routing, and authenticated API client
- #45 — Build KPI, live camera, and system health dashboard views
- #46 — Build paginated event and violation table with approved filters
- #47 — Build event detail, evidence preview, review status, and operator remarks
- #48 — Implement dashboard exports, resilience states, accessibility, and end-to-end tests

## M6 — MVP integration and release

- #7 — Epic: integration, testing, calibration, training, and MVP release
- #49 — Deploy and validate the complete edge-to-Azure-to-dashboard flow
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
#9 -> #10 -> #13
#15 -> #16/#17 -> #18 -> #19
#20 -> #21/#22/#23 -> #24/#25 -> #26
#27 -> #28 -> #29 -> #30 -> #31/#32 -> #33 -> #34
#35 -> #36 -> #37/#38/#39/#40/#41 -> #42/#43
#44 -> #45/#46/#47 -> #48
#49 -> #50/#51 -> #52 -> #53 -> #54 -> #55/#56 -> #57
```

## First execution queue

Start with #14, #9, #11, #12, #13, #15, #16, #17, #20, and #35. Do not begin final compliance logic or acceptance commitments until #9, #10, and #13 are complete.
