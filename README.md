# PTC Bale Inspection & Monitoring System

Local-first AI-assisted Proof of Concept for monitoring the PTC tobacco-bale inspection process through four fixed cameras, durable edge delivery, timestamped evidence, PostgreSQL and an operational browser dashboard.

## Current project state

The repository-side platform and AI framework implementation are complete. Current work is limited to finite target-environment/local certification and real PTC site/data/model acceptance; undefined platform, HA, enterprise-security or AI-framework expansion is not part of the closure path unless a reproducible defect or approved change request requires it.

**Authoritative current repository/release status:** [`docs/51-current-release-and-control-state.md`](docs/51-current-release-and-control-state.md)

Do not use older audit documents or embedded historical SHAs as the current release status.

## Implemented platform

- React/TypeScript dashboard with authenticated application flow;
- Node.js/Express/TypeScript API;
- PostgreSQL 17 with Prisma and committed migrations;
- review, audit, reporting, evidence and realtime/polling services;
- durable Python/SQLite edge delivery and idempotent replay;
- local Docker Compose packaging, backup, restore and recovery tooling;
- YOLO/ByteTrack-compatible AI runtime interfaces;
- hand-inspection, grading, accepted/rejected routing and scale-display OCR processing;
- deterministic SOP/anomaly engine with backend-compatible reason codes;
- recorded-video runner, evaluation helpers, protected AI audit data and CI/testing framework.

## Finalized monitored process

```text
Bale enters
→ bale is cut/opened
→ proper hand inspection is completed
→ grading is completed
→ bale is routed to accepted or left-side rejected lane
→ weight is read from the weighing-machine display through AI/OCR
→ inspection completes
```

Missing, incomplete, inconsistent or technically unresolved steps produce a specific reason code and evidence reference. Camera/model/service failures are operational events, not process violations.

## One-command local platform bootstrap

### Windows 11, WSL2 and Docker Desktop

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\local\bootstrap.ps1
```

### Ubuntu 22.04/24.04 or WSL

```bash
bash scripts/local/bootstrap.sh
```

Open `http://localhost:8080`.

Full platform instructions: [`docs/32-local-machine-deployment.md`](docs/32-local-machine-deployment.md)

## AI core tests and deterministic replay

```bash
cd services/ai-inference
python -m pip install -e .
python -m unittest discover -s tests -v
python -m ptc_ai replay \
  --config config/poc.example.json \
  --input tests/observations.completed.jsonl
```

Recorded-video testing with approved model weights:

```bash
python -m pip install -e '.[runtime]'
python scripts/run_video.py \
  --video /restricted/sample.mp4 \
  --config /restricted/approved-camera-config.json \
  --camera CAM-01 \
  --weights /restricted/models/ptc-yolo-v1.pt \
  --output /restricted/results/events.jsonl
```

Generic pretrained weights may be used only for plumbing experiments. They cannot be presented as PTC accuracy evidence.

## Architecture

```text
Recorded video / actual camera stream
  → YOLO custom object/state detection
  → ByteTrack camera-local bale tracking
  → inspector-to-bale association
  → pose/hand and temporal interaction analysis
  → grading verification
  → accepted/rejected ROI verification
  → scale-display OCR and temporal stabilization
  → deterministic SOP/anomaly engine
  → durable edge delivery
  → Node.js API
  → PostgreSQL, evidence, dashboard, review and reporting
```

## Technical stack

- **Dashboard:** React, TypeScript, Vite
- **API:** Node.js, Express, TypeScript
- **Database:** PostgreSQL 17, Prisma and committed migrations
- **Edge delivery:** Python, SQLite WAL durable spool
- **AI:** Python, Ultralytics YOLO, ByteTrack, optional pose/action adapters, EasyOCR-compatible display reader
- **Evidence:** protected local filesystem with relational metadata
- **Realtime:** authenticated Server-Sent Events with polling fallback
- **Packaging:** Docker Compose and Caddy
- **Testing:** Jest, Supertest, Vitest, Playwright, Python unittest and GitHub Actions

## Repository and restricted-data rules

The repository is private. Private visibility does not authorize committing restricted client material.

Never commit or attach factory footage/frames, annotations/datasets, trained model binaries, OCR crops, camera URLs/credentials, private IP/network details, runtime secrets/configuration, database dumps/backups, evidence binaries or unnecessary personal data.

Restricted materials remain in approved protected storage and are referenced through sanitized IDs, manifests, versions and checksums.

## Documentation

- [Current release and control state](docs/51-current-release-and-control-state.md)
- [Documentation index](docs/README.md)
- [Local deployment](docs/32-local-machine-deployment.md)
- [PM/AI closure runbook](docs/35-pm-ai-project-closure-runbook.md)
- [Site camera/ROI execution package](docs/50-site-camera-roi-execution-package.md)
