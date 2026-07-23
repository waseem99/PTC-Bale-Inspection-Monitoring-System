# Contributing

## Before starting

1. Confirm the work is represented by a GitHub issue.
2. Verify the issue is within PoC/MVP or hypercare scope.
3. Confirm acceptance criteria and dependencies.
4. Check `docs/20-bangladesh-reference-poc-analysis.md` when the work could be influenced by a reference-video feature.
5. Do not begin blocked work by filling missing client decisions with assumptions.

## Branches

Create a short-lived branch from `main`:

- `feature/<issue>-<name>`
- `fix/<issue>-<name>`
- `docs/<issue>-<name>`
- `test/<issue>-<name>`

## Pull requests

- link the issue using `Closes #<number>` when appropriate;
- explain what changed and what did not change;
- list local/offline tests and deployment impact;
- identify optional Azure impact separately;
- update relevant documentation;
- do not commit restricted client data or production secrets;
- request review from the appropriate technical owner and Project Manager where scope/client acceptance is affected.

## Code boundaries

- shared JSON Schema/OpenAPI contracts belong in `packages/contracts/`;
- camera and optional synchronization behavior belongs in `services/edge-agent/`;
- model execution belongs in `services/ai-inference/`;
- SOP rules and outcomes belong in `services/compliance-engine/`;
- Node.js/Express local application event management belongs in `apps/platform-api/`;
- React local/approved central user interface belongs in `apps/dashboard-web/`;
- local workstation provisioning belongs under `infrastructure/edge/`;
- approved Azure provisioning belongs under `infrastructure/azure/`.

Do not duplicate SOP logic in the frontend or platform API. Do not implement a feature merely because it appears in the Bangladesh reference or generic computer-vision demonstration.

## Security and restricted data

Never commit:

- camera URLs, usernames, or passwords;
- Azure secrets or certificates;
- site IP addresses or detailed production network diagrams;
- footage, frames, annotations, evidence, or client source documents;
- Bangladesh reference media;
- production model binaries;
- personal or biometric data.

The repository being private does not authorize storage of restricted operational media. Use the approved Drive/Azure/local restricted storage and reference event IDs or manifests in GitHub.

## Tests

Changes must include the appropriate tests:

- Python unit/regression tests for edge and AI behavior;
- Jest/Supertest unit and integration tests for the local Node.js API and MongoDB data behavior;
- Vitest and Playwright tests for local dashboard and end-to-end workflows;
- offline/internet-outage tests for core PoC behavior;
- optional synchronization tests where Azure is approved;
- infrastructure validation for Bicep changes;
- contract compatibility tests for shared JSON Schema/OpenAPI definitions.

## Documentation

Update documentation when changing:

- architecture or local/Azure service boundaries;
- event contracts or MongoDB collection/index design;
- SOP rules and reason codes;
- camera orientation, zones, and physical workflow assumptions;
- deployment steps or configuration;
- security, retention, or access behavior;
- model/versioning and evaluation behavior;
- reference-to-PTC scope mapping.

## Definition of done

The issue acceptance criteria are met, tests pass, review is complete, documentation is current, no restricted data is committed, local/offline behavior is preserved, and release/deployment impact is recorded.
