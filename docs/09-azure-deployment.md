# Azure Deployment

## Scope

Azure hosts the approved management-plane components. Camera decoding and live AI inference remain on the site workstation.

## Proposed Azure resources

| Resource | Purpose |
|---|---|
| Azure App Service or approved container hosting | Node.js/Express platform API |
| Azure Static Web Apps or App Service | React dashboard frontend |
| Azure Cosmos DB for MongoDB or client-approved MongoDB | Event, review, camera, health, and audit metadata |
| Azure Blob Storage | Approved snapshots and short clips |
| Azure Key Vault | Application secrets and certificates |
| Application Insights | API and frontend telemetry |
| Log Analytics, if approved | Central operational logs and alerts |
| Microsoft Entra ID application registrations | User and service authentication |
| Azure Web PubSub, only if approved/required | Managed real-time dashboard updates; otherwise Socket.IO runs with the API |

Final services depend on client subscription policy, networking, database standards, and approved architecture.

## Resource separation

Recommended environments:

- `dev` for developer integration;
- `uat` for client acceptance;
- `prod` for operational use.

Each environment must use separate configuration and secrets. Production data must not be copied into development unless expressly approved and sanitized.

## Infrastructure as code

Azure resources will be defined through Bicep under `infrastructure/azure/`.

The templates must include:

- parameterized environment naming;
- resource tags;
- managed identity where supported;
- secure transport requirements;
- database and storage network restrictions;
- Blob lifecycle configuration after retention approval;
- diagnostic settings;
- least-privilege access assignments;
- outputs consumed by deployment workflows without exposing secrets.

## Identity

### Dashboard users

- authenticate through Microsoft Entra ID using MSAL;
- use client-approved user or group assignments;
- avoid application-managed passwords;
- define the minimal approved user-role model;
- validate access tokens again in the Node.js API.

### Edge service

Use the client-approved machine-to-machine method, such as:

- client certificate;
- workload identity or managed identity where applicable;
- confidential client credentials stored only in the site secret store and Key Vault.

The exact method requires client security approval.

## Network design

Required decisions:

- public endpoint with identity and network restrictions, or private endpoint;
- site-to-Azure connectivity method;
- outbound ports permitted from the workstation;
- client proxy requirements;
- DNS and certificate requirements;
- whether the dashboard is accessible only through the client network;
- whether Cosmos DB/MongoDB access must use private networking.

The MVP should not depend on inbound connections from Azure to the cameras or edge workstation.

## CI/CD

GitHub Actions workflows will:

1. install pinned Node and Python dependencies;
2. run formatting, linting, type checks, and unit tests;
3. run API, contract, MongoDB integration, and dashboard builds/tests;
4. scan for committed secrets and known dependency issues;
5. package the Node.js API, React dashboard, and Python edge release;
6. validate and deploy infrastructure through approved credentials;
7. deploy application artifacts to the selected environment;
8. run database/index migration scripts;
9. run smoke tests;
10. record the integrated release version.

Production deployment requires a protected GitHub environment and approval from an authorized reviewer.

## Configuration and secrets

- non-secret settings use environment configuration;
- secrets use Key Vault or approved deployment secrets;
- no production connection string is committed;
- edge credentials are not stored in Azure application configuration unless required and approved;
- environment-specific values are documented by key name, not actual value;
- browser bundles contain only public Entra configuration and no confidential client secret.

## MongoDB deployment and controlled changes

- Mongoose schemas are application validation, not a substitute for migration discipline;
- collection indexes are deployed through repeatable, reviewed scripts;
- document schema versions are recorded where compatibility requires them;
- data backfills/transforms are idempotent and tested before UAT/production execution;
- destructive changes require an explicit backup, compatibility, and rollback plan;
- UAT migration/index scripts run before production;
- backup, availability, capacity, and retention follow client policy and the selected MongoDB service.

## Blob paths

Recommended logical path:

```text
{environment}/{siteId}/{cameraId}/{yyyy}/{MM}/{dd}/{eventId}/{fileName}
```

Blob access must be private. Evidence is retrieved through authorized API access or short-lived approved access tokens.

## Monitoring

Minimum signals:

- API availability and response time;
- failed edge-ingestion requests;
- authentication and authorization failures;
- MongoDB/Cosmos DB dependency failures and throttling;
- evidence upload failures;
- storage and retention job failures;
- dashboard errors;
- real-time connection failures;
- event-ingestion rate and edge backlog indicators.

Alerts and recipients must be approved before production.

## Azure inputs required from client

- tenant and subscription details;
- resource group and region;
- naming and tagging standards;
- approved MongoDB service and capacity approach;
- identity groups and application-registration process;
- network and private-endpoint requirements;
- Key Vault access model;
- log-retention requirements;
- deployment-service connection or federated identity;
- production approval process.
