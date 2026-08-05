# Testing-Readiness Execution Package

**Purpose:** Complete every test-preparation activity that does not require actual PTC footage, trained PTC weights, approved site ROIs or private deployment access.

## Completed package

The repository now contains:

- a deterministic 14-scenario workflow matrix;
- strict backend-compatible synthetic event generation;
- offline validation and acceptance-record generation;
- deployed platform health/release verification;
- synthetic event ingestion, exact replay and conflicting replay checks;
- protected evidence upload/readback checks;
- viewer and supervisor session checks;
- PostgreSQL-backed event retrieval, review, audit, CSV and PDF checks through the API;
- retry/recovery and conflicting-spool-ID tests against the existing durable edge spool;
- Windows and Linux execution wrappers;
- camera/ROI, annotation and final acceptance templates;
- a dedicated GitHub Actions gate.

Synthetic results are clearly labelled and must never be represented as actual PTC AI accuracy.

## Offline execution

Linux/WSL:

```bash
bash scripts/testing/run-testing-readiness.sh
```

Windows PowerShell:

```powershell
.\scripts\testing\run-testing-readiness.ps1
```

The default output directory is `build/testing-readiness`, which is local execution output and must not contain restricted client material.

The offline command:

1. validates the scenario manifest;
2. generates strict synthetic platform events;
3. validates all event fields and the finalized six-step workflow;
4. checks required anomaly and unresolved scenarios;
5. writes a sanitized acceptance record.

## Deployment verification

Set only through protected environment variables or an approved secret manager:

```text
PTC_BASE_URL
SEED_VIEWER_PASSWORD
```

Then run the same wrapper. The deployment check verifies:

- reverse-proxy health;
- viewer login and session restoration;
- release identity;
- camera and health endpoints;
- reporting summary;
- operational diagnostics.

Passwords and service tokens are never written to test records.

## Integrated synthetic UAT

Set the following in the execution environment:

```text
PTC_BASE_URL
INGESTION_SERVICE_TOKEN
SEED_VIEWER_PASSWORD
SEED_SUPERVISOR_PASSWORD
```

The integrated command verifies:

1. all synthetic scenarios are ingested;
2. exact replay is acknowledged as idempotent;
3. a conflicting replay is rejected;
4. evidence is uploaded with SHA-256 and read back through protected endpoints;
5. stored outcomes and reasons match expected values;
6. viewer read access works;
7. supervisor review and audit history work;
8. CSV and PDF reports contain the test data.

This validates the deployed platform and integration contract. It does not validate detector, tracker, hand-inspection, grading, routing or OCR accuracy.

## Synthetic scenario matrix

The authoritative machine-readable source is `tools/testing/scenarios.json`.

It covers:

- valid accepted workflow;
- valid left-side rejected workflow;
- bale not opened;
- hand inspection missing;
- hand inspection incomplete;
- grading missing;
- routing missing;
- routing mismatch;
- weight missing;
- weight unreadable;
- weight unstable;
- ambiguous bale/worker/weight association;
- insufficient visibility;
- model failure as an operational unresolved outcome.

## Failure and recovery coverage

The testing package exercises the existing durable SQLite edge spool by verifying:

- transient delivery failure remains pending and is retried;
- a later successful response acknowledges the same event;
- no event is lost during retry;
- the same spool ID with a changed payload is rejected before delivery.

Full deployed restart/database recovery still requires access to the actual environment because a remote test must not restart production services without an approved maintenance window.

## Camera and ROI preparation

Use:

`services/ai-inference/config/ptc.camera-roi.template.json`

The file is valid runtime configuration but explicitly unapproved. The placeholders must be replaced from actual PTC video/camera frames for:

- inspection/opening area;
- accepted lane;
- left-side rejected lane;
- scale display;
- per-camera thresholds and timing.

No ROI should be treated as approved until the configuration records the approver and approval date.

## Acceptance record

Use:

`tools/testing/acceptance-record.template.json`

The final record must identify the deployed frontend, backend, database migration, edge service, AI service, dataset, annotation, model, rules, OCR and ROI versions plus checksums and approval decisions.

## Remaining external gate

Actual AI testing begins when the team supplies:

- approved actual PTC factory videos and permitted-use confirmation;
- approved annotations and locked ground truth;
- trained PTC model weights and checksum;
- approved ROI/threshold configuration;
- accessible deployment test environment and release identity.

No additional undefined testing-framework development is required before that handoff.
