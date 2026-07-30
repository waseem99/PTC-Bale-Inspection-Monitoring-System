# Technical Stack

## Stack principles

- use the team's established MERN and Python delivery capability;
- satisfy the BOQ's offline AI, local database, and local intranet dashboard commitments first;
- align approved identity, hosting, secrets, monitoring, and deployment with the client's Microsoft/Azure environment;
- keep camera decoding and AI inference at the site edge;
- keep the PoC technically simple enough to deliver and support within eight weeks;
- avoid Azure, IoT, scanner, or integration services that do not directly support awarded scope;
- use one application codebase that can run locally and, where approved, in Azure;
- version contracts, model releases, SOP rules, and configurations independently but release them together.

## Recommended stack

| Area | Technology | Purpose |
|---|---|---|
| Dashboard | React, TypeScript, Vite | Local intranet and approved Azure-hosted supervisor interface |
| Frontend testing | Vitest, React Testing Library, Playwright | Component and end-to-end workflows |
| Platform API | Node.js LTS, Express, TypeScript | Local event management, review workflow, filtering, exports, health, and optional synchronization |
| API validation | Zod or JSON Schema validation | Validate edge, local dashboard, and synchronization payloads |
| API documentation | OpenAPI | Versioned API definition and shared contract generation |
| Local metadata database | MongoDB Community or another approved MongoDB-compatible local deployment | Required local cameras, events, reviews, health, and audit metadata |
| Azure metadata option | Azure Cosmos DB for MongoDB or client-approved MongoDB | Approved synchronized/central metadata where issue #11 enables it |
| Database access | Mongoose | Shared MongoDB-compatible schemas, validation, indexes, and controlled migrations |
| Local real-time updates | Socket.IO | Push local event and health changes to the intranet dashboard |
| Azure real-time option | Socket.IO on approved hosting or Azure Web PubSub | Central/remote updates only where approved |
| Local authentication | Client-approved local/network access model | Required for offline intranet use; exact method pending client security decision |
| Azure authentication | Microsoft Entra ID, MSAL, and server-side JWT validation | Approved remote/central access enforcement |
| Local evidence storage | Protected workstation filesystem or approved local volume | Required snapshots and short clips without internet dependency |
| Azure evidence option | Private Azure Blob Storage | Approved synchronized evidence and lifecycle management |
| Local secrets | Windows-protected secret store, restricted configuration, or approved vault agent | Camera and service secrets required on the site workstation |
| Azure secrets | Azure Key Vault | Cloud application secrets, certificates, and identity references |
| Local monitoring | Structured rotating logs, health endpoints, service watchdog, and dashboard health | Offline operational visibility |
| Azure monitoring | Azure Application Insights and approved Log Analytics | Central API, dashboard, dependency, and synchronization observability |
| Edge/AI language | Python 3.11+ | Camera, inference, tracking, SOP, evidence, and synchronization services |
| Camera processing | OpenCV with FFmpeg or GStreamer after validation | RTSP ingest, orientation, decoding, sampling, and evidence clips |
| Model framework | PyTorch for training; ONNX Runtime CUDA for deployment | Reproducible training and efficient edge inference |
| Tracking | Validated tracker such as ByteTrack | Camera/zone-local temporary bale and person track continuity |
| Edge service boundary | Python packages/processes with explicit schemas | Separate ingest, inference, compliance, evidence, and sync concerns |
| Durable spool | SQLite or another approved embedded durable store | Offline queue between AI events and local/cloud application persistence |
| Local packaging | Managed Windows services and/or approved containers | Automatic start, restart, upgrade, and rollback |
| Local deployment scripts | PowerShell and documented configuration manifests | Reproducible workstation installation and recovery |
| Azure infrastructure as code | Azure Bicep | Approved Azure resource deployment only |
| CI/CD | GitHub Actions | Lint, test, build, package, scan, and approved deployments |
| Backend testing | Jest and Supertest | API, authentication, database, synchronization, and integration correctness |
| AI testing | Pytest and dataset evaluation scripts | Model, tracking, rules, and regression evaluation |

## Repository modules

```text
apps/
  dashboard-web/          # React + TypeScript, locally and optionally in Azure
  platform-api/           # Node.js + Express + TypeScript
services/
  edge-agent/             # Python camera, health, evidence, and synchronization
  ai-inference/           # Python model runtime and tracking
  compliance-engine/      # Python SOP state machine and reason codes
packages/
  contracts/              # OpenAPI, JSON Schema, generated/shared types
  ui-components/          # Shared React components where justified
infrastructure/
  azure/                  # Bicep modules and environment parameters
  edge/                   # Workstation installation, service, and configuration scripts
tests/
  integration/
  acceptance/
docs/
```

## Application deployment modes

### Required PoC local mode

- Node.js API, local MongoDB-compatible database, and React dashboard run on the site workstation or approved local server;
- protected local evidence files remain accessible through the API;
- Socket.IO provides local updates;
- the system remains functional without internet.

### Optional approved hybrid mode

- the local mode remains active;
- the local synchronization service sends approved metadata/evidence to Azure;
- Azure-hosted React/Node components use Entra ID and the approved MongoDB/Blob resources;
- synchronization is idempotent and outage-tolerant.

Do not implement both modes in full until issue #11 establishes the client-approved topology.

## Package and workspace approach

Use one Node workspace at the repository root with **npm** workspaces. The `package-lock.json` file is authoritative and only one package manager may be used.

Python modules should use one documented dependency and environment-management approach. Raw datasets and model binaries remain outside Git.

## Why a monorepo

- the AI event contract, local/cloud API contract, and dashboard fields must evolve together;
- one release combines edge, local application, optional cloud, database, and UI changes;
- the fixed-scope PoC does not justify independent repository governance;
- one pull request can show the full impact of a contract or workflow change;
- GitHub Actions can use path filters to build only affected modules.

## When to split repositories later

A separate repository may be justified only if:

1. the client requires different access controls for AI and application code;
2. model development is transferred to a separate organization or vendor;
3. edge software must be released independently across multiple sites;
4. infrastructure code must live in a client-managed repository;
5. a reusable product is separated from this client-specific implementation.

## Excluded technology choices for PoC

The following are not needed unless the client architecture explicitly requires them through change control:

- .NET/ASP.NET application services;
- Azure SQL Database;
- Entity Framework Core;
- SignalR;
- Azure IoT Hub or Azure IoT Edge;
- scanner, barcode, RFID, PLC, or custom IoT integration;
- Kubernetes/AKS;
- Kafka or another event-streaming platform;
- service-bus orchestration for the small PoC event volume;
- a separate data lake;
- Azure Machine Learning production endpoints for live camera inference;
- serverless frame-by-frame AI processing;
- multiple competing databases for the same active local event domain.

## Versioning

- pin Node dependencies through the repository lock file;
- pin Python dependencies through the selected lock/requirements approach;
- declare the supported Node.js and Python versions in repository configuration;
- version API contracts, collection schemas/index definitions, model artifacts, zone configurations, camera orientation, and SOP rules;
- record separate local and Azure deployment manifests where hybrid mode is approved;
- use semantic release tags for integrated deliverables, beginning with `v1.0.0-mvp` after acceptance.
