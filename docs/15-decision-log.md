# Decision Log

Record material architecture, scope, security, deployment, and AI decisions here. Each decision must include context, alternatives, outcome, owner, and date.

## ADR-001 — Use one monorepo for the MVP

- **Status:** Accepted
- **Decision:** Keep dashboard, API, edge agent, AI inference, compliance engine, infrastructure, contracts, tests, and documentation in this repository.
- **Reason:** The fixed-scope eight-week MVP requires coordinated event contracts and one integrated release. Multiple repositories would add access, release, and dependency overhead without a current operational benefit.
- **Revisit when:** client access segregation, independent vendors, multi-site productization, or separate release ownership is introduced.

## ADR-002 — Run camera inference at the edge

- **Status:** Accepted
- **Decision:** Decode camera streams, run AI inference, evaluate SOP rules, and generate evidence on the site workstation.
- **Reason:** Reduces latency, avoids continuous raw-video upload, and preserves core operation during internet interruptions.
- **Consequence:** Edge deployment, service recovery, local buffering, GPU drivers, and storage health are production concerns.

## ADR-003 — Use Azure for approved management-plane services

- **Status:** Proposed pending client environment confirmation
- **Decision:** Host the dashboard/API, event metadata, evidence objects, identity integration, secrets, and monitoring in the approved Azure environment.
- **Reason:** Aligns with the client's Microsoft/Azure environment while retaining edge processing.
- **Pending:** tenant, subscription, networking, identity, data residency, and deployment approvals.

## ADR-004 — No permanent bale identity in MVP

- **Status:** Accepted
- **Decision:** Use temporary camera-local track IDs only.
- **Reason:** The awarded scope does not include barcode, QR, RFID, or production-system integration.
- **Consequence:** The system can evaluate an inspection sequence while visible but cannot guarantee one business identity across cameras or systems.

## ADR-005 — No face recognition or employee identification

- **Status:** Accepted
- **Decision:** Person detections are temporary anonymous tracks used only for process-interaction logic.
- **Reason:** Worker identity is outside scope and introduces unnecessary privacy and compliance risk.

## ADR-006 — Combine AI signals with deterministic SOP rules

- **Status:** Accepted
- **Decision:** Use detection/tracking/action signals as inputs to a versioned state machine rather than one opaque end-to-end compliance classifier.
- **Reason:** Improves explainability, testability, calibration, and reason-code generation.

## ADR-007 — Keep raw datasets and production models outside Git

- **Status:** Accepted
- **Decision:** Store footage, annotations, evidence, and model binaries in approved restricted storage. Git contains code, schemas, manifests, checksums, and documentation only.
- **Reason:** Protects client data and avoids repository-size and access-control problems.

## ADR-008 — Use performance-based accuracy acceptance

- **Status:** Accepted
- **Decision:** Define numerical AI acceptance thresholds only after representative footage and client-approved scenarios are available.
- **Reason:** The proposal does not support a universal accuracy guarantee independent of lighting, camera placement, occlusion, and SOP consistency.

## ADR template

```markdown
## ADR-XXX — Decision title

- **Status:** Proposed / Accepted / Superseded / Rejected
- **Date:** YYYY-MM-DD
- **Owner:** Name or role
- **Context:**
- **Options considered:**
- **Decision:**
- **Reason:**
- **Consequences:**
- **Follow-up issues:**
```
