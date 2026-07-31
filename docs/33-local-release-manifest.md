# Local Release Manifest

Complete this document for each simulator-UAT or hardware-ready local release. Do not include passwords, tokens, database URLs, private camera addresses, factory media, evidence binaries, database dumps, or model files.

## Release identity

| Field | Value |
|---|---|
| Release name | `PTC-Bale-Local-________` |
| Release date/time (UTC) | `________` |
| Git tag | `________` |
| Git commit | `________` |
| Source PR(s) | `________` |
| Runtime mode | `simulator` / `hardware-ready` |
| PM acceptance issue | `#102` |

## Workstation

| Field | Value |
|---|---|
| Operating system/version | `________` |
| CPU | `________` |
| RAM | `________` |
| GPU/driver, when applicable | `________` |
| Available application disk | `________` |
| Docker version | `________` |
| Docker Compose version | `________` |
| Workstation asset/owner | `________` |

## Runtime versions

| Component | Version/image/commit |
|---|---|
| Dashboard image | `ptc-bale-dashboard:________` |
| API image | `ptc-bale-api:________` |
| Tools image | `ptc-bale-tools:________` |
| Edge spool image | `ptc-bale-edge:________` |
| PostgreSQL | `17.x` |
| Caddy | `2.10.2` |
| Prisma schema/migration | `________` |
| Platform OpenAPI contract | `________` |
| Camera OpenAPI contract | `camera-contract-v1` |
| Edge spool contract | `edge-spool-v2` |
| SOP/rule version | `________` |
| AI/model version | `simulator-v1` or approved actual version |
| Camera configuration version | `________` |

## Local endpoints

| Purpose | Value |
|---|---|
| Workstation URL | `http://localhost:________` |
| Approved LAN URL, if any | `________` |
| Host binding | `127.0.0.1` / `0.0.0.0` |
| Firewall rule reference | `________` |

## Protected storage

Record paths only. Do not attach content.

| Store | Path | Owner | Backup responsibility |
|---|---|---|---|
| Runtime configuration | `________` | `________` | Not copied to GitHub |
| PostgreSQL data | `________` | `________` | `________` |
| Evidence | `________` | `________` | `________` |
| Edge spool | `________` | `________` | Configuration only after acknowledgement |
| Backups | `________` | `________` | `________` |
| Proxy logs | `________` | `________` | `________` |

## Migration and bootstrap

| Check | Result | Evidence reference |
|---|---|---|
| Clean Compose validation | Pass / Fail | `________` |
| PostgreSQL healthy | Pass / Fail | `________` |
| Prisma migrations applied | Pass / Fail | `________` |
| Fixed users bootstrapped | Pass / Fail | `________` |
| API ready | Pass / Fail | `________` |
| Dashboard ready | Pass / Fail | `________` |
| Proxy ready | Pass / Fail | `________` |
| Edge spool ready | Pass / Fail | `________` |
| Generated secrets kept outside Git | Pass / Fail | `________` |

## Acceptance evidence

| Gate | Workflow/run or local record | Result |
|---|---|---|
| Frontend CI | `________` | Pass / Fail |
| Backend CI | `________` | Pass / Fail |
| Backend Recovery CI | `________` | Pass / Fail |
| Contracts CI | `________` | Pass / Fail |
| Edge Simulator CI | `________` | Pass / Fail |
| Local Runtime CI | `________` | Pass / Fail |
| Target workstation UAT | `docs/34-local-uat-record.md` | Pass / Fail |

## Backup and recovery evidence

| Check | Result | Reference |
|---|---|---|
| PostgreSQL custom dump created | Pass / Fail | `________` |
| Evidence archive created | Pass / Fail | `________` |
| SHA-256 manifest verified | Pass / Fail | `________` |
| API restart persistence | Pass / Fail | `________` |
| PostgreSQL restart persistence | Pass / Fail | `________` |
| Guarded restore completed | Pass / Fail | `________` |
| Restored representative records reconciled | Pass / Fail | `________` |

## Known limitations and deferred work

- Actual camera installation/integration: `#84`
- Actual PTC AI model delivery/calibration: `#86`
- Actual model/site acceptance: `#85`
- Cloud deployment: deferred under `#71`
- Other accepted limitation: `________`

## Sign-off

| Role | Name | Decision | Date |
|---|---|---|---|
| Technical owner | `________` | Accept / Reject | `________` |
| DevOps/release owner | `________` | Accept / Reject | `________` |
| PM/UAT owner | `________` | Accept / Reject | `________` |
| Client representative, when required | `________` | Accept / Reject | `________` |
