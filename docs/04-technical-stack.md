# Technical Stack

## Stack principles

- align application services with the client's Microsoft and Azure environment;
- keep camera and AI processing at the edge;
- use technologies the team can support within the eight-week MVP;
- avoid platform services that do not directly support awarded scope;
- package services so development, integration, and production configurations remain reproducible.

## Recommended stack

| Area | Technology | Purpose |
|---|---|---|
| Dashboard | React, TypeScript, Vite | Supervisor and management web interface |
| Frontend data access | Generated or shared API contracts | Keep frontend/backend event definitions aligned |
| Platform API | .NET 8 LTS, ASP.NET Core Web API | Event ingestion, review workflow, filtering, reports, health |
| Real-time updates | ASP.NET Core SignalR | Push event and health updates to the dashboard |
| ORM | Entity Framework Core | Azure SQL access and migrations |
| Authentication | Microsoft Entra ID / Microsoft.Identity.Web | Client-aligned sign-in and token validation |
| Cloud metadata | Azure SQL Database | Cameras, events, review status, remarks, audit records |
| Evidence storage | Azure Blob Storage | Approved snapshots and short clips |
| Secrets | Azure Key Vault | Application secrets, credentials references, certificates |
| Monitoring | Azure Application Insights and structured logs | API and dashboard observability |
| Edge AI language | Python 3.11 | Camera, inference, tracking, rules, and synchronization services |
| Camera processing | OpenCV, FFmpeg/GStreamer as validated | RTSP ingest, decoding, frame sampling, evidence clips |
| Model framework | PyTorch for training; ONNX Runtime CUDA for deployment | Reproducible training and efficient edge inference |
| Tracking | Validated multi-object tracker such as ByteTrack | Camera-local bale and worker track continuity |
| AI API/runtime | FastAPI or internal process boundary | Local inference and configuration endpoints |
| Edge persistence | SQLite or approved embedded durable store | Event spool and offline synchronization queue |
| Edge packaging | Windows Services and/or approved Docker runtime | Automatic start, restart, and controlled deployment |
| Infrastructure as code | Azure Bicep | Repeatable Azure resource deployment |
| CI/CD | GitHub Actions | Build, test, package, and deploy workflows |
| End-to-end testing | Playwright | Dashboard workflows |
| API testing | xUnit/.NET tests and integration tests | Backend correctness |
| AI testing | Pytest and dataset evaluation scripts | Model, rules, and regression evaluation |

## Repository modules

```text
apps/dashboard-web/
services/platform-api/
services/edge-agent/
services/ai-inference/
services/compliance-engine/
packages/contracts/
infrastructure/azure/
infrastructure/edge/
tests/integration/
tests/acceptance/
docs/
```

## Why a monorepo

- the AI event contract, API contract, and dashboard fields must evolve together;
- one release must combine edge, cloud, and UI changes;
- the current team and fixed-scope MVP do not justify independent repository governance;
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

The following are not needed unless client architecture explicitly requires them:

- Azure IoT Hub or Azure IoT Edge;
- Kubernetes/AKS;
- event-streaming platforms such as Kafka;
- microservice orchestration beyond the small set of named services;
- a separate data lake;
- Azure Machine Learning production endpoints for live camera inference;
- serverless functions for frame-by-frame AI processing;
- multiple databases for the same event domain.

## Versioning

- pin Python dependencies through a lock file;
- pin Node dependencies through the repository lock file;
- use .NET LTS SDK versions declared in `global.json` when code is initialized;
- version event contracts, model artifacts, zone configurations, and SOP rules;
- use semantic release tags for deliverables, beginning with `v1.0.0-mvp` after acceptance.
