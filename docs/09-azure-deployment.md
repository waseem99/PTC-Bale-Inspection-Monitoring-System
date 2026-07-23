# Azure Management-Plane Deployment

## Scope

Azure is **conditional** for this PoC. The awarded solution must remain locally functional for camera processing, AI inference, event/evidence storage, and local intranet review. Azure hosts only the management-plane, synchronization, identity, evidence-copy, or monitoring components approved under issue #11.

Do not provision the full resource set simply because it is listed below. The final responsibility matrix must identify which resources are required within the fixed scope and who owns recurring Azure costs.

## Proposed Azure resources

| Resource | Purpose when approved |
|---|---|
| Azure App Service or approved container hosting | Central Node.js/Express API |
| Azure Static Web Apps or App Service | Central React dashboard frontend |
| Azure Cosmos DB for MongoDB or client-approved MongoDB | Synchronized event, review, camera, health, and audit metadata |
| Azure Blob Storage | Synchronized approved snapshots and short clips |
| Azure Key Vault | Cloud application secrets and certificates |
| Application Insights | Central API and frontend telemetry |
| Log Analytics, if approved | Central operational logs and alerts |
| Microsoft Entra ID application registrations | Central/remote user and service authentication |
| Azure Web PubSub, only if approved/required | Managed central real-time updates; otherwise Socket.IO runs with the API |

Final services depend on client subscription policy, networking, database standards, approved architecture, and the local-versus-Azure responsibility decision.

## Local baseline that Azure must not replace

- Python camera ingest, AI, tracking, SOP, evidence, and spool services;
- local Node.js API;
- local MongoDB-compatible event metadata;
- protected local evidence storage;
- local React intranet dashboard and approved local access;
- operation during internet, Entra, or Azure outage.

## Resource separation

Where Azure environments are approved:

- `dev` for cloud integration;
- `uat` for client acceptance of approved central functionality;
- `prod` for approved synchronized/central operation.

Each environment must use separate configuration and secrets. Production data must not be copied into development unless expressly approved and sanitized.

## Infrastructure as code

Approved Azure resources will be defined through Bicep under `infrastructure/azure/`.

The templates must include:

- parameterized environment naming;
- resource tags and cost ownership;
- managed identity where supported;
- secure transport requirements;
- database and storage network restrictions;
- Blob lifecycle configuration after retention approval;
- diagnostic settings;
- least-privilege access assignments;
- outputs consumed by deployment workflows without exposing secrets;
- optional modules so unapproved services are not deployed.

## Identity

### Central dashboard users

Where enabled:

- authenticate through Microsoft Entra ID using MSAL;
- use client-approved user or group assignments;
- avoid application-managed cloud passwords;
- define the minimal approved user-role model;
- validate access tokens again in the Node.js API.

Local dashboard access is defined separately under issue #41 and must remain available according to the approved offline model.

### Local synchronization service

Use the client-approved machine-to-machine method, such as:

- client certificate;
- workload identity or managed identity where applicable;
- confidential client credentials stored only in the site secret store and Key Vault.

The exact method requires client security approval.

## Network design

Required decisions:

- whether Azure resources are required for PoC acceptance;
- public endpoint with identity/network restrictions or private endpoint;
- site-to-Azure connectivity method;
- outbound ports permitted from the workstation;
- client proxy requirements;
- DNS and certificate requirements;
- whether the central dashboard is accessible only through the client network;
- whether Cosmos DB/MongoDB access must use private networking;
- which metadata/evidence classes are permitted to leave the site.

The design must not depend on inbound connections from Azure to the cameras or local workstation.

## CI/CD

GitHub Actions workflows for approved Azure components will:

1. install pinned Node and Python dependencies;
2. run formatting, linting, type checks, and unit tests;
3. run API, contract, MongoDB integration, dashboard, and local/offline tests;
4. scan for committed secrets and known dependency issues;
5. package the local Node/React/Python release separately from Azure artifacts;
6. validate approved Bicep modules;
7. deploy through approved credentials and protected environments;
8. run cloud database/index migration scripts where applicable;
9. run synchronization and central-access smoke tests;
10. record the integrated release version.

Production Azure deployment requires a protected GitHub environment and approval from an authorized reviewer.

## Configuration and secrets

- non-secret settings use environment configuration;
- cloud secrets use Key Vault or approved deployment secrets;
- local camera/application secrets remain in the approved local secret store;
- no production connection string is committed;
- environment-specific values are documented by key name, not actual value;
- browser bundles contain only public Entra configuration and no confidential client secret.

## MongoDB deployment and controlled changes

- local MongoDB is the primary PoC store unless issue #11 approves another topology;
- Mongoose schemas are application validation, not a substitute for migration discipline;
- local and cloud collection indexes use repeatable, reviewed scripts;
- document schema versions are recorded where compatibility requires them;
- data backfills/transforms are idempotent and tested before UAT/production execution;
- destructive changes require explicit backup, compatibility, and rollback plans;
- synchronization must preserve stable event IDs and original AI outcome;
- backup, availability, capacity, and retention follow the selected local/cloud service policies.

## Blob paths

Recommended logical cloud path where Blob synchronization is approved:

```text
{environment}/{siteId}/{cameraId}/{yyyy}/{MM}/{dd}/{eventId}/{fileName}
```

Blob access must be private. Evidence is retrieved through authorized API access or short-lived approved access tokens. Local evidence remains available according to the local retention policy.

## Monitoring

Minimum cloud signals where enabled:

- central API availability and response time;
- failed synchronization requests;
- authentication and authorization failures;
- MongoDB/Cosmos DB dependency failures and throttling;
- Blob upload failures;
- storage and retention job failures;
- central dashboard errors;
- real-time connection failures;
- synchronized event rate and local backlog indicators.

Local camera, AI, database, disk, evidence, and dashboard monitoring remains mandatory regardless of Azure use.

## Azure inputs required from client

- confirmation that Azure components are required and within the approved commercial scope;
- tenant and subscription details;
- resource group and region;
- naming, tagging, cost-governance, and recurring-cost ownership;
- approved MongoDB service and capacity approach;
- identity groups and application-registration process;
- network and private-endpoint requirements;
- approved metadata/evidence synchronization classes;
- Key Vault access model;
- log-retention requirements;
- deployment-service connection or federated identity;
- production approval process.
