# PTC Bale Inspection & Monitoring System

Local-first AI-assisted Proof of Concept for monitoring the PTC bale inspection process through four fixed cameras, a durable edge adapter, timestamped evidence, PostgreSQL, and an operational browser dashboard.

## Immediate deployment target

The current release target is **one local workstation**. AWS, Vercel, Azure, public DNS, and managed cloud services are deferred and do not block local software completion.

The local package runs:

- approved React/TypeScript dashboard;
- Node.js/Express/TypeScript API;
- PostgreSQL 17 with committed Prisma migrations;
- durable SQLite edge spool and deterministic four-camera simulator;
- protected evidence storage outside PostgreSQL and the public web root;
- authenticated realtime SSE with polling fallback;
- CSV and generated PDF reports;
- local reverse proxy providing one browser origin;
- local database/evidence backup and recovery tooling.

The deterministic simulator validates software workflows only. It is not actual PTC camera or AI acceptance evidence.

## One-command local bootstrap

### Windows 11, WSL2, and Docker Desktop

From PowerShell in the repository root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\local\bootstrap.ps1
```

### Ubuntu 22.04/24.04 or WSL

```bash
bash scripts/local/bootstrap.sh
```

Then open:

```text
http://localhost:8080
```

Bootstrap generates strong local credentials but does not print them. Runtime configuration and all durable data are stored outside the repository.

Full instructions: [`docs/32-local-machine-deployment.md`](docs/32-local-machine-deployment.md)

## Daily operations

Windows:

```powershell
.\scripts\local\ptc-local.ps1 status
.\scripts\local\ptc-local.ps1 logs
.\scripts\local\ptc-local.ps1 smoke
.\scripts\local\ptc-local.ps1 backup
```

Ubuntu/WSL:

```bash
bash scripts/local/ptc-local.sh status
bash scripts/local/ptc-local.sh logs
bash scripts/local/ptc-local.sh smoke
bash scripts/local/ptc-local.sh backup
```

Supported commands also include start, stop, restart, guarded restore, upgrade, secret rotation, simulator/hardware-ready mode, trusted-LAN enable/disable, and uninstall with optional separately confirmed data deletion.

## Runtime modes

### Simulator

Default software/UAT mode:

- four logical cameras;
- completed, missed, incomplete, and unresolved inspections;
- online, offline, reconnecting, disabled, and degraded camera states;
- deterministic evidence fixtures;
- durable retry/replay across API outages;
- explicit synthetic source/version labels.

### Hardware-ready

The same local application stack with simulator generation disabled. Machine-authenticated event, health, camera-status, evidence, and durable-spool contracts remain active for actual adapters.

Actual camera installation is tracked in #84. Actual PTC AI model delivery and calibration are tracked in #86, with final actual-model/site acceptance in #85.

## Implemented workflows

- fixed viewer, supervisor, and administrator login;
- server-side cookie sessions and role authorization;
- operations summary and four-camera monitoring;
- camera-safe configuration without credentials or stream addresses;
- sequence-aware camera status ingestion;
- paginated, filterable, sortable inspection events;
- event detail and ordered SOP steps;
- supervisor confirm/dismiss decisions and remarks;
- optimistic concurrency and transactional audit history;
- machine-authenticated idempotent event and health ingestion;
- conflicting event-ID replay rejection;
- atomic evidence finalization with SHA-256 verification;
- authenticated snapshots and MP4 byte-range delivery;
- evidence consistency, retention, and reconciliation controls;
- realtime SSE and bounded polling fallback;
- PostgreSQL-backed CSV and PDF reporting;
- release, schema, contract, model, rules, configuration, and edge versions;
- deterministic seed/bootstrap and production reset guards;
- PostgreSQL restart, dump, checksum, and restore validation;
- local offline operation after images/dependencies are installed.

## Architecture

The PoC is local-first. The supplied workstation is the operational boundary for the current milestone.

```text
Browser
  |
Local reverse proxy (workstation-only by default)
  |-- React dashboard
  |-- Node.js API
        |-- PostgreSQL 17
        |-- protected evidence storage
        |-- realtime/reporting/review/audit services
  |
Durable Python/SQLite edge spool
  |-- simulator now
  |-- actual camera/AI adapters later
```

PostgreSQL, API, dashboard, edge spool, and evidence storage are not published directly to the host network. Only the local reverse-proxy port is exposed, bound to `127.0.0.1` by default.

## Technical stack

- **Dashboard:** React, TypeScript, Vite
- **API:** Node.js, Express, TypeScript
- **Database:** PostgreSQL 17, Prisma, committed SQL migrations
- **Edge contract:** Python standard library, SQLite WAL durable spool
- **Evidence:** protected local filesystem plus relational metadata
- **Realtime:** authenticated Server-Sent Events with polling fallback
- **Local packaging:** Docker Compose and Caddy
- **Testing:** Jest, Supertest, Vitest, Playwright, Python unittest, GitHub Actions
- **Future AI runtime:** Python, OpenCV/PyTorch training, approved optimized inference runtime

No MongoDB/Mongoose or paid cloud database is required for the local release.

## Local data and secrets

Default data locations:

- Windows: `%LOCALAPPDATA%\PTC-Bale`
- Ubuntu/WSL: `~/.ptc-bale`

They contain generated runtime configuration, PostgreSQL data, evidence, spool state, backups, and logs. None belongs in Git.

## Local certification

The release candidate must pass:

- Frontend CI;
- Backend CI and live browser tests;
- PostgreSQL recovery CI;
- OpenAPI contract CI;
- durable edge-spool CI;
- Local Runtime CI, which builds and runs the actual one-machine stack.

Target-workstation acceptance is recorded in:

- [`docs/33-local-release-manifest.md`](docs/33-local-release-manifest.md)
- [`docs/34-local-uat-record.md`](docs/34-local-uat-record.md)

Automated CI is not a substitute for executing the final UAT record on the intended workstation.

## Optional cloud alignment

Cloud deployment assets remain available for later approval. A future cloud layer may provide central access, identity, synchronized metadata/evidence, managed storage, monitoring, or backup. It must not silently replace or block the local operating scope.

## Source of truth

The awarded BOQ, approved technical proposal, confirmed PTC SOP, written clarifications, and signed change requests are authoritative. The Bangladesh reference project informs feasibility and workflow understanding but does not automatically add PTC scope or provide PTC acceptance evidence.

## Documentation

See [`docs/README.md`](docs/README.md) for the complete index.

## Security

This repository currently reports as **public** and must be changed to **private before any client-sensitive operational information is introduced**.

Never commit or attach:

- generated runtime configuration or secrets;
- database URLs, dumps, or backups;
- camera URLs, credentials, production/private IP details, or site diagrams;
- factory footage, annotations, or evidence;
- actual model binaries or restricted datasets;
- personal data.

Restricted materials remain in approved protected local/external storage and are referenced only through safe IDs, manifests, and checksums.
