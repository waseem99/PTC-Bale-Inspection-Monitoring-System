# Project Documentation

## Governance and scope

- [Project charter](01-project-charter.md)
- [Scope and boundaries](02-scope-and-boundaries.md)
- [Client inputs and decisions required](14-client-inputs-required.md)
- [Decision log](15-decision-log.md)
- [Risk register](17-risk-register.md)
- [Requirements traceability](18-requirements-traceability.md)
- [Complete GitHub issue map](19-issue-map.md)
- [Bangladesh reference PoC analysis and PTC translation](20-bangladesh-reference-poc-analysis.md)

## Solution design

- [Solution architecture](03-solution-architecture.md)
- [Technical stack](04-technical-stack.md)
- [SOP and domain model](05-sop-and-domain-model.md)
- [PostgreSQL data and event model](06-data-and-event-model.md)
- [AI development and evaluation](07-ai-development-plan.md)
- [Development foundation and dashboard plan](21-development-foundation-and-dashboard-plan.md)
- [Frontend production readiness](22-frontend-production-readiness.md)
- [Frontend/live API contract](23-frontend-api-contract.md)
- [Backend API and persistent seeded PostgreSQL plan](27-backend-api-and-seeded-data-plan.md)

## Deployment and security

- [Edge and local PostgreSQL deployment](08-edge-deployment.md)
- [Azure management-plane deployment](09-azure-deployment.md)
- [Security and privacy](10-security-and-privacy.md)
- [Frontend deployment and rollback runbook](25-frontend-deployment-runbook.md)

## Delivery and operation

- [Testing and acceptance](11-testing-and-acceptance.md)
- [Delivery plan](12-delivery-plan.md)
- [Operations runbook](13-operations-runbook.md)
- [GitHub workflow and issue planning](16-github-workflow.md)
- [Frontend UAT and release checklist](24-frontend-uat-checklist.md)
- [Frontend self-hosted validation fallback](26-frontend-self-hosted-validation.md)
- [Backend/PostgreSQL validation and local runbook](28-backend-validation-and-local-runbook.md)

## Documentation rules

1. The awarded proposal, BOQ, approved SOP, and signed change requests are authoritative.
2. Reference-project media informs design but does not add PTC scope without written confirmation.
3. Site-sensitive details, database URLs/backups and restricted media must not be committed even though the repository is private.
4. Architecture decisions must be recorded in the decision log.
5. PostgreSQL schema changes require reviewed Prisma migrations and recovery impact.
6. An issue is not complete until its acceptance criteria and documentation impact are addressed.
7. Raw footage, datasets, evidence clips, credentials, production IPs, database dumps, and model binaries remain outside Git.
