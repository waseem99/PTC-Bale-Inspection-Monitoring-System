# Azure Management-Plane Deployment

## Scope

Azure is **conditional** for this PoC. The awarded solution must remain locally functional for camera processing, AI inference, PostgreSQL event/review storage, evidence storage, and local intranet review. Azure hosts only the management-plane, synchronization, identity, evidence-copy, or monitoring components approved under issue #11.

Do not provision the full resource set simply because it is listed below. The final responsibility matrix must identify which resources are required within the fixed scope and who owns recurring Azure costs.

## Proposed Azure resources

| Resource | Purpose when approved |
|---|---|
| Azure App Service or approved container hosting | Central Node.js/Express API |
| Azure Static Web Apps or App Service | Central React dashboard frontend |
| Azure Database for PostgreSQL | Synchronized event, review, camera, health, configuration and audit records |
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
- local PostgreSQL event, review, health and audit data;
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
- PostgreSQL and storage network restrictions;
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
- whether managed PostgreSQL access must use private networking;
- which metadata/evidence classes are permitted to leave the site.

The design must not depend on inbound connections from Azure to the cameras or local workstation.

## CI/CD

GitHub Actions workflows for approved Azure components will:

1. install pinned Node and Python dependencies;
2. generate Prisma Client and validate committed migrations;
3. run formatting, linting, type checks, and unit tests;
4. run API, contract, PostgreSQL integration, dashboard, and local/offline tests;
5. scan for committed secrets and known dependency issues;
6. package the local Node/React/Python release separately from Azure artifacts;
7. validate approved Bicep modules;
8. deploy through approved credentials and protected environments;
9. run `prisma migrate deploy` through a protected migration job;
10. run synchronization and central-access smoke tests;
11. record the integrated release version.

Production Azure deployment requires a protected GitHub environment and approval from an authorized reviewer.

## Configuration and secrets

- non-secret settings use environment configuration;
- cloud secrets use Key Vault or approved deployment secrets;
- local camera/application/database secrets remain in the approved local secret store;
- no production connection string is committed;
- environment-specific values are documented by key name, not actual value;
- browser bundles contain only public Entra configuration and no confidential client secret.

## PostgreSQL deployment and controlled changes

- local PostgreSQL is the primary PoC store unless issue #11 approves a synchronized/central topology;
- Prisma schema is the application data model and committed SQL migrations are the deployment record;
- development migration generation occurs only against a dedicated developer database;
- shared/UAT/production environments use `prisma migrate deploy`;
- migration SQL is reviewed for destructive changes, long locks, index cost and data transformation risk;
- backup is required before destructive or data-transforming migrations;
- data backfills are idempotent and tested before UAT/production execution;
- synchronization must preserve stable event IDs and original AI outcome;
- backup, availability, capacity and retention follow the selected local/cloud service policies;
- PostgreSQL major-version upgrades require a separate compatibility and restoration plan.

## Local-to-Azure data pattern

The preferred future pattern is not direct replication of the local database. The local synchronization service submits approved versioned API payloads using stable IDs. The central API persists them in Azure Database for PostgreSQL and stores approved evidence in Blob Storage.

This approach:

- preserves the local system as operational authority during outages;
- prevents cloud database credentials from being placed on cameras or in the browser;
- supports idempotency and explicit data-class approval;
- avoids coupling the PoC to a database-level replication topology before the client approves it.

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
- PostgreSQL connection, query, storage and capacity failures;
- failed or pending migrations;
- Blob upload failures;
- storage and retention job failures;
- central dashboard errors;
- real-time connection failures;
- synchronized event rate and local backlog indicators.

Local camera, AI, PostgreSQL, disk, evidence, and dashboard monitoring remains mandatory regardless of Azure use.

## Azure inputs required from client

- confirmation that Azure components are required and within the approved commercial scope;
- tenant and subscription details;
- resource group and region;
- naming, tagging, cost-governance, and recurring-cost ownership;
- approved Azure Database for PostgreSQL service tier, capacity and high-availability approach;
- identity groups and application-registration process;
- network and private-endpoint requirements;
- approved metadata/evidence synchronization classes;
- Key Vault access model;
- database backup/retention requirements;
- log-retention requirements;
- deployment-service connection or federated identity;
- production approval process.
