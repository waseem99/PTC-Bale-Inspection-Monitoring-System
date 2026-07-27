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
- #68 — First backend/API vertical slice with persistent seeded data — **implementation complete; objective validation pending**
- #35 — Node.js platform API, shared contracts, and local stack — **implemented within #68**
- #36 — MongoDB models, indexes and deterministic seed tooling — **first-slice implementation complete; migration/Azure validation remains**
- #37 — Secure idempotent edge event and health ingestion API — **next integration**
- #38 — Real evidence storage, retrieval, retention and optional Azure synchronization — **next integration**
- #39 — Event list, detail, review, remarks and audit APIs — **implemented within #68; validation pending**
- #40 — KPI, camera, health and CSV APIs — **REST slice implemented; Socket.IO/PDF remain follow-on**
- #41 — Fixed-user PoC authentication and future Entra adapter — **local fixed-user slice implemented; Entra remains follow-on**
- #42 — Approved Azure management plane with Bicep
- #43 — CI, security checks, local packages, and approved Azure workflows

## M5 — Dashboard and development demo

- #6 — Epic: local supervisor dashboard and approved central access
- #44 — Portal shell, fixed-user PoC authentication and mock/live adapter — **implemented**
- #45 — Overview, camera monitoring and system status — **implemented**
- #46 — Event list, filters and demo states — **implemented**
- #47 — Event detail, evidence review and supervisor feedback — **implemented**
- #48 — Reports, resilience, accessibility, tests and demo readiness — **implemented**
- #61 — Isolated development portal hosting — **deployment package complete; protected HTTPS endpoint pending**
- #63 — Production-ready frontend epic — **implementation complete; release gates pending**
- #64 — Routing, typed API client, runtime contracts and query caching — **implemented**
- #65 — Pagination, filtering, sorting, exports and mutation UX — **implemented**
- #66 — Resilience, accessibility, responsive behavior and performance — **implemented**
- #67 — Automated tests, security controls, CI gates and release readiness — **workflow/code complete; execution evidence pending runner restoration**

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
#68 validation -> #37/#38 -> Python edge/evidence integration -> #42/#43
#49 -> #50/#51 -> #52 -> #53 -> #54 -> #55/#56 -> #57
```

## Immediate execution queues

### Client and architecture queue

Continue #59, #14, #9, #11, #12, #13, #15, #16 and #17 in parallel with work that does not depend on final SOP interpretation.

### Frontend release queue

The complete frontend implementation is in PR #62. Finish #61 by provisioning the protected HTTPS demo endpoint. Finish #67 by restoring GitHub Actions execution or attaching an approved self-hosted runner, passing all quality/container/E2E gates, and completing browser UAT.

### Backend/API validation queue

The first REST and seeded-data implementation is in PR #69. Complete #68 by:

1. restoring GitHub-hosted Actions or attaching the `ptc-api` self-hosted runner;
2. passing backend lint, strict TypeScript, Jest/Supertest/MongoDB tests and production build;
3. passing API container health checks;
4. running the production frontend against the seeded live API through Playwright;
5. completing the manual browser/API checklist in `docs/28-backend-validation-and-local-runbook.md`.

### Next backend integrations

After #68 validation:

1. #37 — Python edge service authentication, idempotent event/health ingestion and spool acknowledgement;
2. #38 — real snapshot/clip storage, authorized retrieval and retention;
3. Socket.IO event and health updates;
4. approved Azure synchronization and Entra ID only where confirmed.

Do not treat synthetic records as client acceptance evidence. Do not finalize annotation definitions, compliance logic, camera approval or AI acceptance commitments until the Bangladesh-reference mapping, PTC SOP, violation taxonomy and PTC-specific UAT basis are sufficiently resolved.
