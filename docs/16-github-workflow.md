# GitHub Workflow and Project Setup

## Repository strategy

Use this repository as the monorepo for the MVP. Do not create another repository at this stage.

A separate repository is needed only if PTC requires separate access boundaries, the infrastructure must move into a client-owned repository, or model development becomes independently owned.

## Branching

- `main`: protected, releasable branch;
- short-lived feature branches: `feature/<issue>-<name>`;
- bug branches: `fix/<issue>-<name>`;
- documentation branches: `docs/<issue>-<name>`;
- release tags: semantic versions, with MVP tagged `v1.0.0-mvp` after acceptance.

Direct production code changes to `main` are not permitted after the foundation setup.

## Pull request requirements

A pull request must:

- reference its issue;
- explain scope and exclusions;
- list tests performed;
- identify configuration, model, contract, database, Azure, and documentation impact;
- contain no secrets, client footage, production IPs, evidence, or model binaries;
- pass required CI checks;
- receive at least one appropriate review;
- remain small enough to review reliably.

## Definition of ready

An issue is ready when:

- scope is clear;
- dependencies are identified;
- acceptance criteria are testable;
- required client decisions are available or explicitly tracked;
- security and data impact are known;
- it is within the approved MVP or hypercare scope.

## Definition of done

An issue is done when:

- implementation and review are complete;
- tests pass;
- acceptance criteria are evidenced;
- logs and failure behavior are considered;
- documentation is updated;
- no restricted data is committed;
- related configuration and migration changes are versioned;
- deployment or release impact is recorded.

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
- `area:site`
- `area:hardware`
- `area:edge`
- `area:ai`
- `area:backend`
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
- `dependency:hardware`
- `dependency:azure`
- `status:blocked`

## Recommended GitHub Project fields

| Field | Values |
|---|---|
| Status | Backlog, Ready, In Progress, Review, Blocked, Client Validation, Done |
| Priority | P0, P1, P2, P3 |
| Area | Scope, Site, Hardware, Edge, AI, Backend, Web, Azure, Security, QA, Docs |
| Delivery stage | MVP, Hypercare, Change Request |
| Target week | W1 through W13 |
| Client dependency | Yes, No |
| Acceptance owner | Codistan, PTC, Joint |
| Effort | XS, S, M, L, XL |

## Recommended views

1. **MVP board:** filtered to delivery stage MVP, grouped by Status.
2. **Current week:** filtered by Target week.
3. **Client dependencies:** Client dependency Yes and Status not Done.
4. **AI workstream:** Area AI, grouped by Status.
5. **Site readiness:** Site and Hardware areas.
6. **Hypercare:** delivery stage Hypercare.
7. **Change requests:** scope change-request, excluded from MVP execution.

## Milestone structure

- M0 Scope and Architecture Locked
- M1 Site and Hardware Ready
- M2 Edge Video Platform Ready
- M3 AI Compliance Model Ready
- M4 Backend and Azure Platform Ready
- M5 Dashboard Ready
- M6 MVP UAT and Release
- M7 Hypercare and Final Stabilization

## Issue hierarchy

GitHub issues are organized as:

- epic issue per workstream;
- implementation issues linked to one epic;
- sub-tasks used only when independently deliverable or assignable;
- bugs linked to the feature and release where discovered.

Issue titles use a milestone prefix:

```text
[M0] Confirm approved bale inspection SOP
[M2] Implement RTSP camera ingestion and reconnect
[M3] Implement inspection SOP state machine
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
fix(ai): prevent lost tracks from creating violations
docs(scope): clarify permanent bale identity exclusion
test(api): add ingestion idempotency coverage
chore(ci): add dashboard build workflow
```

## CI checks to introduce with code

- formatting and linting;
- unit tests;
- API build and tests;
- dashboard build and tests;
- Python tests and type/lint checks;
- contract compatibility checks;
- dependency vulnerability checks;
- secret scanning;
- infrastructure validation;
- container/package build where used.

## GitHub limitations and manual setup

The connected workflow can create repository files and issues, but GitHub Project custom fields, repository labels, milestones, branch rules, and project-item assignment may require manual GitHub configuration. This document defines the exact setup to apply.
