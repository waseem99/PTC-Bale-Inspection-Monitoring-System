# Decision Log

Record material architecture, scope, security, deployment, and AI decisions here. Each decision must include context, alternatives, outcome, owner, and date.

## ADR-001 — Use one monorepo for the MVP

- **Status:** Accepted
- **Decision:** Keep dashboard, API, edge agent, AI inference, compliance engine, infrastructure, contracts, tests, database migrations, and documentation in this repository.
- **Reason:** The fixed-scope eight-week MVP requires coordinated event contracts and one integrated release. Multiple repositories would add access, release, and dependency overhead without a current operational benefit.
- **Revisit when:** client access segregation, independent vendors, multi-site productization, or separate release ownership is introduced.

## ADR-002 — Run camera inference at the edge

- **Status:** Accepted
- **Decision:** Decode camera streams, run AI inference, evaluate SOP rules, and generate evidence on the site workstation.
- **Reason:** Reduces latency, avoids continuous raw-video upload, and preserves core operation during internet interruptions.
- **Consequence:** Edge deployment, service recovery, local buffering, GPU drivers, PostgreSQL availability, and storage health are production concerns.

## ADR-003 — Use Azure for approved management-plane services

- **Status:** Proposed pending client environment confirmation
- **Decision:** Host approved dashboard/API, PostgreSQL metadata, evidence objects, identity integration, secrets, and monitoring services in the client-approved Azure environment while retaining the locally functional edge pipeline, local PostgreSQL database, and local intranet capability committed in the BOQ.
- **Reason:** Aligns with the client's Microsoft/Azure environment while retaining edge processing and offline operation.
- **Pending:** tenant, subscription, networking, identity, data residency, Azure Database for PostgreSQL service/tier, local-versus-Azure dashboard boundary, and deployment approvals.

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
- **Decision:** Store footage, annotations, evidence, database backups, and model binaries in approved restricted storage. Git contains code, schemas, migrations, manifests, checksums, and documentation only.
- **Reason:** Protects client data and avoids repository-size and access-control problems.

## ADR-008 — Use performance-based accuracy acceptance

- **Status:** Accepted
- **Decision:** Define numerical AI acceptance thresholds only after representative footage and client-approved scenarios are available.
- **Reason:** The proposal does not support a universal accuracy guarantee independent of lighting, camera placement, occlusion, and SOP consistency.

## ADR-009 — Use React, Node.js and Python rather than .NET

- **Status:** Accepted; persistence portion superseded by ADR-012
- **Date:** 2026-07-23
- **Owner:** Codistan technical leadership
- **Context:** The client uses Microsoft and Azure, but the Codistan delivery team's established application stack is React/Node.js/TypeScript and its AI/edge stack is Python. Azure hosting and Microsoft Entra ID do not require ASP.NET application code.
- **Options considered:**
  1. .NET/ASP.NET Core, Azure SQL, Entity Framework Core, and SignalR;
  2. React/TypeScript, Node.js/Express/TypeScript, a locally hosted open-source database, and Python edge/AI;
  3. Python-only application and AI stack.
- **Decision:** Use React/TypeScript for the dashboard, Node.js/Express/TypeScript for the platform API, and Python for edge camera, AI, evidence, synchronization, and SOP services. Use Socket.IO by default or Azure Web PubSub where client governance requires a managed real-time service. The original MongoDB choice was replaced by PostgreSQL under ADR-012.
- **Reason:** This matches existing team capability, reduces delivery risk within the eight-week MVP, preserves one TypeScript application ecosystem, and remains deployable within Azure with Entra ID, Key Vault, Blob Storage, Application Insights, Bicep, and GitHub Actions.
- **Consequences:** .NET, EF Core, Azure SQL, and SignalR are not part of the MVP unless the client mandates them through an approved architecture change.
- **Follow-up issues:** #5, #35, #36, #37, #39, #40, #41, #42, #43, #44, #49, #53 and #68.

## ADR-010 — Treat the Bangladesh implementation as a benchmark, not the PTC specification

- **Status:** Accepted
- **Date:** 2026-07-23
- **Owner:** Project Manager and technical leadership
- **Context:** The client/project owner shared media from a similar Bangladesh PoC, including overhead cameras, bale detection overlays, an apparent `Not Scanned` state, a local display, and a five-stage PoC journey. The source set does not contain the reference system's full requirements, code, model, dashboard specification, or acceptance criteria.
- **Decision:** Use the reference to understand physical layout, camera geometry, likely process-state monitoring, model-development sequencing, and PoC expectations. Do not import any visible feature into PTC scope unless it is also supported by the PTC BOQ/proposal or confirmed in writing.
- **Reason:** Direct replication without a gap analysis could introduce scanner integration, worker identity, dwell analytics, mobile functionality, or other features that are not part of the awarded scope.
- **Consequences:** A reference-to-PTC mapping must be completed before final SOP, UAT, and camera-design approval. The term `Not Scanned` must be reconciled with PTC's required opening/frisking workflow.
- **Follow-up issues:** #9, #13, #15, #27 and the dedicated reference-mapping issue.

## ADR-011 — Require PTC-specific footage for training, calibration, and acceptance

- **Status:** Accepted
- **Date:** 2026-07-23
- **Owner:** AI Lead and Project Manager
- **Context:** The Bangladesh media is useful for understanding the problem but may differ from the PTC site in cameras, bale types, wrapping, conveyor geometry, lighting, worker density, and exact SOP.
- **Decision:** Treat the Bangladesh media as restricted reference material only unless data-use rights explicitly permit model training. Use PTC site footage for the final training dataset, live calibration, and locked UAT set.
- **Reason:** Site-specific domain shift can materially affect detection, tracking, interaction recognition, and violation classification.
- **Consequences:** PTC footage permission, collection, staging, annotation, and acceptance-set separation remain critical-path client dependencies. Bangladesh data cannot be used to claim PTC accuracy.
- **Follow-up issues:** #13, #15, #27, #28, #29, #30, #34 and #51.

## ADR-012 — Use local PostgreSQL and Prisma for application persistence

- **Status:** Accepted
- **Date:** 2026-07-27
- **Owner:** Codistan technical leadership
- **Context:** The PoC data domain is primarily structured and relational: users own sessions; cameras own events; events own ordered SOP steps and evidence metadata; review mutations must create audit records atomically; dashboards require indexed filters, pagination, exports, backups and recovery. The database must run locally on the supplied workstation without recurring external hosting cost.
- **Options considered:**
  1. local MongoDB with Mongoose;
  2. local PostgreSQL with Prisma;
  3. cloud-only managed database;
  4. embedded SQLite as the primary application database.
- **Decision:** Use PostgreSQL Community locally, Prisma ORM for type-safe Node.js access, Prisma Migrate with committed SQL migrations, and PostgreSQL-native `pg_dump`/`pg_restore` for backup and recovery. Use explicit relational tables and constraints, with `JSONB` only for approved flexible AI/configuration payloads. Azure Database for PostgreSQL is the optional future managed equivalent.
- **Reason:** PostgreSQL provides stronger relational integrity, transactions, auditability, reporting/filtering, migration control, backup/recovery and long-term maintainability while remaining free to self-host locally.
- **Consequences:** MongoDB, Mongoose, Cosmos DB for MongoDB, Mongo-specific test tooling, collection/index scripts and `MONGODB_URI` are removed. Review updates and audit creation occur in one PostgreSQL transaction. Prisma schema/migrations and a reviewed `pnpm-lock.yaml` become release-controlled artifacts. Database migrations and restoration tests are mandatory release concerns.
- **Follow-up issues:** #5, #35, #36, #37, #38, #39, #40, #42, #43, #49 and #68.

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
