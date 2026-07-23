# Azure Deployment

## Scope

Azure hosts the approved management-plane components. Camera decoding and live AI inference remain on the site workstation.

## Proposed Azure resources

| Resource | Purpose |
|---|---|
| App Service or approved container hosting | Platform API |
| Static Web Apps or App Service | Dashboard frontend |
| Azure SQL Database | Event, review, camera, health, and audit metadata |
| Blob Storage | Approved snapshots and short clips |
| Key Vault | Application secrets and certificates |
| Application Insights | API and frontend telemetry |
| Log Analytics, if approved | Central operational logs and alerts |
| Microsoft Entra ID application registrations | User and service authentication |

Final services depend on client subscription policy, networking, and approved architecture.

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
- storage lifecycle configuration after retention approval;
- diagnostic settings;
- least-privilege access assignments;
- outputs consumed by deployment workflows without exposing secrets.

## Identity

### Dashboard users

- authenticate through Microsoft Entra ID;
- use client-approved user or group assignments;
- avoid application-managed passwords;
- define the minimal approved user-role model.

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
- whether the dashboard is accessible only through the client network.

The MVP should not depend on inbound connections from Azure to the cameras or edge workstation.

## CI/CD

GitHub Actions workflows will:

1. restore dependencies;
2. run linting and unit tests;
3. run build and contract checks;
4. scan for committed secrets and known dependency issues;
5. package API and dashboard artifacts;
6. deploy infrastructure through approved credentials;
7. deploy application artifacts to the selected environment;
8. run smoke tests;
9. record the release version.

Production deployment requires a protected GitHub environment and approval from an authorized reviewer.

## Configuration and secrets

- non-secret settings use environment configuration;
- secrets use Key Vault or approved deployment secrets;
- no production connection string is committed;
- edge credentials are not stored in Azure application configuration unless required and approved;
- environment-specific values are documented by key name, not actual value.

## Database deployment

- schema changes use EF Core migrations;
- migrations are reviewed with application changes;
- destructive changes require an explicit migration and rollback plan;
- UAT migration runs before production;
- backup and retention are configured according to client policy.

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
- authentication failures;
- database failures;
- evidence upload failures;
- storage and retention job failures;
- dashboard errors;
- event-ingestion rate and backlog indicators.

Alerts and recipients must be approved before production.

## Azure inputs required from client

- tenant and subscription details;
- resource group and region;
- naming and tagging standards;
- identity groups and application-registration process;
- network and private-endpoint requirements;
- Key Vault access model;
- log-retention requirements;
- deployment-service connection or federated identity;
- production approval process.
