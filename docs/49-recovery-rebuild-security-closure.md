# Recovery / Rebuild Runbook and Final Security Closure Matrix

Status: software recovery/closure artifact for #147.  
Related: #142, #144, #148, #84, #85, #86.

This document closes the application-owned recovery/security evidence without turning the PoC into an enterprise HA/DR programme. It does **not** claim that PTC production infrastructure has been provisioned or accepted.

## 1. Automated recovery proof

The repository includes:

- workflow: `.github/workflows/backup-recovery-certification.yml`;
- harness: `scripts/security/certify-backup-recovery.sh`.

The certification uses a fully disposable topology:

`Primary PostgreSQL -> pg_dump + SHA-256 -> second PostgreSQL restore target -> API runtime`

Evidence storage is backed up independently:

`Primary evidence path -> tar archive + SHA-256 -> independent restore path -> API evidence read`

Both PostgreSQL containers have no host-published DB port. The restore target is a second service and the primary database is never overwritten.

The automated gate verifies:

- Prisma migration history exists on the restored DB;
- PostgreSQL custom-format backup is structurally readable;
- database backup SHA-256 verifies before restore;
- evidence archive SHA-256 verifies before restore;
- one known event survives the restore;
- its review/audit record survives the restore;
- its evidence metadata/reference survives the restore;
- the evidence binary independently restores and matches its original checksum;
- the API reaches `ready` when pointed at the restored database;
- local session/login succeeds against the restored database;
- the known event is readable through the API;
- report generation works against restored metadata;
- evidence content is readable through the restored API/evidence path;
- retained certification output contains no DB password, connection string, ingestion token or login password.

A passing run is **automated software recovery evidence**. It is not a claim that a PTC production DB/server/storage target has been exercised.

## 2. Production/manual database recovery procedure

If the approved production PostgreSQL endpoint becomes unavailable:

1. Confirm the database outage using `/readyz`, database monitoring and infrastructure checks.
2. Stop or restrict application writes if partial connectivity makes data consistency uncertain.
3. Select the latest approved PostgreSQL backup whose SHA-256 checksum is available and verified.
4. Provision or identify the replacement/disposable PostgreSQL endpoint under PTC infrastructure control.
5. Restore the verified backup to that endpoint; do not restore destructively over an active/uncertain primary.
6. Verify Prisma migration history/status.
7. Reconnect the approved evidence storage/archive and verify the evidence checksum/reference for a known event.
8. Update the protected `DATABASE_URL` or approved DB DNS/service endpoint.
9. Start/redeploy Platform API and dependent services.
10. Verify `/readyz` reports `ready / database connected`.
11. Verify:
    - Viewer/Supervisor/Admin access as applicable;
    - one known event;
    - review/audit trail;
    - evidence metadata and content;
    - CSV/PDF/report access;
    - security/event logs.
12. Record the recovery point, backup checksum identity, release SHA, outcome and any accepted data-loss window in the operational record.

No custom failover controller or application code change is required for this procedure.

## 3. AI/application workstation rebuild procedure

Minimum rebuild sequence for replacement of the AI/application workstation:

1. Provision the approved supported host/runtime.
2. Apply OS/endpoint hardening supplied under PTC infrastructure policy.
3. Restore protected runtime configuration from the approved secret/config source; never recover credentials from Git/GitHub comments.
4. Restore or reconnect the approved AI model package, model checksum, rules/config version and ROI/camera configuration release references.
5. Configure the approved camera endpoints/credentials outside browser/frontend configuration.
6. Configure `DATABASE_URL` to the approved separate PostgreSQL endpoint.
7. Reconnect the approved evidence storage/mount and validate read/write access.
8. Deploy/start edge/runtime, Platform API and dashboard/proxy services.
9. Verify release identity (`BUILD_VERSION`, `BUILD_COMMIT`, schema/config/model references).
10. Run health/readiness checks.
11. Run acceptance smoke:
    - local login/session;
    - camera/service health;
    - one known event or controlled ingestion;
    - review/audit;
    - evidence access;
    - report/export.
12. Resume normal operation only after the smoke is accepted.

For current project closure, this is a **rebuild/recovery procedure**, not an active-active or hot-standby architecture.

## 4. Final finite security closure matrix

### A. Implemented / software-ready by Codistan

| Control | Closure position |
| --- | --- |
| Local authentication / RBAC | Implemented for Viewer, Supervisor and Admin roles. |
| Secure sessions | Implemented with server-side session handling, expiry/revocation/logout controls. |
| Structured security-event logging | Implemented; SIEM-ready output can be collected by PTC. |
| Application audit trail | Implemented for controlled review/actions. |
| Externalized production configuration | Implemented; production secrets/hosts are supplied at deployment time. |
| Separate PostgreSQL compatibility | CI-certified against a non-loopback isolated PostgreSQL service boundary. |
| Database readiness | Connected/disconnected/recovered behavior is tested. |
| Evidence separation | Metadata/reference in PostgreSQL; binary evidence on externalized `EVIDENCE_ROOT`. |
| Network / credential application boundary | Hardened; DB and real RTSP credentials are not browser build inputs. |
| Simulator production guard | Implemented/fail-closed for production. |
| Enterprise identity readiness | OIDC/Entra-compatible seam implemented; activation pending PTC IAM configuration. |
| PostgreSQL backup tooling | Implemented with checksum verification. |
| Non-destructive restore verification | Automated against a second disposable PostgreSQL target. |
| Restored-DB application smoke | Automated API/readiness/session/event/report/evidence proof. |
| Evidence archive/checksum recovery proof | Automated against an independent restore path. |
| Recovery/rebuild runbook | Recorded in this document. |

### B. PTC infrastructure / deployment responsibility

| Control | Closure position |
| --- | --- |
| Production firewall rules / ACLs | PTC infrastructure control; Codistan defines required flows. |
| Camera VLAN / network segmentation | PTC/site implementation; verify under #84. |
| Camera firmware and RTSPS/TLS capability | PTC/site/hardware capability; verify under #84. |
| Endpoint protection / EDR | PTC enterprise endpoint control. |
| SIEM collector/platform | PTC enterprise monitoring; Codistan emits structured security logs. |
| Entra tenant / app registration | PTC IAM input. |
| MFA / Conditional Access policy | PTC IAM policy; not custom application MFA. |
| Production PostgreSQL host/service | PTC deployment infrastructure. |
| Production backup destination / retention | PTC infrastructure/policy input. |
| Production isolated restore exercise | Remaining real-environment evidence under #148. |
| DB replica, if PTC later requires one | PTC infrastructure / separately approved requirement. |
| Enterprise vulnerability management | PTC security operations/platform. |

### C. Optional / future change request — not current project closure blockers

- standby AI/GPU server;
- automated PostgreSQL HA/failover;
- Patroni/repmgr or leader-election platform;
- active-active/multi-primary database design;
- cross-site DR orchestration;
- custom PAM/PKI platform;
- custom MFA/OTP system;
- new SIEM/EDR/firewall product implementation;
- 24x7 managed DBA/security operations.

## 5. Acceptance integration

### #84 — site / camera / ROI gate

Verify physical/site inputs only:

- Camera 01–04 mapping and firmware/model;
- RTSPS/TLS capability where supported;
- unique credentials;
- camera VLAN/firewall/ACLs;
- AI workstation/site network placement;
- PTC endpoint/security-platform status;
- real ROIs and data capture.

A missing PTC infrastructure control is recorded as `PTC action / accepted production dependency`; it does not reopen completed application hardening.

### #85 — integrated AI UAT

Add the following software-security/recovery confirmations to the existing AI UAT:

- approved DB endpoint connected;
- RBAC/session behavior;
- structured security logging;
- no credential leakage;
- evidence access;
- restart/recovery behavior;
- backup/recovery evidence reference from #147;
- PTC-owned controls recorded as verified/pending/accepted dependency.

#85 remains an AI/application UAT, not an enterprise security-platform implementation project.

### #86 — final acceptance

Final security items must be classified into exactly one of:

1. **Implemented by Codistan**;
2. **Verified PTC infrastructure**;
3. **Accepted production dependency / limitation**;
4. **Future change request**.

Once the application/AI acceptance is complete and this classification is accepted, enterprise infrastructure recommendations must not remain as undefined software defects.

## 6. #147 / #148 closure boundary

After the automated recovery workflow is green, #147 can be closed as **software recovery/security closure evidence complete**.

The only remaining Option A database evidence is the real PTC/developer environment execution under #148:

- real approved PostgreSQL endpoint;
- real approved backup destination;
- real disposable/non-production restore target;
- sanitized restore/application smoke evidence.

That environment proof does not require new application code unless it exposes a concrete software defect.

## 7. Explicit non-claims

This document and the CI gate do **not** claim:

- a PTC production PostgreSQL VM/server is deployed;
- a production backup bucket/appliance/retention policy is configured;
- a PTC firewall/VLAN has been implemented;
- production Entra/MFA/SIEM/EDR has been activated;
- automatic DB failover or AI redundancy exists.

Those statements remain deployment/infrastructure decisions and must be recorded accurately during #84/#85/#86/#148 acceptance.
