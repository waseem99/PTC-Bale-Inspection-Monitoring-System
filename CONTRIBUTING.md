# Contributing

## Before starting

1. Confirm the work is represented by a GitHub issue.
2. Verify the issue is within MVP or hypercare scope.
3. Confirm acceptance criteria and dependencies.
4. Do not begin blocked work by filling missing client decisions with assumptions.

## Branches

Create a short-lived branch from `main`:

- `feature/<issue>-<name>`
- `fix/<issue>-<name>`
- `docs/<issue>-<name>`
- `test/<issue>-<name>`

## Pull requests

- link the issue using `Closes #<number>` when appropriate;
- explain what changed and what did not change;
- list tests and deployment impact;
- update relevant documentation;
- do not commit restricted client data or production secrets;
- request review from the appropriate technical owner.

## Code boundaries

- shared JSON Schema/OpenAPI contracts belong in `packages/contracts/`;
- camera and synchronization behavior belongs in `services/edge-agent/`;
- model execution belongs in `services/ai-inference/`;
- SOP rules and outcomes belong in `services/compliance-engine/`;
- Node.js/Express application event management belongs in `apps/platform-api/`;
- React user interface belongs in `apps/dashboard-web/`;
- Azure and edge provisioning belong under `infrastructure/`.

Do not duplicate SOP logic in the frontend or platform API.

## Security

Never commit:

- camera URLs, usernames, or passwords;
- Azure secrets or certificates;
- site IP addresses or network diagrams while the repository is public;
- footage, frames, annotations, evidence, or client documents;
- production model binaries;
- personal or biometric data.

## Tests

Changes must include the appropriate tests:

- Python unit/regression tests for edge and AI behavior;
- Jest/Supertest unit and integration tests for the Node.js API and MongoDB data behavior;
- Vitest and Playwright tests for frontend and end-to-end user workflows;
- infrastructure validation for Bicep changes;
- contract compatibility tests for shared JSON Schema/OpenAPI definitions.

## Documentation

Update documentation when changing:

- architecture or service boundaries;
- event contracts or MongoDB collection/index design;
- SOP rules and reason codes;
- deployment steps or configuration;
- security, retention, or access behavior;
- model/versioning and evaluation behavior.

## Definition of done

The issue acceptance criteria are met, tests pass, review is complete, documentation is current, no restricted data is committed, and release/deployment impact is recorded.
