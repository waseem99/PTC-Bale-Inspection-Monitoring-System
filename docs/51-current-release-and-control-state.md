# Current Release and Control State

**Status:** Authoritative current repository-state record  
**Last reviewed:** 2026-10-17  
**Repository:** `waseem99/PTC-Bale-Inspection-Monitoring-System`  
**Default branch:** `main`  
**Repository visibility:** private

This is the single current source of truth for repository state, release-control status, privacy/governance boundaries and the remaining closure gates. When an older audit, issue description or historical plan conflicts with this document, this document controls unless a newer approved issue comment or release record explicitly supersedes it.

## 1. Current software baseline

Current `main` after the Codistan browser-acceptance tooling merge is:

`797f4c6d8b0b56c6837f52d77bdcdfec8bcc3c8d`

The latest runtime/application-behavior change is:

`f2fab2bdcc42403b980ccf4aa725ae8e01473811`

That runtime change merged PR #169 and replaced the misleading login-side “Connected API” indication with a real API/PostgreSQL readiness check, exposed real `/healthz` and `/readyz` through the local proxy, and made login timeout failures actionable without changing authentication behavior.

PR #170 then added browser/CI acceptance tooling without changing the PTC inspection domain logic. It introduced the Codistan deployed Playwright acceptance gate, Chromium/Firefox coverage, failure artifacts and `docs/52-codistan-browser-acceptance.md`.

Recent code/release controls already merged include:

- PR #170 — Codistan deployed end-to-end browser acceptance tooling;
- PR #169 — real login/API/PostgreSQL readiness diagnostics;
- PR #162 — #33 deterministic SOP/anomaly-engine acceptance closure;
- PR #161 — executable #84 site camera/ROI preflight package;
- PR #160 — #155 30-day browser-session timer defect fix;
- PR #159 — automated backup/recovery certification;
- PR #150 and related closure work — finite Option A database-resilience tooling.

The current GitHub-hosted Actions service for this repository is failing before job execution (`runner_id: 0`, empty job steps). This is an execution-platform limitation, not passing or failing application evidence. No CI run should be described as having tested code while jobs are failing before their first step.

## 2. Repository governance state

Issue #14 is **closed/completed**. The verified governance position is:

- repository is private;
- `waseem99` retains repository administration/change control;
- `arifkhannamal9288`, `qamarmujtaba` and `zubairahmed02` have delivery access;
- `.github/CODEOWNERS` and CI workflows are present;
- restricted material remains prohibited from Git regardless of repository visibility;
- current private-repository GitHub plan does not provide the desired enforced `main` ruleset/branch-protection features;
- that GitHub plan limitation is accepted and does not reopen application/security scope;
- no current workflow depends on a GitHub deployment-environment reviewer gate.

`main` is therefore the releasable/change-controlled branch, but it must **not** be described as technically protected while the current GitHub plan leaves branch protection disabled. CODEOWNERS, CI, repository-owner control and the review workflow are the compensating controls.

## 3. Restricted-data boundary

Never commit or attach any of the following to GitHub:

- raw factory footage, extracted frames or private site images;
- annotations, datasets or locked-test material;
- RTSP URLs, camera credentials, private IP/network details or confidential site diagrams;
- runtime secrets, `.env` files, private keys/certificates or database connection strings;
- evidence binaries, database dumps/backups or protected runtime state;
- trained model binaries/weights or OCR crops;
- confidential client notes or unnecessary personal data.

GitHub may contain sanitized IDs, manifests, versions, checksums, acceptance results and non-secret configuration examples only.

The approved AI privacy boundary remains: no face recognition, biometric identification, named-worker tracking, employee scoring or unrelated person analytics.

## 4. Software/repository work considered complete

Do not reopen the following into undefined framework/platform development without a reproducible defect or approved change request:

- React dashboard and authenticated same-origin application flow;
- Node.js/Express platform API;
- PostgreSQL/Prisma schema, migrations and persistent application behavior;
- authentication/session, authorization, review, audit, reports and evidence access;
- deterministic event ingestion/idempotency and durable edge delivery;
- local Docker/Compose packaging, backup, restore and recovery tooling;
- AI runtime interfaces, deterministic SOP/reason-code engine and protected AI audit records;
- recorded-video runner, evaluation helpers and CI/testing framework;
- deployed-browser acceptance tooling for Codistan UAT;
- repository confidentiality/governance gate under #14;
- automated software recovery certification.

Major dependency/toolchain migrations are maintenance work, not a release blocker, unless a demonstrated vulnerability or compatibility requirement makes one necessary.

## 5. Remaining internal/target-environment closure gates

These are finite execution/acceptance tasks, not permission to redesign the platform:

### #83 — deployment acceptance

**Open.** Repository-side deployment and browser-acceptance tooling are complete. Remaining closure is limited to the real Codistan/selected target deployment gate and explicit PM/client acceptance.

For the Codistan UAT target, the selected `main` commit must be deployed and the deployed-browser acceptance workflow in `docs/52-codistan-browser-acceptance.md` must be run against the actual hosted URL. Acceptance requires the real browser flow to pass for readiness, Viewer/Supervisor/Admin authentication, protected navigation, event review persistence, evidence/audit rendering, reports/downloads, logout and browser/runtime error checks. A lower-level API health check alone is not sufficient deployment acceptance.

The controlled service restart/persistence check remains a DevOps action followed by rerunning the same Playwright browser suite. Do not claim this gate complete until the actual target run and artifacts exist.

### #102 — local UAT and local release certification

**Open.** PM must first confirm whether this separate local/offline workstation certification remains required in the final scope. If applicable, execute the existing simulator/local package on the target workstation, record install/UAT/restart/backup/restore/offline evidence, publish the local release manifest/tag where applicable, and obtain PM acceptance. If not applicable, record N/A/deferred disposition instead of inventing work.

### #148 — database resilience Option A real-environment execution

**Open.** Repository/software work and automated recovery certification are complete. Remaining work is only approved-environment execution of separate PostgreSQL endpoint, off-primary backup/checksum, disposable restore, restored-DB application smoke and documented manual recovery. HA clusters, Patroni/repmgr, automatic failover and enterprise DR expansion are explicitly outside the current closure path.

## 6. Remaining PTC/site/data/model gates

These genuinely depend on PTC/site/client inputs or execution:

- #84 — actual Camera 01–04 mapping, physical views, six ROIs, reconnect/failure isolation and site approval;
- #27–#29 — approved controlled capture, annotation QA and dataset freeze;
- #30–#32 plus #114–#116 — PTC-specific training/calibration and component validation;
- #34 — locked real-data evaluation and packaged model/configuration release;
- #85 — integrated AI UAT on approved recorded/live inputs through backend/database/dashboard/evidence/reporting;
- #86 — final AI testing/acceptance parent;
- #52/#53 — PM/client UAT, training, handover and final sign-off.

Hypercare issues #8 and #54–#57 are post-acceptance/conditional and must not be converted into current handover or technical-acceptance blockers unless the contract/PM/client explicitly activates them.

## 7. Controlling AI sequence

```text
#84 camera/site/ROI + required controlled capture
→ #27–#29 data audit / annotation / dataset freeze
→ #30–#32 + #114–#116 train / calibrate / validate components
→ #34 locked release/evaluation
→ #85 integrated recorded + live UAT
→ #86 final AI acceptance
```

Parallel internal closure may continue on #83, applicable #102 and #148 without waiting for final PTC model/site acceptance.

## 8. Correct status wording

Use the following project wording until the remaining gates are recorded:

> Repository-side platform, AI framework and browser-acceptance tooling are complete. The current closure work is limited to finite target-environment execution/browser acceptance, applicable local certification, and real PTC site/data/model/client acceptance. No additional undefined platform, HA, enterprise-security or AI-framework development is required unless a reproducible defect or approved change request is identified.

Do not describe Codistan deployment/browser acceptance as complete until the actual deployed Playwright run passes and its artifacts are retained.

## 9. Document authority

Current/control documents:

- this file — repository/release/governance/closure state;
- `docs/35-pm-ai-project-closure-runbook.md` — execution order and acceptance process;
- `docs/37-ai-acceptance-release-template.md` — sanitized AI acceptance record;
- `docs/44-database-resilience-option-a.md` — finite DB-resilience execution boundary;
- `docs/49-recovery-rebuild-security-closure.md` — software recovery/rebuild certification boundary;
- `docs/50-site-camera-roi-execution-package.md` — executable #84 site package;
- `docs/52-codistan-browser-acceptance.md` — deployed Codistan browser-acceptance gate and execution runbook.

Historical snapshots such as `docs/19-issue-map.md`, `docs/38-final-repository-audit.md` and `docs/40-final-testing-readiness-audit.md` remain evidence of earlier project states but are not current release-control authorities.
