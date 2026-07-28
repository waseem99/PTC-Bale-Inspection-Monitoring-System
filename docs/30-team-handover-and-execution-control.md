# Team Handover and Execution Control

## Purpose

This document defines the operational ownership, review gates and repository cleanup rules for the PTC AI Bale Inspection and Monitoring System.

It prevents parallel architectures, duplicated deployment work, unowned issues and confusion between application delivery, infrastructure delivery and project acceptance.

## Active team

### Project Manager

- GitHub: `arifkhannamal9288`
- Responsibility: scope, priorities, frontend feedback, site-visit/SOP interpretation, UAT, demo coordination and release acceptance.
- Review role: required PM review for the authoritative platform baseline and later field-facing vertical slices.

The PM does not replace technical review. The PM confirms that the delivered behavior matches the approved business and operational workflow.

### DevOps Engineer

- GitHub: `qamarmujtaba`
- Primary issue: #71
- Primary pull request: #70

Responsibilities:

- review and complete the AWS/Vercel deployment package;
- provision the approved AWS account through CloudFormation;
- operate EC2, Docker Compose, Caddy and PostgreSQL;
- configure GitHub Environment `aws-staging`, GitHub OIDC and AWS Systems Manager;
- keep runtime credentials in Parameter Store and outside GitHub;
- deploy the Vercel frontend and Codistan domains;
- validate DNS and TLS;
- operate health checks, logs, backups, restore drills and rollback;
- maintain deployment and operational runbooks;
- support the AI/backend engineer with runtime deployment, service supervision and diagnostics.

Access requirement:

`qamarmujtaba` must have at least repository write access. Maintain access is preferable if the engineer must manage workflows, environments, deployment settings and release operations. Read-only permission is insufficient for operational ownership.

### AI/Backend Engineer

- Name: Zubair Ahmed
- GitHub: `zubairahmed02`
- Current permission: read-only; upgrade to write or maintain is required
- Primary issue: #72

Responsibilities:

- review PR #69 as the authoritative implementation baseline;
- review PR #70 for backend, runtime and service compatibility;
- continue the existing Node.js/Express/PostgreSQL platform rather than starting a replacement backend;
- implement the Python edge runtime;
- implement camera registration, RTSP ingestion and reconnect behavior;
- implement camera, service, GPU, disk and queue monitoring;
- implement frame sampling, live-view gateway and rolling evidence buffers;
- implement durable event/evidence spooling and retry;
- implement secure event and health ingestion into the platform API;
- implement real evidence metadata, protected snapshot/clip storage and retrieval;
- prepare approved data manifests and annotation guidance;
- train and evaluate bale/person detection, local tracking and worker-to-bale association;
- implement opening/checking/frisking interaction signals;
- implement the versioned SOP state machine and explainable reason codes;
- benchmark the four-camera workload on the approved workstation;
- provide tests, contracts, runbooks and PM demo notes for each vertical slice.

The exact GitHub username is confirmed. Direct issue assignment, implementation branches and formal PR review requests must wait until `zubairahmed02` is upgraded from read to write or maintain access.

## Authoritative implementation path

### PR #69

PR #69 is the single authoritative application baseline. It contains:

- React/TypeScript/Vite dashboard;
- Node.js/Express/TypeScript API;
- PostgreSQL 17 and Prisma;
- authentication and fixed PoC roles;
- event review and audit workflow;
- deterministic synthetic data;
- local Docker deployment;
- frontend, backend and PostgreSQL recovery validation.

MongoDB, Mongoose and the earlier MERN persistence direction are superseded and must not be restored.

### PR #70

PR #70 is the AWS/Vercel deployment extension. It must be reviewed and folded into the PR #69 implementation path before the consolidated baseline reaches `main`.

It owns:

- AWS CloudFormation;
- EC2 runtime;
- PostgreSQL deployment;
- GitHub Actions OIDC deployment;
- SSM Run Command;
- S3 releases and backups;
- Caddy HTTPS;
- Vercel frontend proxy;
- Codistan staging domains.

### Main release gate

Issue #68 remains open until:

1. PM review is recorded;
2. AI/backend technical review is recorded;
3. PR #70 deployment work is consolidated into the authoritative path;
4. all required CI checks pass;
5. PR #69 is merged into `main`;
6. release evidence is recorded.

## Active execution issues

| Issue | Owner | Purpose |
|---|---|---|
| #68 | PM + technical reviewer | Review and merge the validated platform baseline |
| #71 | DevOps | AWS, PostgreSQL, Vercel, DNS, backup and deployment |
| #72 | Zubair Ahmed (`zubairahmed02`) | Code review, edge monitoring, camera, evidence and AI delivery |
| #73 | PM | Repository cleanup, ownership and delivery control |

The detailed edge and AI tasks remain in issues #20–#34, #37 and #38. Issue #72 is their handover and sequencing entry point.

## Delivery sequence

### Gate 1 — baseline consolidation

1. PM reviews product flow and frontend readiness.
2. AI/backend engineer reviews PR #69 and publishes a gap report.
3. DevOps reviews PR #70 and the AWS runbook.
4. Deployment work is consolidated into the authoritative branch.
5. CI runs against the consolidated branch.
6. PR #69 is merged into `main` after approvals.

### Gate 2 — synthetic staging

1. DevOps provisions AWS.
2. DevOps deploys PostgreSQL and the API on EC2.
3. DevOps deploys the frontend to Vercel at `ptc-aibale.codistan.org`.
4. DevOps validates the AWS fallback at `aws.ptc-aibale.codistan.org`.
5. The team validates login, roles, dashboard, events, reviews, exports, persistence and recovery.
6. PM records staging acceptance and frontend feedback.

### Gate 3 — edge monitoring foundation

1. AI/backend engineer implements configuration and camera registry.
2. AI/backend engineer implements health monitoring.
3. AI/backend engineer implements RTSP reconnect, sampling and live view.
4. AI/backend engineer implements evidence buffer and durable spool.
5. DevOps packages and supervises the services.
6. PM reviews field usability and monitoring presentation.

### Gate 4 — real evidence and AI

1. Implement event and health ingestion.
2. Implement real snapshots and clips.
3. Curate approved PTC data.
4. Build detection, tracking and association baselines.
5. Implement interaction recognition and SOP logic.
6. Benchmark all four streams.
7. Integrate real outcomes into the existing review/audit workflow.
8. Complete technical acceptance and PM/client UAT.

## Frontend ownership

The existing frontend remains the approved baseline.

Frontend changes should be limited to:

- integration required by real API, event, evidence or monitoring behavior;
- defects discovered during staging or field testing;
- explicit PM/client feedback;
- accessibility, responsiveness or operational clarity fixes.

The AI/backend or DevOps engineer should not redesign the dashboard independently. PM reviews the need and acceptance of user-facing changes.

## Repository cleanup rules

### Keep

- PR #69 as the authoritative baseline until merged;
- PR #70 as the deployment extension until consolidated;
- closed PRs #58 and #62 as superseded historical evidence;
- architecture and decision records;
- completed issue history;
- tests, migration history and recovery evidence.

### Close after release confirmation

- issue #68 after the authoritative merge;
- issue #67 after CI/security/release evidence is confirmed in the merged baseline;
- epic #63 after its children and frontend UAT/release evidence are complete.

### Review before branch deletion

Delete a stale branch only when:

1. it is merged, superseded or explicitly abandoned;
2. no unique commits remain;
3. any useful decision history is preserved in an issue, PR or document;
4. the PM or technical owner confirms deletion.

### Never commit

- credentials or connection strings;
- camera URLs or production IP addresses;
- client site diagrams;
- PTC or Bangladesh footage;
- annotations containing restricted data;
- model binaries;
- evidence snapshots or clips;
- database dumps or backups;
- generated deployment runtime files.

## Security and visibility

The repository must be private before client-sensitive material is introduced. Private visibility does not permit restricted data to be committed; the existing external-storage and secret-management boundaries remain mandatory.

AWS staging uses synthetic data until cloud handling of real PTC material is explicitly approved.

## Pull request rules

Every implementation PR must:

- reference its owning issue;
- state the owner and reviewer;
- explain scope and architecture impact;
- include relevant tests;
- describe deployment and rollback impact;
- update contracts and runbooks where required;
- avoid unrelated cleanup in feature PRs;
- keep real data and secrets outside Git;
- receive PM review for user-facing behavior and technical review for implementation correctness.

## Immediate administrative actions

- [ ] Upgrade `qamarmujtaba` to write or maintain access.
- [x] Confirm Zubair Ahmed's exact GitHub username as `zubairahmed02`.
- [ ] Upgrade `zubairahmed02` to write or maintain access.
- [ ] Assign Qamar to #71 and request him on PR #70.
- [ ] Assign `zubairahmed02` to #72 and request technical review on PR #69.
- [ ] Make the repository private before any client-sensitive upload.

## Definition of handover completion

Handover is complete when:

- every active engineer has suitable permissions;
- #71 and #72 have actual GitHub assignees;
- PR #69 and PR #70 have the correct reviewers;
- the authoritative baseline is merged into `main`;
- staging deployment is operational;
- edge/AI work begins from the existing architecture;
- PM reviews each user-facing vertical slice;
- no duplicate architecture or deployment track remains.
