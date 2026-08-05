# PTC Bale Inspection & Monitoring System

Local-first AI-assisted Proof of Concept for monitoring the complete PTC tobacco-bale inspection process through four fixed cameras, a durable edge adapter, timestamped evidence, PostgreSQL, and an operational browser dashboard.

## Delivery status

The application platform and the testable AI implementation baseline are now present in the repository.

Completed repository-side components include:

- React dashboard, Node.js API, PostgreSQL, evidence, reporting, review, audit and realtime services;
- local one-machine Docker Compose deployment and durable edge spool;
- YOLO/ByteTrack runtime adapter interfaces and detector training/export scripts;
- hand-interaction analysis, grading observation, accepted/rejected routing and scale-display OCR stabilization;
- deterministic end-to-end SOP/anomaly engine;
- platform event mapping, evaluation helpers, recorded-video runner and AI Pipeline CI.

The remaining AI work requires restricted external inputs and execution rather than additional undefined platform development:

1. audit and approve the available factory recordings;
2. create and QA annotations/dataset manifests;
3. train the PTC-specific detector and any required temporal model;
4. configure actual camera and ROI values;
5. run locked accuracy/performance evaluation;
6. complete actual-camera and PM/client acceptance.

The controlling implementation path is issue #86 and issues #27–#34, #114–#116, #84 and #85.

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

Missing, incomplete, inconsistent or technically unresolved steps produce an event with a specific reason code and evidence reference. Camera/model/service failures remain operational events and are not process violations.

## One-command local platform bootstrap

### Windows 11, WSL2, and Docker Desktop

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
- **AI:** Python, Ultralytics YOLO, ByteTrack, optional MediaPipe/pose/action adapters, EasyOCR-compatible display reader
- **Evidence:** protected local filesystem with relational metadata
- **Realtime:** authenticated Server-Sent Events with polling fallback
- **Packaging:** Docker Compose and Caddy
- **Testing:** Jest, Supertest, Vitest, Playwright, Python unittest and GitHub Actions

## Repository and restricted-data rules

The repository is private. Private visibility does not authorize committing restricted client material.

Never commit or attach:

- factory footage or extracted frames;
- annotations or datasets;
- trained model binaries or OCR crops;
- camera URLs, credentials, private IP details or site diagrams;
- runtime configuration, secrets, database dumps, evidence or backups;
- personal data.

Restricted materials remain in approved protected storage and are referenced through safe IDs, manifests and checksums.

## Documentation

- [Documentation index](docs/README.md)
- [AI implementation and testing baseline](docs/39-ai-implementation-and-testing.md)
- [Local deployment](docs/32-local-machine-deployment.md)
- [PM/AI closure runbook](docs/35-pm-ai-project-closure-runbook.md)
