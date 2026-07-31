# Local Machine Deployment and Operations

## Purpose

This is the immediate deployment path for the PTC Bale Inspection and Monitoring System. It runs the complete software stack on one workstation and does not require AWS, Vercel, Azure, public DNS, a managed database, or internet connectivity after images and dependencies are available.

This package validates the application with deterministic simulator inputs. It does not claim actual camera or AI-model performance. Actual camera and AI integration remain tracked separately.

## Supported workstation paths

### Primary

- Windows 11 Pro
- WSL2 enabled
- Docker Desktop using the WSL2 backend
- PowerShell 7 or Windows PowerShell 5.1
- At least 4 CPU cores, 8 GB free RAM, and 25 GB free disk for the software-only simulator

### Alternative

- Ubuntu 22.04 or 24.04 LTS
- Docker Engine
- Docker Compose v2
- Bash, curl, and standard GNU utilities
- At least 4 CPU cores, 8 GB free RAM, and 25 GB free disk for the software-only simulator

The final camera/AI workstation sizing is separate and depends on camera codec, resolution, frame rate, evidence retention, and selected inference model.

## Services

The local Compose project starts:

| Service | Purpose | Host exposure |
|---|---|---|
| `proxy` | Single browser origin, API proxy, SSE streaming | `127.0.0.1:8080` by default |
| `dashboard` | Approved React operations portal | Internal only |
| `api` | Node.js/Express/TypeScript API | Internal only |
| `postgres` | PostgreSQL 17 system of record | Internal only |
| `migrate` | Controlled Prisma migration step | One-shot, internal |
| `seed` | Idempotent fixed-user/bootstrap data | One-shot, internal |
| `edge-spool` | Durable SQLite simulator/adapter delivery | Internal only |
| `backup-tools` | PostgreSQL dump tooling | On-demand profile |
| `archive-tools` | Evidence-directory archive tooling | On-demand profile |

## Data locations

Bootstrap creates a protected directory outside the Git repository.

### Windows

Default:

```text
%LOCALAPPDATA%\PTC-Bale
```

### Ubuntu/WSL

Default:

```text
~/.ptc-bale
```

Layout:

```text
config/runtime.env       generated local secrets and runtime configuration
postgres/                PostgreSQL data
spool/                   durable SQLite edge queue
vidence/                 protected evidence binaries
backups/                 database dumps, evidence archives, checksums
logs/caddy/               local proxy access logs
```

The generated `runtime.env`, PostgreSQL files, evidence, spool, backups, and logs must never be copied into the Git working tree.

## Windows installation

1. Install WSL2 and Docker Desktop.
2. In Docker Desktop, enable **Use the WSL 2 based engine**.
3. Clone the repository to a normal local folder.
4. Open PowerShell in the repository root.
5. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\local\bootstrap.ps1
```

6. Open:

```text
http://localhost:8080
```

Bootstrap generates passwords and an ingestion token but does not print them. Retrieve credentials only when required from:

```text
%LOCALAPPDATA%\PTC-Bale\config\runtime.env
```

Do not paste that file into chat, email, GitHub, tickets, or screenshots.

## Ubuntu or WSL installation

1. Install Docker Engine and Docker Compose v2.
2. Confirm Docker is running:

```bash
docker info
docker compose version
```

3. From the repository root, run:

```bash
bash scripts/local/bootstrap.sh
```

4. Open:

```text
http://localhost:8080
```

Generated credentials remain in:

```text
~/.ptc-bale/config/runtime.env
```

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

`stop` preserves all data. Do not use `docker compose down --volumes` or manually remove the data directory during normal operations.

## Runtime modes

### Simulator

The default mode provides:

- four logical cameras;
- completed, missed, incomplete, and unresolved scenarios;
- camera and local-service health;
- durable queue/replay;
- deterministic protected evidence fixtures;
- no claim of actual AI inference.

Windows:

```powershell
.\scripts\local\ptc-local.ps1 mode simulator
```

Ubuntu/WSL:

```bash
bash scripts/local/ptc-local.sh mode simulator
```

### Hardware-ready

Hardware-ready mode stops simulator generation but leaves machine-authenticated event, camera-status, health, evidence, and spool contracts active.

Windows:

```powershell
.\scripts\local\ptc-local.ps1 mode hardware-ready
```

Ubuntu/WSL:

```bash
bash scripts/local/ptc-local.sh mode hardware-ready
```

Actual camera URLs, credentials, private IP details, and model paths must be supplied only through protected local configuration introduced by the hardware/AI integration work. They must not be committed.

## Backup

A local backup contains:

1. PostgreSQL custom-format dump;
2. evidence-directory archive;
3. SHA-256 checksum manifest.

Windows:

```powershell
.\scripts\local\ptc-local.ps1 backup
```

Ubuntu/WSL:

```bash
bash scripts/local/ptc-local.sh backup
```

Backups are written under the local `backups` directory. Copy them to approved protected offline storage according to the client retention policy.

A PostgreSQL dump alone does not back up evidence binaries. The evidence archive is a separate required artifact.

## Restore

Restore is destructive and automatically takes a new pre-restore backup first.

Windows:

```powershell
.\scripts\local\ptc-local.ps1 restore "C:\Path\ptc-bale-YYYYMMDDTHHMMSSZ.dump" -Confirm
```

Ubuntu/WSL:

```bash
bash scripts/local/ptc-local.sh restore /path/ptc-bale-YYYYMMDDTHHMMSSZ.dump --confirm
```

After restoration, the tooling restarts the API and edge spool and runs an authenticated smoke test.

The evidence archive is restored separately only after verifying its checksum and matching it to the restored database snapshot. Do not overwrite current evidence without a separately approved recovery action.

## Upgrade and application rollback

Before upgrade:

1. confirm the current deployment is healthy;
2. run a backup;
3. record the current commit and schema version;
4. fetch or checkout the reviewed release commit.

Then run:

```powershell
.\scripts\local\ptc-local.ps1 upgrade
```

or:

```bash
bash scripts/local/ptc-local.sh upgrade
```

The upgrade performs a backup, rebuilds immutable local images, runs forward migrations, starts the stack, and runs smoke tests.

Application images can be rebuilt from the previous reviewed commit. Database migrations are forward-only unless a specific migration has a reviewed compensation procedure. Never assume that checking out older code safely reverses a database migration.

## Secret rotation

Windows:

```powershell
.\scripts\local\ptc-local.ps1 rotate-secrets
```

Ubuntu/WSL:

```bash
bash scripts/local/ptc-local.sh rotate-secrets
```

This rotates viewer, supervisor, administrator, and machine-ingestion credentials after taking a backup. Existing sessions are expected to be revoked or invalidated through the bootstrap process.

PostgreSQL password rotation is a separate controlled maintenance operation because both the database role and runtime connection string must change atomically.

## Workstation-only and LAN access

The default binding is workstation-only:

```text
127.0.0.1:8080
```

Do not expose the application to a LAN until workstation UAT passes.

### Enable trusted LAN mode

Windows:

```powershell
.\scripts\local\ptc-local.ps1 lan-enable 192.168.1.50
```

Ubuntu/WSL:

```bash
bash scripts/local/ptc-local.sh lan-enable 192.168.1.50
```

Replace the address with the workstation's actual private IP. Then create a firewall rule limited to the trusted subnet or approved devices.

Windows Firewall example, run as Administrator and adjust the subnet:

```powershell
New-NetFirewallRule -DisplayName "PTC Bale Local Portal" -Direction Inbound -Protocol TCP -LocalPort 8080 -RemoteAddress 192.168.1.0/24 -Action Allow
```

Ubuntu UFW example:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 8080 proto tcp
```

Disable LAN mode after testing:

```powershell
.\scripts\local\ptc-local.ps1 lan-disable
```

or:

```bash
bash scripts/local/ptc-local.sh lan-disable
```

Remove the firewall rule when LAN access is no longer approved.

## Reboot recovery

Docker Desktop or Docker Engine must start after workstation reboot. All long-running services use `restart: unless-stopped` and durable host storage.

After reboot:

```powershell
.\scripts\local\ptc-local.ps1 start
.\scripts\local\ptc-local.ps1 smoke
```

or:

```bash
bash scripts/local/ptc-local.sh start
bash scripts/local/ptc-local.sh smoke
```

Do not configure unattended Windows login. Where automatic service startup is required, use an approved locked-down service account and an operations-reviewed startup task.

## Troubleshooting

### Docker unavailable

- Start Docker Desktop or Docker Engine.
- Confirm `docker info` succeeds.
- Confirm Docker Compose v2 is installed.

### Port 8080 already in use

Set a different `LOCAL_HTTP_PORT` in the protected runtime file, and update `ALLOWED_ORIGINS` to the matching local URLs before recreating API and proxy.

### API not ready

```powershell
.\scripts\local\ptc-local.ps1 logs api
```

or:

```bash
bash scripts/local/ptc-local.sh logs api
```

Check PostgreSQL health, migration completion, seed completion, evidence directory permissions, and runtime configuration.

### Edge queue pending

Inspect:

```bash
docker compose --env-file <runtime.env> --project-directory infrastructure/local -f infrastructure/local/docker-compose.local.yml exec edge-spool python /app/ptc_edge_spool.py --database /var/lib/ptc-bale/spool/spool.sqlite3 status
```

Pending rows during an API/database outage are expected. They should deliver after recovery. Rejected rows require review; do not purge them without an approved procedure.

### Evidence unavailable

- Confirm the evidence directory exists and has free disk space.
- Review System Health and evidence consistency diagnostics.
- Do not manually rename or remove files while the application is running.
- Use administrator reconciliation in dry-run mode before any repair action.

### Low disk

Stop simulator generation, take a protected backup, confirm retention approval, and use the application retention/reconciliation controls. Do not delete PostgreSQL or evidence files directly.

## Uninstall

Remove containers but preserve data:

```powershell
.\scripts\local\ptc-local.ps1 uninstall
```

or:

```bash
bash scripts/local/ptc-local.sh uninstall
```

Delete local data only with explicit confirmation:

```powershell
.\scripts\local\ptc-local.ps1 uninstall -DeleteData -Confirm
```

or:

```bash
bash scripts/local/ptc-local.sh uninstall --delete-data --confirm
```

Take and verify a final backup before deleting data.

## Security rules

- Change repository visibility to private before introducing client-sensitive details.
- Never commit generated runtime files, passwords, tokens, camera URLs, private IP plans, factory footage, evidence, database dumps, or model binaries.
- Keep PostgreSQL and internal services unexposed.
- Start in workstation-only mode.
- Give each operator the minimum role required.
- Store backups on approved protected media.
- Review logs before sharing them; do not share the runtime environment.
- Simulator records must remain clearly identified as synthetic.

## Go-live boundary

The software-only local deployment is ready for simulator UAT when the `Local Runtime CI` workflow is green and the target workstation passes `docs/34-local-uat-record.md`.

Actual operational go-live additionally requires:

- approved camera installation and access;
- actual AI model integration and calibration;
- approved PTC SOP and acceptance scenarios;
- workstation hardening and physical access control;
- evidence retention and backup ownership;
- PM/client acceptance.
