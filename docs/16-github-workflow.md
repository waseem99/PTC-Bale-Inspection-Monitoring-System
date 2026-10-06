# GitHub Workflow and Repository Controls

**Current repository-state authority:** [`51-current-release-and-control-state.md`](51-current-release-and-control-state.md)

## Repository strategy

Use this private repository as the monorepo for the PTC PoC/MVP and closure work. Do not create another repository unless PTC requires a separate ownership/access boundary or an approved change request introduces one.

## Ownership

| Responsibility | Owner |
|---|---|
| Repository/change control | `waseem99` |
| PM/client acceptance coordination | `arifkhannamal9288` |
| Runtime/deployment/database | `qamarmujtaba` |
| AI/integration | `zubairahmed02` |

CODEOWNERS identifies responsible reviewers for application, infrastructure/workflows and governance paths.

## Branching and current enforcement boundary

- `main` is the releasable/change-controlled branch.
- Use short-lived `feature/`, `fix/` or `docs/` branches for normal reviewed work.
- Use semantic release tags when a release is formally accepted.

**Do not describe `main` as technically protected on the current repository plan.** After the repository was made private, GitHub reported the desired private-repository ruleset/branch-protection enforcement as unavailable on the current plan. Issue #14 reviewed and accepted that platform limitation.

Compensating controls are:

1. private repository visibility;
2. restricted client/site/AI material kept outside Git;
3. CODEOWNERS;
4. CI on PRs and pushes to `main`;
5. repository-owner change control;
6. sanitized IDs/versions/checksums only for restricted evidence.

A future GitHub plan upgrade may enable enforced `main` protection as administrative hardening. It is not a current application/project-development blocker.

## Pull request discipline

Normal production-impacting changes should use a PR that:

- references the controlling issue;
- states scope and exclusions;
- lists tests/evidence performed;
- identifies API/contract/database/edge/AI/deployment/documentation impact;
- contains no restricted material or secrets;
- passes applicable CI;
- receives appropriate technical review;
- receives PM review when scope, acceptance, client dependency or change control is affected.

Repository-owner emergency/administrative changes must still be documented and must not bypass the restricted-data boundary.

## Database-changing changes

A database-changing PR must:

- include the Prisma schema change and generated SQL migration;
- explain data-loss, locking, index and compatibility impact;
- define backup/rollback/restoration implications;
- prove migration deployment against a controlled PostgreSQL target;
- update relevant version/recovery documentation;
- avoid destructive reset commands in shared/field environments.

## Definition of ready

An issue is ready when scope is clear, dependencies and client inputs are identified, acceptance criteria are testable, restricted-data/security impact is known, and the work is inside approved scope.

## Definition of done

An issue is done when implementation/review are complete, applicable tests pass, acceptance evidence is recorded, documentation is aligned, no restricted material is committed, release/deployment impact is recorded and PM/client acceptance is captured where required.

## Closure-specific rule

The repository is in closure mode. Do not open broad framework, HA, enterprise-security or toolchain-modernization work unless it is justified by:

- a reproducible defect;
- an approved in-scope acceptance gap;
- required configuration/calibration;
- a demonstrated security/compatibility requirement;
- an approved change request.

Dependency major-version upgrades and infrastructure redesign are not closure work by default.

## Restricted-data rule

Never commit:

- `.env` files, passwords, tokens, certificates/private keys or database URLs;
- RTSP URLs/camera credentials/private IP/network details;
- factory footage, extracted frames, datasets or annotations;
- model binaries/weights or OCR crops;
- evidence binaries, database dumps/backups or runtime state;
- confidential client notes or unnecessary personal data.

## CI/release expectations

Maintain the existing applicable checks for application build/tests, PostgreSQL/migrations, contracts, local runtime, AI pipeline, recovery certification and secret/output scanning. Add new CI only when a real acceptance requirement or reproducible defect requires it; do not turn project closure into an open-ended CI/security programme.

## Current source of truth

Issue maps, historical readiness audits and old embedded SHAs are traceability artifacts only. Current repository/release/governance status is maintained in `docs/51-current-release-and-control-state.md`.
