# PTC Bale Inspection & Monitoring System

AI-assisted monitoring of the bale inspection process using fixed IP cameras, an on-site GPU workstation, computer vision, event evidence, and a supervisor dashboard.

## Delivery objective

Deliver an eight-week MVP that:

- ingests four approved camera feeds;
- detects bales and workers in the inspection area;
- evaluates the agreed inspection sequence;
- identifies missed or incomplete inspections;
- stores timestamped snapshots and short evidence clips;
- provides live monitoring, event review, filters, remarks, and basic exports;
- continues core edge processing during an internet outage;
- supports a five-week hypercare and model-improvement period.

## Scope authority

The awarded technical proposal, approved BOQ, client-approved SOP, and signed change requests are the source of truth. Features not covered by those documents must not enter the MVP backlog without written approval.

## Architecture

The project uses a monorepo and a hybrid edge/Azure architecture:

- **On-site edge:** camera ingestion, AI inference, SOP evaluation, local buffering, evidence generation, and local operational continuity.
- **Azure:** management API, event metadata, evidence synchronization, Microsoft Entra ID, monitoring, and approved dashboard hosting.
- **GitHub:** source control, issue management, pull requests, and CI/CD workflows targeting Azure and the edge release package.

## Repository layout

```text
apps/dashboard-web/              React and TypeScript dashboard
services/platform-api/          .NET API and event management
services/edge-agent/            Camera ingestion, health, buffering, and sync
services/ai-inference/          Python computer-vision inference
services/compliance-engine/     SOP state machine and violation rules
packages/contracts/             Shared event and API schemas
infrastructure/azure/           Azure Bicep templates
infrastructure/edge/            Edge installation and service scripts
tests/                          Integration and acceptance test assets
docs/                           Project, architecture, AI, deployment, and operations documentation
```

## Documentation index

See [`docs/README.md`](docs/README.md).

## Delivery milestones

1. Scope and architecture locked
2. Site and hardware ready
3. Edge video platform ready
4. AI compliance model ready
5. Backend and Azure platform ready
6. Dashboard ready
7. MVP UAT and release
8. Hypercare and final stabilization

## Security

Do not commit credentials, camera URLs, production IP addresses, raw site footage, annotated datasets, client documents, evidence clips, private keys, or production model binaries. Store approved artifacts in client-controlled or project-approved secure storage.

## Repository visibility

This repository currently contains project implementation material. It should be kept private before adding site-specific diagrams, client network information, credentials, footage, datasets, or operational evidence.
