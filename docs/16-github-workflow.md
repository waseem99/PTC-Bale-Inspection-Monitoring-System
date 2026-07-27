# GitHub Workflow and Project Setup

## Repository strategy

Use this private repository as the monorepo for the PoC/MVP. Do not create another repository at this stage.

A separate repository is needed only if PTC requires separate access boundaries, infrastructure must move into a client-owned repository, or model development becomes independently owned.

## Project Manager ownership

The Project Manager (`arifkhannamal9288`) is assigned to:

- epics #1 through #8;
- reference-to-PTC mapping #59;
- client decisions, scope, SOP, architecture, retention, UAT, and governance issues;
- site survey, hardware/vendor, network, installation, and acceptance coordination;
- UAT, handover, training, hypercare cadence, and closure.

The PM is accountable for dependency follow-up, acceptance evidence coordination, client decisions, status hygiene, and change control. Technical implementation issues remain assigned to the relevant engineering owner; the PM should not be the sole implementation assignee unless performing the work.

## Branching

- `main`: protected, releasable branch;
- short-lived feature branches: `feature/<issue>-<name>`;
- bug branches: `fix/<issue>-<name>`;
- documentation branches: `docs/<issue>-<name>`;
- release tags: semantic versions, with PoC tagged `v1.0.0-mvp` after acceptance.

Direct production code changes to `main` are not permitted after the foundation setup.

## Pull request requirements

A pull request must:

- reference its issue;
- explain scope and exclusions;
- identify whether any behavior originated from the Bangladesh reference and show its PTC approval;
- list local/offline tests performed;
- identify model, contract, PostgreSQL schema/migration, edge, local application, optional Azure, and documentation impact;
- contain no secrets, database URLs/dumps, client footage, production IPs, evidence, reference media, or model binaries;
- pass required CI checks;
- receive at least one appropriate technical review;
- receive PM review when scope, client dependency, acceptance, delivery, or change control is affected;
- remain small enough to review reliably.

Database-changing PRs must additionally:

- include the Prisma schema change and generated SQL migration;
- explain data-loss, locking, index and compatibility impact;
- define backup, rollback/compensation and restoration requirements;
- prove migration deployment against a clean test database;
- update database/version documentation;
- avoid destructive reset commands for shared/field environments.

## Definition of ready

An issue is ready when:

- scope is clear;
- reference-project assumptions have been separated from PTC requirements;
- dependencies are identified;
- acceptance criteria are testable;
- required client decisions are available or explicitly tracked;
- security and data impact are known;
- local/offline behavior is understood;
- database/migration impact is known where applicable;
- it is within the approved PoC/MVP or hypercare scope.

## Definition of done

An issue is done when:

- implementation and review are complete;
- tests pass, including local/offline and PostgreSQL tests where applicable;
- acceptance criteria are evidenced;
- logs and failure behavior are considered;
- documentation is updated;
- no restricted data is committed;
- related configuration, model, contract, Prisma schema and SQL migration changes are versioned;
- database backup/restore impact is addressed;
- deployment or release impact is recorded;
- client/PM acceptance is recorded where required.

## Recommended labels

### Type

- `type:epic`
- `type:feature`
- `type:task`
- `type:bug`
- `type:spike`
- `type:documentation`

### Area

- `area:scope`
- `area:reference`
- `area:site`
- `area:hardware`
- `area:edge`
- `area:ai`
- `area:backend`
- `area:database`
- `area:web`
- `area:azure`
- `area:security`
- `area:qa`
- `area:docs`

### Priority

- `priority:p0`
- `priority:p1`
- `priority:p2`
- `priority:p3`

### Scope and dependency

- `scope:mvp`
- `scope:hypercare`
- `scope:change-request`
- `dependency:client`
- `dependency:reference-clarification`
- `dependency:hardware`
- `dependency:azure`
- `dependency:database-migration`
- `status:blocked`

## Recommended GitHub Project fields

| Field | Values |
|---|---|
| Status | Backlog, Ready, In Progress, Review, Blocked, Client Validation, Done |
| Priority | P0, P1, P2, P3 |
| Area | Scope, Reference, Site, Hardware, Edge, AI, Backend, Database, Web, Azure, Security, QA, Docs |
| Delivery stage | PoC/MVP, Hypercare, Change Request |
| Target week | W1 through W13 |
| Client dependency | Yes, No |
| Acceptance owner | Codistan, PTC, Joint |
| PM coordination | Required, Not Required |
| Effort | XS, S, M, L, XL |

## Recommended views

1. **PoC board:** filtered to delivery stage PoC/MVP, grouped by Status.
2. **Current week:** filtered by Target week.
3. **Client dependencies:** Client dependency Yes and Status not Done.
4. **Reference mapping:** Area Reference or dependency reference-clarification.
5. **PM coordination:** PM coordination Required and Status not Done.
6. **AI workstream:** Area AI, grouped by Status.
7. **Database changes:** Area Database or dependency database-migration.
8. **Site readiness:** Site and Hardware areas.
9. **Hypercare:** delivery stage Hypercare.
10. **Change requests:** scope change-request, excluded from PoC execution.

## Milestone structure

- M0 Reference, Scope, and Architecture Locked
- M1 Site and Hardware Ready
- M2 Local Edge Video Platform Ready
- M3 PTC AI Compliance Model Ready
- M4 Local React/Node/PostgreSQL and Approved Azure Management Plane Ready
- M5 Local Dashboard Ready
- M6 PoC UAT and Release
- M7 Hypercare and Final Stabilization

## Issue hierarchy

GitHub issues are organized as:

- epic issue per workstream;
- implementation issues linked to one epic;
- sub-tasks used only when independently deliverable or assignable;
- bugs linked to the feature and release where discovered.

Issue titles use a milestone prefix:

```text
[M0] Translate Bangladesh reference into PTC validation baseline
[M0] Confirm approved bale inspection SOP
[M2] Implement RTSP camera ingestion and reconnect
[M3] Implement inspection SOP state machine
[M4] Add PostgreSQL migration for edge event ingestion
[M6] Complete client UAT and sign-off
```

## Dependency notation

Issue bodies must include:

```markdown
## Dependencies
- Blocked by #123
- Blocks #456
- Client dependency: CI-01
```

## Commit convention

```text
feat(edge): add RTSP reconnect policy
feat(db): add inspection event migration
fix(ai): prevent lost tracks from creating violations
fix(db): preserve review audit transaction
chore(db): remove obsolete MongoDB implementation
docs(scope): clarify reference feature exclusion
test(api): add PostgreSQL ingestion idempotency coverage
chore(ci): add dashboard build workflow
```

## CI checks to introduce with code

- formatting and linting;
- unit tests;
- local Node API build and tests;
- Prisma Client generation and migration validation;
- PostgreSQL integration tests;
- PostgreSQL container/startup and backup/restore smoke tests;
- React dashboard build and tests;
- Python tests and type/lint checks;
- local/offline end-to-end tests;
- contract compatibility checks;
- dependency vulnerability checks;
- secret/database URL scan;
- local installation/package validation;
- optional Azure infrastructure validation;
- container/package build where used.

## Lockfile rule

`pnpm` is the only approved Node package manager. A reviewed `pnpm-lock.yaml` must be committed before release. CI may use non-frozen installation only until the lockfile is generated and reviewed; release CI must use `--frozen-lockfile`.

## GitHub limitations and manual setup

The connected workflow can create repository files, issues, assignees, and pull-request review requests. GitHub Project custom fields, repository labels, milestones, branch rules, and project-item assignment may still require manual GitHub configuration. This document defines the exact setup to apply.
