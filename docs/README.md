# Project Documentation

## Current source of truth

Start here for the repository, release, governance/privacy boundary and remaining closure gates:

- **[Current release and control state](51-current-release-and-control-state.md)** — authoritative current status.
- [Final testing, acceptance and closure runbook](35-pm-ai-project-closure-runbook.md) — execution/acceptance process.
- [AI acceptance and release record template](37-ai-acceptance-release-template.md) — sanitized final AI record.
- [Database resilience Option A](44-database-resilience-option-a.md) — finite DB-resilience execution boundary.
- [Recovery/rebuild security closure](49-recovery-rebuild-security-closure.md) — certified software recovery boundary.
- [Site camera/ROI execution package](50-site-camera-roi-execution-package.md) — executable #84 site package.

When a dated/historical document conflicts with `51-current-release-and-control-state.md`, the current-state document controls unless a newer approved issue/release record explicitly supersedes it.

## Governance and scope

- [Project charter](01-project-charter.md)
- [Scope and boundaries](02-scope-and-boundaries.md)
- [Client inputs and decisions required](14-client-inputs-required.md)
- [Decision log](15-decision-log.md)
- [GitHub workflow and repository controls](16-github-workflow.md)
- [Risk register](17-risk-register.md)
- [Requirements traceability](18-requirements-traceability.md)
- [Restricted factory-material manifest template](36-restricted-material-manifest-template.md)

## Solution and AI design

- [Solution architecture](03-solution-architecture.md)
- [Technical stack](04-technical-stack.md)
- [SOP and domain model](05-sop-and-domain-model.md)
- [PostgreSQL data and event model](06-data-and-event-model.md)
- [AI development and evaluation](07-ai-development-plan.md)
- [Development foundation and dashboard plan](21-development-foundation-and-dashboard-plan.md)
- [Frontend production readiness](22-frontend-production-readiness.md)
- [Frontend/live API contract](23-frontend-api-contract.md)
- [Backend API and persistent seeded PostgreSQL plan](27-backend-api-and-seeded-data-plan.md)
- [AI model delivery plan](31-ai-model-delivery-plan.md)
- [Implemented AI runtime and testing](39-ai-implementation-and-testing.md)
- [Annotation and dataset workflow](43-annotation-and-dataset-workflow.md)

## Deployment, security and operations

- [Edge and local PostgreSQL deployment](08-edge-deployment.md)
- [Optional Azure management-plane deployment](09-azure-deployment.md)
- [Security and privacy](10-security-and-privacy.md)
- [Testing and acceptance](11-testing-and-acceptance.md)
- [Delivery plan](12-delivery-plan.md)
- [Operations runbook](13-operations-runbook.md)
- [Frontend deployment and rollback runbook](25-frontend-deployment-runbook.md)
- [Local machine installation and operations](32-local-machine-deployment.md)
- [Local release manifest template](33-local-release-manifest.md)
- [Target workstation local UAT record](34-local-uat-record.md)
- [Security event catalogue](45-security-event-catalogue.md)
- [Enterprise identity readiness](46-enterprise-identity-readiness.md)
- [Network and credential hardening](47-network-and-credential-hardening.md)
- [Separated PostgreSQL software certification](48-separated-postgres-software-certification.md)

## Test and execution packages

- [Frontend UAT and release checklist](24-frontend-uat-checklist.md)
- [Frontend self-hosted validation fallback](26-frontend-self-hosted-validation.md)
- [Backend/PostgreSQL validation and local runbook](28-backend-validation-and-local-runbook.md)
- [PostgreSQL validation status](29-postgresql-validation-status.md)
- [Testing-readiness execution package](42-testing-readiness-execution-package.md)

## Historical project snapshots

These remain for traceability but are **not** the current release/control authority:

- [Original implementation issue map](19-issue-map.md)
- [Bangladesh reference PoC analysis](20-bangladesh-reference-poc-analysis.md)
- [Software-completion release plan](30-software-completion-release-plan.md)
- [Original final repository audit](38-final-repository-audit.md)
- [August testing-readiness audit](40-final-testing-readiness-audit.md)
- [Independent AI execution audit](41-independent-ai-execution-audit.md)

## Documentation and restricted-data rules

1. The awarded proposal, BOQ, approved SOP and signed change requests remain commercial/scope authorities.
2. `51-current-release-and-control-state.md` is the repository-state and release-control authority.
3. The repository is private, but restricted client material remains prohibited from Git regardless of visibility.
4. Never commit site footage/frames, datasets/annotations, credentials/RTSP URLs/private network details, evidence binaries, database dumps/backups, runtime secrets or model binaries.
5. Architecture decisions belong in the decision log; database schema changes require reviewed Prisma migrations and recovery impact.
6. Historical audits/plans must not be used to claim the current `main` SHA, governance status or acceptance status.
