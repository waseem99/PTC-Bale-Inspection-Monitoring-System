# Independent AI Execution Audit

**Audit date:** 2026-08-05  
**Repository baseline reviewed:** `a9b22b61073192ecc3a9e17c2c530566e122cd5a`  
**AI implementation baseline:** `2e1857da8acbf1915b6e1550e828a378dc152bde`

## Purpose

Independently execute every AI-model and integrated-testing check possible with the connected repository, Google Drive and deployment tools, and distinguish verified results from external inputs that are not available.

## Verified code-level execution

The AI Pipeline CI job for PR #117 was re-run on 2026-08-05 against head `342736e7654f14758db55714bb8111ffa6559260`.

The gate installs the dependency-light package, compiles source/tests/scripts, runs the complete 27-test unit/integration suite and performs a deterministic backend-compatible replay. The re-run result must be referenced in #86/#85; it is code-level evidence only and is not PTC model-accuracy evidence.

## Connected media inspected

The connected Drive folder `PTC - AI Bale Detection Project` exposed two short video samples relevant to the earlier reference discussion.

### Reference media R-VID-001

- protected Drive reference: `1AMQJkGcKHjYhk8mp3Co-5qUR0U64149t`;
- SHA-256: `c2af385c85c37f99a499ee67fd05409f47b5fbdbda9eaf78bd1be23d4fc1996f`;
- codec/resolution: H.264, 1628×908;
- duration/frames: 47.086997 seconds, 1,247 frames;
- observed content: overhead bale-processing/reference footage with a `Camera 02`/`Not Scanned` overlay and a visible 2024 date;
- decision: useful only as reference/feasibility material. It does not provide the complete approved PTC sequence, approved PTC camera geometry, visible grading evidence, accepted/rejected lane ground truth, scale-display OCR ground truth or a locked PTC acceptance set.

### Reference media R-VID-002

- protected Drive reference: `1m6p2ycok6-nBdIXZcqyq5bf7RpjXDool`;
- SHA-256: `e62c9a0c9af0e14fa45dc53075fea906def5b89fd0f05398ad796d274177704b`;
- codec/resolution: H.264, 966×720;
- duration/frames: 55.566667 seconds, 1,667 frames;
- observed content: generic people/cup tracking demonstration;
- decision: out of scope for PTC bale-model training, calibration or acceptance.

No raw video, frame or contact sheet is committed to GitHub.

## Asset searches completed

Searches of the connected PTC Drive location and accessible repository found no approved operational package containing:

- actual PTC factory training/locked-test videos;
- annotation files or a QA-approved dataset manifest;
- trained PTC-specific `.pt`, ONNX or TensorRT model artifacts;
- approved inspection, grading, accepted-lane, rejected-lane and scale-display ROI JSON;
- locked expected-outcome labels and numerical acceptance thresholds.

The repository correctly contains only example manifests/configuration and deliberately excludes restricted media and model binaries.

## Deployment/integration access result

A previously recorded PTC Vercel frontend URL was tested through the connected deployment tooling, but the connector could not establish a shareable/accessible session. The connected Vercel account does not expose a matching PTC project, and no accessible backend base URL, machine-ingestion credential or test-user credential was found in the repository, connected Drive or Gmail search.

Therefore the following cannot be executed from the current connected environment:

- loading a trained PTC model into the deployed runtime;
- running the actual PTC videos through detector/tracker/hand/grading/routing/OCR components;
- posting generated events to the deployed ingestion endpoint;
- verifying PostgreSQL, evidence, dashboard, audit and report results;
- executing restart/retry/recovery and multi-stream deployed benchmarks.

## Completion decision

### Completed independently

- repository and AI source review;
- code-level CI re-run request;
- reference-media inventory, metadata, checksum and suitability audit;
- search for trained models, datasets, annotations, ROIs and deployment access;
- confirmation that reference/demo videos cannot be treated as actual PTC acceptance evidence;
- exact integrated-test procedure already exists under #85.

### Blocked by external operational inputs

Actual steps 2 and 3 cannot be marked passed until one controlled handoff package is available containing:

1. protected actual PTC factory-video folder/reference IDs and permitted-use decision;
2. approved annotation/dataset/locked-test manifests and ground truth;
3. trained PTC model artifact plus version and SHA-256 checksum;
4. approved camera/ROI configuration JSON and thresholds;
5. deployed backend base URL and a non-secret test-access method;
6. deployed frontend/backend/database/edge version identity.

These are operational assets, not missing repository framework code. Creating fabricated weights, guessed ROIs or unsupported expected labels would invalidate the acceptance result.

## Status wording

> The AI implementation and deterministic integration framework are code-complete. Independent inspection found only reference/demo media and no accessible PTC-trained weights, approved dataset/ROIs or deployed backend test access. Actual PTC model validation and integrated deployed UAT remain blocked until the controlled operational handoff package is provided.
