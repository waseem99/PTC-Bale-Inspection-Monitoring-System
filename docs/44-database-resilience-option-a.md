# Database Resilience — Option A Execution and Acceptance

Status: execution package for #148 / #149.  
Related acceptance: #144 (separate DB), #147 (backup/recovery).

## Scope decision

Option A is the current project closure baseline:

- separate PostgreSQL endpoint;
- off-host backup;
- SHA-256 verification;
- isolated/non-production restore;
- application smoke against restored data;
- documented manual recovery/switchover.

Standby replication, automatic failover, Patroni/repmgr, active-active and cross-site DR are not required for current closure.

## Security rules

- Never paste `DATABASE_URL`, `RESTORE_DATABASE_URL`, DB passwords, private IPs or access keys into GitHub.
- Use protected runtime configuration only.
- `RESTORE_DATABASE_URL` must point to a disposable/non-production database.
- The restore verifier refuses to run when the restore URL equals the active `DATABASE_URL`.
- Record only sanitized endpoint class/name, timestamps, release SHA, backup object basename and checksum hash.

## Phase 1 — repository preparation

The repository supplies:

- `infrastructure/aws/scripts/db-resilience-preflight.sh`
- `infrastructure/aws/scripts/backup-postgres-remote.sh`
- `infrastructure/aws/scripts/verify-postgres-restore.sh`

The existing staging backup/restore scripts remain unchanged.

## Phase 2A — separate PostgreSQL validation

Owner: Qamar. Application validation: Zubair.

1. Provision or identify a non-production PostgreSQL endpoint on a separate VM/host/network boundary.
2. Set the protected runtime `DATABASE_URL` for the API deployment. Do not commit it.
3. Run the preflight from the deployed release directory:

```bash
bash infrastructure/aws/scripts/db-resilience-preflight.sh
```

Expected result:

```text
PASS: remote PostgreSQL connectivity preflight succeeded.
```

4. Apply/verify migrations using the normal deployment procedure.
5. Start the API against the remote DB.
6. Verify `/readyz` reports DB connected.
7. Temporarily deny DB connectivity in the test environment and confirm `/readyz` reports the dependency unavailable; restore connectivity immediately afterwards.
8. Validate:
   - Viewer/Supervisor/Admin login and session persistence;
   - one AI event ingestion;
   - event detail/review workflow;
   - audit record creation;
   - CSV/PDF reporting;
   - evidence metadata/reference access;
   - no DB URL or credential appears in browser traffic, API responses or normal application logs.

Record the sanitized result in #144.

## Phase 2B — off-host backup

With the remote `DATABASE_URL` active and `ARTIFACT_BUCKET` / `AWS_REGION` configured:

```bash
bash infrastructure/aws/scripts/backup-postgres-remote.sh option-a
```

Expected result:

```text
PASS: remote PostgreSQL backup created, structurally verified, checksummed and uploaded.
```

Capture only:

- UTC timestamp;
- deployed commit SHA;
- backup object basename;
- checksum object basename;
- SHA-256 hash;
- destination class, e.g. `approved S3 backup bucket` (not credentials).

## Phase 2C — isolated restore

1. Create an empty/disposable PostgreSQL database that is not the active DB.
2. Export its connection string only in the protected shell/session:

```bash
export RESTORE_DATABASE_URL='postgresql://...'
export CONFIRM_DISPOSABLE_RESTORE=YES
```

3. Restore the approved backup:

```bash
bash infrastructure/aws/scripts/verify-postgres-restore.sh \
  's3://<approved-bucket>/backups/<backup-file>.dump'
```

Expected result:

```text
PASS: isolated PostgreSQL restore completed and Prisma migration history is present.
```

4. Point a non-production API instance at the restored database.
5. Verify `/readyz`.
6. Verify at least one known event exists and is readable.
7. Verify its review/audit trail is readable.
8. Verify evidence metadata/reference still reconciles to the evidence store.
9. Verify a report can be generated from restored metadata.

Record the sanitized restore evidence in #147.

## Manual recovery/switchover runbook

If the production primary DB becomes unavailable:

1. confirm the DB outage and application impact;
2. stop/restrict writes if partial connectivity creates uncertainty;
3. select the latest approved backup with verified checksum;
4. provision/identify the replacement PostgreSQL endpoint;
5. restore the backup to that endpoint using the controlled restore procedure;
6. verify migration history/status;
7. update protected `DATABASE_URL` or the approved DB DNS endpoint;
8. restart/redeploy the API;
9. run `/readyz` and deployment smoke checks;
10. verify login, one known event, audit/review, evidence metadata and report access;
11. record incident/recovery evidence and the recovery point used.

No application code change or custom failover controller is required for this procedure.

## Sanitized evidence template

Post this structure to #144 / #147 without secrets:

```text
Option A DB resilience execution
Date/time (UTC):
Release commit:
Environment class: non-production / production-approved maintenance
Primary DB boundary: separate host / managed PostgreSQL / isolated network service
Preflight: PASS|FAIL
Migrations: PASS|FAIL
/readyz connected check: PASS|FAIL
/readyz disconnected check: PASS|FAIL
Login/session: PASS|FAIL
Event ingestion: PASS|FAIL
Review/audit: PASS|FAIL
Reporting: PASS|FAIL
Evidence metadata reconciliation: PASS|FAIL
Backup object basename:
Backup SHA-256:
Backup off-host destination class:
Isolated restore: PASS|FAIL
Restored API smoke: PASS|FAIL
Credential/URL leakage check: PASS|FAIL
Notes/dependencies:
```

## Closure rule

#148 can close under Option A when #144 and #147 contain passing sanitized evidence and the manual recovery procedure has been reviewed. Lack of a standby replica does not block closure under the approved Option A decision.
