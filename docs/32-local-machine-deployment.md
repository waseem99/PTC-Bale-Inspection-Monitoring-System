# Local Machine Deployment and Operations

## Purpose

This is the approved immediate deployment path for the PTC Bale Inspection and Monitoring System. It runs the complete software stack on one workstation and does not require AWS, Vercel, Azure, public DNS, a managed database, or internet connectivity after images and dependencies are installed.

The package validates application behavior with deterministic simulator inputs. It does **not** claim actual camera or AI-model performance.

## Supported workstation paths

### Primary

- Windows 11 Pro
- WSL2 enabled
- Docker Desktop using the WSL2 backend
- PowerShell 7 or Windows PowerShell 5.1
- At least 4 CPU cores, 8 GB free RAM, and 25 GB free disk for software-only simulator testing

### Alternative

- Ubuntu 22.04 or 24.04 LTS
- Docker Engine and Docker Compose v2
- Bash, curl, and standard GNU utilities
- At least 4 CPU cores, 8 GB free RAM, and 25 GB free disk for software-only simulator testing

Final camera/AI workstation sizing depends on codec, resolution, frame rate, evidence retention, and the selected inference model.

## Local services

| Service | Purpose | Host exposure |
|---|---|---|
| `proxy` | Single browser origin, API proxy, SSE streaming | `127.0.0.1:8080` by default |
| `dashboard` | Approved React operations portal | Internal only |
| `api` | Node.js/Express/TypeScript API | Internal only |
| `postgres` | PostgreSQL 17 system of record | Internal only |
| `migrate` | Controlled Prisma migration step | One-shot, internal |
| `seed` | Idempotent fixed-user/bootstrap data | One-shot, internal |
| `edge-spool` | Durable SQLite simulator/adapter delivery | Internal only |
| `backup-tools` | PostgreSQL dump tooling | On-demand tools profile |
| `archive-tools` | Evidence archive tooling | On-demand tools profile |

## Protected local data

Bootstrap creates the runtime data outside the Git repository.

- Windows: `%LOCALAPPDATA%\PTC-Bale`
- Ubuntu/WSL: `~/.ptc-bale`

```text
config/runtime.env       generated local secrets and runtime configuration
postgres/                PostgreSQL data
evidence/                protected evidence binaries
spool/                   durable SQLite edge queue
backups/                 database dumps, evidence archives, checksums
logs/caddy/              local proxy access logs
```

None of these files belongs in Git, email, chat, screenshots, or issue attachments.

## Installation

### Windows 11

1. Install WSL2 and Docker Desktop.
2. Enable **Use the WSL 2 based engine** in Docker Desktop.
3. Clone the repository into a normal local folder.
4. Open PowerShell in the repository root.
5. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\local\bootstrap.ps1
```

6. Open `http://localhost:8080`.

Generated credentials remain only in:

```text
%LOCALAPPDATA%\PTC-Bale\config\runtime.env
```

### Ubuntu or WSL

```bash
docker info
docker compose version
bash scripts/local/bootstrap.sh
```

Then open `http://localhost:8080`.

Generated credentials remain only in `~/.ptc-bale/config/runtime.env`.

Bootstrap generates strong credentials but does not print them.

## Daily operations

### Windows

```powershell
.\scripts\local\ptc-local.ps1 start
.\scripts\local\ptc-local.ps1 status
.\scripts\local\ptc-local.ps1 logs
.\scripts\local\ptc-local.ps1 smoke
.\scripts\local\ptc-local.ps1 stop
```

### Ubuntu/WSL

```bash
bash scripts/local/ptc-local.sh start
bash scripts/local/ptc-local.sh status
bash scripts/local/ptc-local.sh logs
bash scripts/local/ptc-local.sh smoke
bash scripts/local/ptc-local.sh stop
```

`stop` preserves data. Never use `docker compose down --volumes` during normal operations.

## Runtime modes

### Simulator

Default software/UAT mode:

```powershell
.\scripts\local\ptc-local.ps1 mode simulator
```

```bash
bash scripts/local/ptc-local.sh mode simulator
```

It provides four logical cameras, deterministic process outcomes, health states, protected evidence fixtures, and durable replay. Simulator results are not actual AI evidence.

### Hardware-ready

```powershell
.\scripts\local\ptc-local.ps1 mode hardware-ready
```

```bash
bash scripts/local/ptc-local.sh mode hardware-ready
```

Hardware-ready mode stops simulator generation while keeping machine-authenticated event, camera-status, health, evidence, and spool contracts active. Camera URLs, credentials, private IP details, and model paths must be supplied only through protected local configuration.

## Backup

A complete local backup consists of:

1. PostgreSQL custom-format dump;
2. separate evidence archive;
3. SHA-256 checksum manifest.

```powershell
.\scripts\local\ptc-local.ps1 backup
```

```bash
bash scripts/local/ptc-local.sh backup
```

Backups are written under the protected `backups` directory. A database dump alone does not back up evidence binaries.

## Guarded restore

Restore is destructive and automatically creates a new pre-restore backup.

```powershell
.\scripts\local\ptc-local.ps1 restore "C:\Path\ptc-bale-YYYYMMDDTHHMMSSZ.dump" -Confirm
```

```bash
bash scripts/local/ptc-local.sh restore /path/ptc-bale-YYYYMMDDTHHMMSSZ.dump --confirm
```

The evidence archive is restored separately only after checksum verification and database/evidence snapshot matching. Do not overwrite current evidence without an approved recovery action.

## Upgrade and rollback

Before upgrading:

1. confirm the deployment is healthy;
2. run a backup;
3. record the current commit and schema version;
4. checkout the reviewed release commit.

```powershell
.\scripts\local\ptc-local.ps1 upgrade
```

```bash
bash scripts/local/ptc-local.sh upgrade
```

The upgrade rebuilds images, applies forward migrations, starts the stack, and runs authenticated smoke tests. Checking out older application code does not automatically reverse database migrations; use only a reviewed compensation procedure.

## Secret rotation

```powershell
.\scripts\local\ptc-local.ps1 rotate-secrets
```

```bash
bash scripts/local/ptc-local.sh rotate-secrets
```

This rotates viewer, supervisor, administrator, and machine-ingestion credentials, updates existing fixed users, and revokes existing fixed-user sessions. PostgreSQL password rotation remains a separate controlled maintenance operation.

## Workstation-only and trusted-LAN modes

Default binding:

```text
127.0.0.1:8080
```

Do not enable LAN mode until workstation UAT passes and firewall approval is recorded.

```powershell
.\scripts\local\ptc-local.ps1 lan-enable 192.168.1.50
```

```bash
bash scripts/local/ptc-local.sh lan-enable 192.168.1.50
```

Restrict the host firewall to the approved subnet or devices. Disable LAN mode after testing:

```powershell
.\scripts\local\ptc-local.ps1 lan-disable
```

```bash
bash scripts/local/ptc-local.sh lan-disable
```

Remove any temporary firewall rule when LAN access is no longer approved.

## Reboot recovery

Docker Desktop or Docker Engine must start after workstation reboot. Long-running services use durable host storage and `restart: unless-stopped`.

After reboot:

```powershell
.\scripts\local\ptc-local.ps1 start
.\scripts\local\ptc-local.ps1 smoke
```

```bash
bash scripts/local/ptc-local.sh start
bash scripts/local/ptc-local.sh smoke
```

Do not configure unattended Windows login. Use an approved locked-down service account and reviewed startup task where automatic service startup is required.

## Troubleshooting

### Docker unavailable

Start Docker Desktop or Docker Engine, then verify `docker info` and `docker compose version`.

### Port 8080 in use

Set another `LOCAL_HTTP_PORT` in the protected runtime file and update `ALLOWED_ORIGINS` to matching local URLs before recreating API and proxy.

### API not ready

```powershell
.\scripts\local\ptc-local.ps1 logs api
```

```bash
bash scripts/local/ptc-local.sh logs api
```

Check PostgreSQL health, migration and seed completion, evidence-directory permissions, and runtime configuration.

### Edge queue pending

Pending records during an API/database outage are expected and should deliver after recovery. Rejected rows require review; never purge them without an approved procedure.

### Evidence unavailable or low disk

- Confirm the evidence directory exists and has free disk space.
- Review System Health and evidence consistency diagnostics.
- Do not manually rename or remove files while the application is running.
- Stop simulator generation, take a protected backup, and use approved retention/reconciliation controls.

## Uninstall

Remove containers and preserve data:

```powershell
.\scripts\local\ptc-local.ps1 uninstall
```

```bash
bash scripts/local/ptc-local.sh uninstall
```

Delete local data only after a verified final backup and explicit confirmation:

```powershell
.\scripts\local\ptc-local.ps1 uninstall -DeleteData -Confirm
```

```bash
bash scripts/local/ptc-local.sh uninstall --delete-data --confirm
```

## Security rules

- Make the repository private before introducing client-sensitive details.
- Never commit runtime files, passwords, tokens, camera URLs, private IP plans, factory footage, annotations, evidence, database dumps, or model binaries.
- Keep PostgreSQL and internal services unexposed.
- Start in workstation-only mode.
- Give each operator the minimum role required.
- Store backups only on approved protected media.
- Review logs before sharing them.
- Keep simulator records clearly identified as synthetic.

## Acceptance boundary

The software-only local deployment is ready for simulator UAT when Local Runtime CI is green and the target workstation passes `docs/34-local-uat-record.md`.

Actual operational acceptance additionally requires the technical AI/site work and PM/client acceptance controlled by `docs/35-pm-ai-project-closure-runbook.md`.
