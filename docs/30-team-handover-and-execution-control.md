# Final Team Handover and Execution Control

## Purpose

This document is the durable handover reference for the PTC AI Bale Inspection and Monitoring System.

It defines the authoritative code path, team ownership, factory-material controls, deployment sequence, demo and change-control flow, repository cleanup rules and project-closure gates.

## Verified status — July 28, 2026

- The repository currently reports **public** visibility.
- Project Manager `arifkhannamal9288` has write access.
- DevOps Engineer `qamarmujtaba` has read access and requires write or preferably maintain access.
- AI/Backend Engineer `zubairahmed02` has read access and requires write or preferably maintain access.
- PR #69 is open, mergeable and is the authoritative React/Node/PostgreSQL application baseline.
- PR #70 is open, mergeable and draft; it targets the PR #69 branch and contains the AWS/Vercel deployment package.
- A factory visit was completed on July 28, 2026. The Project Manager holds samples, recorded videos and notes that must remain in approved restricted storage.

Issue #14 is the active privacy, access and GitHub-governance blocker.

## Team ownership

### Project Manager / Delivery Owner

- GitHub: `arifkhannamal9288`
- Primary controls: #73, #74 and #75

Responsibilities:

- set priorities and resolve dependencies;
- review the frontend and operational workflow;
- coordinate factory-material inventory and technical walkthroughs;
- lead internal and client demonstrations;
- classify feedback as defect, in-scope completion, clarification or change request;
- approve user-facing changes and UAT results;
- record final delivery and client-handover decisions.

The PM confirms scope and operational acceptance but does not replace technical review.

### DevOps Engineer

- GitHub: `qamarmujtaba`
- Primary issue: #71
- Primary pull request: #70

Responsibilities:

- review and complete the AWS/Vercel deployment package;
- provision AWS through the reviewed CloudFormation stack;
- operate EC2, Docker Compose, Caddy and PostgreSQL;
- configure GitHub Environment `aws-staging`, GitHub OIDC and AWS Systems Manager;
- keep runtime credentials in Parameter Store and outside GitHub;
- deploy and validate the Codistan domains;
- operate health checks, logs, backups, restore drills and rollback;
- package and supervise future edge/monitoring services;
- maintain deployment and operational runbooks.

Read-only access is insufficient. Upgrade to write or preferably maintain before formal ownership begins.

### AI/Backend Engineer

- Name: Zubair Ahmed
- GitHub: `zubairahmed02`
- Primary issue: #72
- Primary pull request for review: #69

Responsibilities:

- review PR #69 as the authoritative implementation baseline;
- review PR #70 for backend and runtime compatibility;
- continue the existing Node.js/Express/PostgreSQL platform;
- implement the Python edge runtime;
- implement camera registry, RTSP ingestion and reconnect behavior;
- implement camera, service, GPU, disk and queue monitoring;
- implement sampling, live-view gateway and rolling evidence buffers;
- implement durable event/evidence spooling and retry;
- implement secure event and health ingestion;
- implement real evidence metadata, storage and protected retrieval;
- prepare approved dataset manifests and annotation guidance;
- build and evaluate detection, tracking, association and inspection-interaction logic;
- implement the SOP state machine and explainable reason codes;
- benchmark the four-camera workload;
- provide tests, contracts, runbooks and PM demo notes.

Read-only access is insufficient. Upgrade to write or preferably maintain before implementation branches, direct issue assignment and formal review requests.

## Authoritative implementation path

### PR #69 — application baseline

PR #69 is the single authoritative application baseline. It contains:

- React/TypeScript/Vite dashboard;
- Node.js/Express/TypeScript API;
- PostgreSQL 17 and Prisma;
- fixed PoC authentication and roles;
- event review and audit workflow;
- deterministic synthetic data;
- local Docker deployment;
- frontend, backend and PostgreSQL recovery validation.

MongoDB, Mongoose and the earlier MERN persistence direction are superseded and must not be restored.

### PR #70 — deployment extension

PR #70 contains:

- AWS CloudFormation;
- EC2 runtime;
- PostgreSQL deployment;
- GitHub Actions OIDC deployment;
- SSM Run Command;
- S3 releases and backups;
- Caddy HTTPS;
- Vercel frontend proxy;
- Codistan staging domains;
- DevOps runbooks and runtime templates.

PR #70 must be reviewed and merged into `feature/68-platform-api`, the PR #69 branch. It must not bypass the authoritative branch or create a competing deployment path.

## Active control map

| Item | Owner | Purpose |
|---|---|---|
| #14 | PM / repository owner | Privacy, permissions, branch protection and governance |
| #15 | PM + AI/Backend | Four-camera survey and placement approval |
| #27 | PM + AI/Backend | Footage permission, storage, lineage and dataset split |
| #63 | PM | Deployed frontend UAT and field-delivery readiness |
| #67 | PM + technical team | Deployment security and PM/client UAT release gate |
| #68 / PR #69 | PM + AI/Backend | Review and merge the authoritative application baseline |
| #71 / PR #70 | DevOps + PM | AWS/PostgreSQL/Vercel staging deployment |
| #72 | AI/Backend + PM | Technical takeover and remaining implementation sequence |
| #73 | PM | Repository cleanup, ownership and delivery control |
| #74 | PM + AI/Backend + DevOps | Convert July 28 factory materials into the implementation baseline |
| #75 | PM + team | Final deployment, internal demo, client demo, feedback and closure |

Detailed edge and AI work remains in issues #20–#34, #37 and #38. Issue #72 is the sequencing entry point.

## Factory-visit material control

The Project Manager holds samples, videos and notes from the July 28, 2026 factory visit.

The actual materials must remain in approved restricted storage. GitHub may contain only sanitized decisions, non-sensitive reference IDs, manifests, implementation requirements and checksums where appropriate.

Never commit:

- raw factory videos or images;
- camera URLs, credentials or production IPs;
- network plans or client-sensitive notes;
- PTC or Bangladesh reference media;
- datasets, extracted frames or annotations containing restricted material;
- evidence clips or snapshots;
- model binaries;
- database dumps or backups;
- runtime secrets or generated environment files.

Issue #74 controls:

- the restricted-material inventory;
- camera and zone decisions;
- SOP interpretation;
- scenario coverage;
- training, calibration and locked-acceptance separation;
- missing capture requirements;
- risk and blocker reporting;
- implementation changes arising from the visit.

## Final takeover sequence

### Gate 1 — access and governance

1. Change the repository to private.
2. Confirm collaborators retain access after the visibility change.
3. Upgrade `qamarmujtaba` and `zubairahmed02` to write/maintain.
4. Configure branch protection, required reviews and applicable CI checks.
5. Configure the protected `aws-staging` deployment environment.

### Gate 2 — factory baseline and reviews

1. Complete the restricted inventory and sanitized outputs in #74.
2. Arif leads the factory-material walkthrough.
3. Zubair reviews PR #69 and records a technical gap report.
4. Qamar reviews PR #70 and records deployment questions or corrections.
5. Arif reviews the frontend and operational flow.

### Gate 3 — consolidate the baseline

1. Resolve PR #70 review comments.
2. Merge PR #70 into `feature/68-platform-api`.
3. Rerun frontend, backend, recovery and deployment validation on the consolidated PR #69 head.
4. Record Zubair's technical approval.
5. Record Arif's PM approval.
6. Merge PR #69 into `main`.
7. Close #68 only after the release record is confirmed.

### Gate 4 — deploy staging

Qamar executes #71:

1. provision AWS;
2. configure OIDC, GitHub Environment and Parameter Store;
3. deploy PostgreSQL and API to EC2;
4. deploy the frontend to Vercel;
5. configure `ptc-aibale.codistan.org`;
6. configure `api.ptc-aibale.codistan.org`;
7. validate `aws.ptc-aibale.codistan.org` as the fallback/test frontend;
8. validate TLS, health, readiness, login, roles, events, review flow and persistence;
9. validate backups and review restore procedures;
10. record the deployed commit and sanitized deployment evidence.

### Gate 5 — internal demo

1. Arif schedules and leads the internal demo.
2. Qamar demonstrates deployment, health and recovery controls.
3. Zubair demonstrates the backend and camera/monitoring/AI continuation plan.
4. The team tests all approved user workflows.
5. Arif records and classifies the punch list.
6. Required client-demo blockers are corrected and regression-tested.

### Gate 6 — client demo and change control

1. Run a pre-demo health and data check.
2. Clearly distinguish synthetic, deployed and real-site-integrated behavior.
3. Do not claim camera/AI completion without PTC-specific integration and evaluation evidence.
4. Record client feedback and decisions.
5. Classify every request before development begins.
6. Obtain approval of the prioritized change list.
7. Implement approved changes through reviewed PRs.
8. Regression-test, redeploy and demonstrate the changes.

### Gate 7 — closure and handover

1. Confirm every required issue is completed, deferred with reason or converted into an approved change request.
2. Reconcile #63 and #67 against deployment and UAT evidence.
3. Remove stale branches only after confirming no unique work remains and preserving decision history.
4. Confirm backup, restore, monitoring and support ownership.
5. Record final release commit, deployment URLs and approved configuration references.
6. Record PM and client acceptance or remaining contractual actions.
7. Close #75 only after the final handover record is complete.

## Repository cleanup rules

### Keep

- PR #69 until the authoritative baseline is merged;
- PR #70 until deployment work is consolidated;
- closed PRs #58 and #62 as superseded historical references;
- architecture decisions, migrations, tests and recovery evidence;
- field and AI issues until genuinely completed or formally deferred.

### Branch deletion rule

Delete a branch only when:

1. it is merged, superseded or explicitly abandoned;
2. no unique commits remain;
3. useful decision history is preserved;
4. the PM and technical owner approve deletion.

### Issue closure rule

- close #14 only after privacy, permissions and governance are verified;
- close #68 only after PR #69 merges;
- close #67 only after deployment security and UAT evidence exists;
- close #63 only after #67 and frontend demo/UAT gates are complete;
- close #74 only after the factory baseline is approved;
- close #75 only after demos, approved feedback, corrections and handover are recorded.

## Working rules

Every implementation PR must:

- reference its owning issue;
- state owner and reviewer;
- explain scope and architecture impact;
- include relevant tests;
- describe deployment and rollback impact;
- update contracts and runbooks where required;
- avoid unrelated cleanup;
- keep real data and secrets outside Git;
- receive PM review for user-facing behavior and technical review for implementation correctness.

The PM should set a realistic delivery plan after the engineers review the code, factory materials, access requirements and deployment accounts. This handover does not promise completion within a fixed number of days.

## Definition of handover completion

Handover is complete when:

- the repository is private and governed;
- every active engineer has suitable permissions and direct assignments;
- factory materials are controlled and converted into approved implementation inputs;
- PR #69 and PR #70 are consolidated and merged correctly;
- staging is deployed and validated;
- internal and client demos are completed;
- approved changes are implemented and regression-tested;
- remaining issues and branches have accurate final states;
- PM and client handover decisions are recorded.