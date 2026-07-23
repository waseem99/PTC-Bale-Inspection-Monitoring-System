# Technical Stack

## Stack principles

- use the team's established MERN and Python delivery capability;
- align identity, hosting, secrets, monitoring, and deployment with the client's Microsoft/Azure environment;
- keep camera decoding and AI inference at the site edge;
- keep the MVP technically simple enough to deliver and support within eight weeks;
- avoid Azure or IoT services that do not directly support awarded scope;
- version contracts, model releases, SOP rules, and configurations independently but release them together.

## Recommended stack

| Area | Technology | Purpose |
|---|---|---|
| Dashboard | React, TypeScript, Vite | Supervisor and management web interface |
| Frontend testing | Vitest, React Testing Library, Playwright | Component and end-to-end workflows |
| Platform API | Node.js LTS, Express, TypeScript | Event ingestion, review workflow, filtering, exports, and health |
| API validation | Zod or JSON Schema validation | Validate edge and dashboard payloads at runtime |
| API documentation | OpenAPI | Versioned API definition and client integration |
| Database access | Mongoose | MongoDB-compatible collections, validation, and indexes |
| Metadata database | Azure Cosmos DB for MongoDB or client-approved MongoDB | Cameras, events, reviews, health, and audit metadata |
| Real-time updates | Socket.IO by default; Azure Web PubSub where client-managed scale/governance requires it | Push event and health updates to the dashboard |
| Authentication | Microsoft Entra ID, MSAL, and server-side JWT validation | Client-aligned sign-in and access enforcement |
| Evidence storage | Azure Blob Storage | Private approved snapshots and short clips |
| Secrets | Azure Key Vault | Application secrets, certificates, and credential references |
| Monitoring | Azure Application Insights and structured logs | API, dashboard, dependency, and operational observability |
| Edge/AI language | Python 3.11+ | Camera, inference, tracking, SOP, evidence, and synchronization services |
| Camera processing | OpenCV with FFmpeg or GStreamer after validation | RTSP ingest, decoding, sampling, and evidence clips |
| Model framework | PyTorch for training; ONNX Runtime CUDA for deployment | Reproducible training and efficient edge inference |
| Tracking | Validated multi-object tracker such as ByteTrack | Camera-local bale and worker track continuity |
| Edge service boundary | Python packages/processes with explicit schemas | Separate ingest, inference, compliance, evidence, and sync concerns |
| Edge persistence | SQLite or another approved embedded durable store | Offline event spool and synchronization queue |
| Edge packaging | Managed Windows services and/or approved containers | Automatic start, restart, upgrade, and rollback |
| Infrastructure as code | Azure Bicep | Repeatable Azure resource deployment |
| CI/CD | GitHub Actions | Lint, test, build, package, scan, and deploy |
| Backend testing | Jest and Supertest | API, authentication, database, and integration correctness |
| AI testing | Pytest and dataset evaluation scripts | Model, rules, and regression evaluation |

## Repository modules

```text
apps/
  dashboard-web/          # React + TypeScript
  platform-api/           # Node.js + Express + TypeScript
services/
  edge-agent/             # Python camera, health, evidence, and sync
  ai-inference/           # Python model runtime and tracking
  compliance-engine/      # Python SOP state machine and reason codes
packages/
  contracts/              # OpenAPI, JSON Schema, generated/shared types
  ui-components/          # Shared React components where justified
infrastructure/
  azure/                  # Bicep modules and environment parameters
  edge/                   # Installation, service, and configuration scripts
tests/
  integration/
  acceptance/
docs/
```

## Package and workspace approach

Use one Node workspace at the repository root through npm, pnpm, or Yarn after the technical lead selects one package manager. The lock file is authoritative and only one package manager may be used.

Python modules should use one documented dependency and environment-management approach. Raw datasets and model binaries remain outside Git.

## Why a monorepo

- the AI event contract, API contract, and dashboard fields must evolve together;
- one release combines edge, cloud, database, and UI changes;
- the fixed-scope MVP does not justify independent repository governance;
- one pull request can show the full impact of a contract or workflow change;
- GitHub Actions can use path filters to build only affected modules.

## When to split repositories later

A separate repository may be justified only if:

1. the client requires different access controls for AI and application code;
2. model development is transferred to a separate organization or vendor;
3. edge software must be released independently across multiple sites;
4. infrastructure code must live in a client-managed repository;
5. a reusable product is separated from this client-specific implementation.

## Excluded technology choices for MVP

The following are not needed unless the client architecture explicitly requires them:

- .NET/ASP.NET application services;
- Azure SQL Database;
- Entity Framework Core;
- SignalR;
- Azure IoT Hub or Azure IoT Edge;
- Kubernetes/AKS;
- Kafka or another event-streaming platform;
- service-bus orchestration for the small MVP event volume;
- a separate data lake;
- Azure Machine Learning production endpoints for live camera inference;
- serverless frame-by-frame AI processing;
- multiple databases for the same event domain.

## Versioning

- pin Node dependencies through the repository lock file;
- pin Python dependencies through the selected lock/requirements approach;
- declare the supported Node.js and Python versions in repository configuration;
- version API contracts, collection schemas/index definitions, model artifacts, zone configurations, and SOP rules;
- use semantic release tags for integrated deliverables, beginning with `v1.0.0-mvp` after acceptance.
