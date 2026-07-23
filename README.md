# PTC Bale Inspection & Monitoring System

AI-assisted Proof of Concept for monitoring the PTC bale inspection process through four fixed IP cameras, a local GPU workstation, computer vision, timestamped evidence and an operational browser dashboard.

## Current status

The repository contains the approved project foundation, module boundaries, delivery documentation and GitHub issue plan. Application feature development has not started yet.

The next implementation phase is the simple PoC dashboard and authentication foundation described in [`docs/21-development-foundation-and-dashboard-plan.md`](docs/21-development-foundation-and-dashboard-plan.md).

## Delivery objective

Deliver an eight-week PoC that:

- ingests four approved camera feeds;
- detects bales and anonymous workers in the inspection area;
- evaluates the client-approved opening/frisking sequence;
- identifies completed, missed, incomplete and unresolved inspections;
- stores timestamped snapshots and short evidence clips;
- provides local live monitoring, event review, filters, remarks and basic exports;
- continues core operation without internet or Azure availability;
- supports a five-week hypercare and controlled improvement period.

## Architecture

The PoC is **local-first and Azure-aligned**.

### Required local system

The supplied cameras and GPU workstation support the complete operational PoC:

- Python camera ingestion and health;
- Python AI inference and temporary tracking;
- versioned SOP compliance engine;
- local evidence generation and durable event spool;
- Node.js/Express portal API;
- local MongoDB-compatible database;
- protected local evidence storage;
- React intranet dashboard;
- browser-compatible live-view gateway.

### Optional approved Azure layer

Azure may later provide separately hosted development/central access, Microsoft Entra ID, synchronized metadata/evidence, Blob Storage, monitoring, Key Vault and approved deployment automation. Azure is not a dependency for core local PoC operation.

## Technical stack

- **Dashboard:** React, TypeScript and Vite
- **Portal API:** Node.js, Express and TypeScript
- **Local metadata:** MongoDB-compatible persistence with Mongoose
- **Camera/AI/edge:** Python, OpenCV, PyTorch training and ONNX Runtime CUDA deployment
- **Local updates:** Socket.IO
- **Optional Azure:** Bicep, Entra ID, approved MongoDB/Cosmos DB, Blob Storage, Key Vault and Application Insights
- **CI/CD:** GitHub Actions

No .NET, Entity Framework Core, Azure SQL or SignalR dependency is planned for the PoC.

## Repository layout

```text
apps/
  dashboard-web/              React operational portal
  platform-api/               Node.js/Express portal API
services/
  edge-agent/                 Camera, health, evidence and synchronization
  ai-inference/               Python computer-vision runtime
  compliance-engine/          PTC SOP state machine and reason codes
packages/
  contracts/                  Shared OpenAPI/JSON Schema contracts
  ui-components/              Small reusable dashboard component layer
infrastructure/
  edge/                       Local GPU-workstation deployment assets
  azure/                      Optional approved Azure assets
tests/
  integration/                Cross-module integration tests
  acceptance/                 PTC-specific PoC/UAT scenarios
docs/                         Project and technical documentation
```

## Dashboard direction

The PoC uses one custom operational React portal rather than Power Apps or Power BI as the primary interface.

Initial portal scope:

- simple fixed-user PoC login;
- operations overview with large readable cards and status indicators;
- four-camera monitoring screen;
- event and violation list;
- event detail, evidence, review status and remarks;
- system health;
- basic reports and exports;
- separate demo, local and Azure synchronization states.

A future Microsoft Entra ID adapter may replace or extend the fixed-user login after client approval. Full user administration and enterprise RBAC are not part of the first PoC implementation.

## Source of truth

The awarded BOQ, approved technical proposal, confirmed PTC SOP, written clarifications and signed change requests are authoritative. The Bangladesh reference project informs feasibility and workflow understanding but does not automatically add features to the PTC scope.

## Documentation

See [`docs/README.md`](docs/README.md) for the complete index.

## Security

Do not commit credentials, camera URLs, production IP addresses, site diagrams, client documents, Bangladesh reference media, PTC footage, annotations, evidence clips, production model binaries or personal data. Restricted materials remain in approved external storage and are referenced through IDs, manifests and checksums only.

The repository is private, but private visibility does not change these data-handling rules.
