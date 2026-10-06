#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RUN_SUFFIX="${GITHUB_RUN_ID:-local}"
NETWORK_NAME="ptc-recovery-cert-${RUN_SUFFIX}"
PRIMARY_DB="ptc-recovery-primary-${RUN_SUFFIX}"
RESTORE_DB="ptc-recovery-restore-${RUN_SUFFIX}"
RESTORE_API="ptc-recovery-api-${RUN_SUFFIX}"
DB_NAME="ptc_recovery"
DB_USER="ptc_recovery"
DB_PASSWORD="PTC_RECOVERY_CERT_CANARY_2026"
PRIMARY_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${PRIMARY_DB}:5432/${DB_NAME}?schema=public"
RESTORE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${RESTORE_DB}:5432/${DB_NAME}?schema=public"
SEED_VIEWER_PASSWORD="Viewer-Recovery-2026!"
SEED_SUPERVISOR_PASSWORD="Supervisor-Recovery-2026!"
SEED_ADMIN_PASSWORD="Admin-Recovery-2026!"
INGESTION_SERVICE_TOKEN="PTC-RECOVERY-INGESTION-TOKEN-2026"
EVENT_ID="CERT-RECOVERY-001"
EVIDENCE_ID="EVD-CERT-RECOVERY-001"
STORAGE_KEY="cert/restored-evidence.png"
ARTIFACT_DIR="${CERT_ARTIFACT_DIR:-$ROOT_DIR/.certification/backup-recovery}"
PRIMARY_EVIDENCE_DIR="${CERT_PRIMARY_EVIDENCE_DIR:-$ROOT_DIR/.certification/recovery-primary-evidence}"
RESTORE_EVIDENCE_DIR="${CERT_RESTORE_EVIDENCE_DIR:-$ROOT_DIR/.certification/recovery-restored-evidence}"
BACKUP_FILE="$ARTIFACT_DIR/postgres-primary.dump"
BACKUP_SHA_FILE="$ARTIFACT_DIR/postgres-primary.dump.sha256"
EVIDENCE_ARCHIVE="$ARTIFACT_DIR/evidence-primary.tar.gz"
EVIDENCE_SHA_FILE="$ARTIFACT_DIR/evidence-primary.tar.gz.sha256"
COOKIE_JAR="$ARTIFACT_DIR/cookies.txt"
CHECKS_FILE="$ARTIFACT_DIR/post-restore-checks.txt"

mkdir -p "$ARTIFACT_DIR" "$PRIMARY_EVIDENCE_DIR" "$RESTORE_EVIDENCE_DIR"
chmod 0777 "$PRIMARY_EVIDENCE_DIR" "$RESTORE_EVIDENCE_DIR"
rm -rf "$PRIMARY_EVIDENCE_DIR"/* "$RESTORE_EVIDENCE_DIR"/*
rm -f "$ARTIFACT_DIR"/* 2>/dev/null || true

cleanup() {
  docker rm -f "$RESTORE_API" "$RESTORE_DB" "$PRIMARY_DB" >/dev/null 2>&1 || true
  docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail_check() {
  printf 'FAIL: %s\n' "$1" | tee -a "$CHECKS_FILE" >&2
  exit 1
}

for command_name in docker curl jq sha256sum grep cmp tar; do
  command -v "$command_name" >/dev/null 2>&1 || fail_check "missing required command: $command_name"
done

[[ "$PRIMARY_URL" != "$RESTORE_URL" ]] || fail_check "primary and restore database URLs must differ"

docker network create "$NETWORK_NAME" >/dev/null

start_postgres() {
  local name="$1"
  docker run -d \
    --name "$name" \
    --network "$NETWORK_NAME" \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    postgres:16-alpine >/dev/null

  [[ -z "$(docker port "$name" 2>/dev/null)" ]] || fail_check "PostgreSQL $name unexpectedly publishes a host port"

  # The official image starts a temporary init server, shuts it down, then starts
  # the final server. Do not mistake the temporary server for final readiness.
  for _ in $(seq 1 120); do
    if docker logs "$name" 2>&1 | grep -q 'PostgreSQL init process complete; ready for start up.' \
      && docker exec "$name" psql -U "$DB_USER" -d "$DB_NAME" -Atc 'select 1;' 2>/dev/null | grep -qx '1'; then
      sleep 2
      if docker exec "$name" psql -U "$DB_USER" -d "$DB_NAME" -Atc 'select 1;' 2>/dev/null | grep -qx '1'; then
        return 0
      fi
    fi
    sleep 1
  done

  docker logs "$name" >&2 || true
  fail_check "PostgreSQL $name did not reach final readiness"
}

start_postgres "$PRIMARY_DB"

echo "Building API certification images..."
docker build --target build -t ptc-recovery-api-build -f apps/platform-api/Dockerfile . >/dev/null
docker build --target runtime -t ptc-recovery-api-runtime -f apps/platform-api/Dockerfile . >/dev/null

COMMON_SEED_ENV=(
  -e "DATABASE_URL=$PRIMARY_URL"
  -e NODE_ENV=test
  -e "SEED_VIEWER_PASSWORD=$SEED_VIEWER_PASSWORD"
  -e "SEED_SUPERVISOR_PASSWORD=$SEED_SUPERVISOR_PASSWORD"
  -e "SEED_ADMIN_PASSWORD=$SEED_ADMIN_PASSWORD"
)

docker run --rm --network "$NETWORK_NAME" "${COMMON_SEED_ENV[@]}" \
  ptc-recovery-api-build pnpm --filter @ptc-bale/platform-api db:migrate:deploy > "$ARTIFACT_DIR/primary-migrations.log"

docker run --rm --network "$NETWORK_NAME" "${COMMON_SEED_ENV[@]}" \
  ptc-recovery-api-build pnpm --filter @ptc-bale/platform-api seed:reset > "$ARTIFACT_DIR/primary-seed.log"

SUPERVISOR_ID="$(docker exec "$PRIMARY_DB" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select id from users where username='supervisor' limit 1;")"
[[ -n "$SUPERVISOR_ID" ]] || fail_check "seeded supervisor account was not found"

mkdir -p "$PRIMARY_EVIDENCE_DIR/cert"
printf '\x89PNG\r\n\x1a\nPTC-AUTOMATED-RECOVERY-CERT' > "$PRIMARY_EVIDENCE_DIR/$STORAGE_KEY"
EVIDENCE_BINARY_SHA="$(sha256sum "$PRIMARY_EVIDENCE_DIR/$STORAGE_KEY" | awk '{print $1}')"
EVIDENCE_SIZE="$(wc -c < "$PRIMARY_EVIDENCE_DIR/$STORAGE_KEY" | tr -d ' ')"

docker exec -i "$PRIMARY_DB" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" >/dev/null <<SQL
INSERT INTO inspection_events (
  id, "cameraId", "cameraName", zone, timestamp, outcome, reason, confidence,
  "reviewStatus", summary, "evidenceAvailable", remarks, "reviewedBy", "reviewedAt",
  "modelVersion", "ruleVersion", version, "schemaVersion", dataset, "createdAt", "updatedAt",
  "configVersion", "edgeVersion", source
) VALUES (
  '$EVENT_ID', 'CAM-01', 'Camera 01', 'Automated recovery certification', NOW(),
  'completed', 'Known backup/recovery fixture', 99, 'confirmed',
  'Fixture created before pg_dump and verified after isolated restore', true,
  'Automated recovery certification', 'Certification Supervisor', NOW(),
  'recovery-cert-model', 'recovery-cert-rules', 1, 1, 'recovery-cert', NOW(), NOW(),
  'recovery-cert-config', 'recovery-cert-edge', 'edge'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO evidence_metadata (
  id, "eventId", state, type, "mimeType", "sizeBytes", checksum, "storageKey",
  dataset, "createdAt", "updatedAt", "durationMs", source
) VALUES (
  '$EVIDENCE_ID', '$EVENT_ID', 'available', 'snapshot', 'image/png', $EVIDENCE_SIZE,
  '$EVIDENCE_BINARY_SHA', '$STORAGE_KEY', 'recovery-cert', NOW(), NOW(), NULL, 'edge'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (
  id, "actionId", "actorId", "actorDisplayName", "actorRole", action,
  "targetType", "targetId", before, after, "correlationId", "occurredAt", "createdAt"
) VALUES (
  '00000000-0000-4000-8000-000000000147',
  '00000000-0000-4000-8000-000000000148',
  '$SUPERVISOR_ID', 'Certification Supervisor', 'supervisor', 'event.review.updated',
  'inspectionEvent', '$EVENT_ID',
  '{"reviewStatus":"unreviewed"}'::jsonb,
  '{"reviewStatus":"confirmed"}'::jsonb,
  'recovery-cert-correlation', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;
SQL

# Primary backup and checksum.
docker exec "$PRIMARY_DB" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"
[[ -s "$BACKUP_FILE" ]] || fail_check "primary PostgreSQL dump is empty"
sha256sum "$BACKUP_FILE" > "$BACKUP_SHA_FILE"
sha256sum -c "$BACKUP_SHA_FILE" >/dev/null || fail_check "PostgreSQL backup checksum failed"
docker run --rm -i postgres:16-alpine pg_restore --list < "$BACKUP_FILE" > "$ARTIFACT_DIR/postgres-backup-list.txt"
grep -q 'TABLE DATA public inspection_events' "$ARTIFACT_DIR/postgres-backup-list.txt" || fail_check "inspection_events data missing from backup"
grep -q 'TABLE DATA public audit_logs' "$ARTIFACT_DIR/postgres-backup-list.txt" || fail_check "audit_logs data missing from backup"
grep -q 'TABLE DATA public evidence_metadata' "$ARTIFACT_DIR/postgres-backup-list.txt" || fail_check "evidence_metadata data missing from backup"
grep -q 'TABLE DATA public _prisma_migrations' "$ARTIFACT_DIR/postgres-backup-list.txt" || fail_check "migration history missing from backup"

# Evidence is independently archived/checksummed because binaries are not stored in PostgreSQL.
tar -czf "$EVIDENCE_ARCHIVE" -C "$PRIMARY_EVIDENCE_DIR" .
sha256sum "$EVIDENCE_ARCHIVE" > "$EVIDENCE_SHA_FILE"
sha256sum -c "$EVIDENCE_SHA_FILE" >/dev/null || fail_check "evidence archive checksum failed"

echo "Starting disposable restore PostgreSQL target..."
start_postgres "$RESTORE_DB"

echo "Restoring PostgreSQL backup into disposable target..."
if ! docker exec -i "$RESTORE_DB" pg_restore \
  -U "$DB_USER" -d "$DB_NAME" \
  --clean --if-exists --no-owner --no-privileges --exit-on-error \
  < "$BACKUP_FILE" > "$ARTIFACT_DIR/postgres-restore.log" 2>&1; then
  docker logs "$RESTORE_DB" > "$ARTIFACT_DIR/restore-postgres-container.log" 2>&1 || true
  cat "$ARTIFACT_DIR/postgres-restore.log" >&2 || true
  fail_check "PostgreSQL restore failed"
fi
printf 'restore_command=PASS\n' > "$CHECKS_FILE"

MIGRATION_COUNT="$(docker exec "$RESTORE_DB" psql -U "$DB_USER" -d "$DB_NAME" -Atc 'select count(*) from public._prisma_migrations where finished_at is not null;')"
printf 'migration_count=%s\n' "$MIGRATION_COUNT" >> "$CHECKS_FILE"
[[ "$MIGRATION_COUNT" =~ ^[0-9]+$ ]] && [[ "$MIGRATION_COUNT" -ge 1 ]] || fail_check "restored migration history is missing"

tar -xzf "$EVIDENCE_ARCHIVE" -C "$RESTORE_EVIDENCE_DIR"
[[ -f "$RESTORE_EVIDENCE_DIR/$STORAGE_KEY" ]] || fail_check "restored evidence binary is missing"
RESTORED_BINARY_SHA="$(sha256sum "$RESTORE_EVIDENCE_DIR/$STORAGE_KEY" | awk '{print $1}')"
[[ "$RESTORED_BINARY_SHA" == "$EVIDENCE_BINARY_SHA" ]] || fail_check "restored evidence checksum mismatch"
printf 'restored_evidence_sha=%s\n' "$RESTORED_BINARY_SHA" >> "$CHECKS_FILE"

RESTORED_EVENT_COUNT="$(docker exec "$RESTORE_DB" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select count(*) from public.inspection_events where id='${EVENT_ID}';")"
RESTORED_AUDIT_COUNT="$(docker exec "$RESTORE_DB" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select count(*) from public.audit_logs where \"targetId\"='${EVENT_ID}' and action='event.review.updated';")"
RESTORED_EVIDENCE_ROW="$(docker exec "$RESTORE_DB" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select \"storageKey\" || '|' || checksum from public.evidence_metadata where id='${EVIDENCE_ID}';")"
[[ "$RESTORED_EVENT_COUNT" == "1" ]] || fail_check "known event did not reconcile after restore"
[[ "$RESTORED_AUDIT_COUNT" == "1" ]] || fail_check "known audit entry did not reconcile after restore"
[[ "$RESTORED_EVIDENCE_ROW" == "$STORAGE_KEY|$EVIDENCE_BINARY_SHA" ]] || fail_check "evidence metadata did not reconcile after restore"
printf 'event_count=%s\naudit_count=%s\ndirect_reconciliation=PASS\n' "$RESTORED_EVENT_COUNT" "$RESTORED_AUDIT_COUNT" >> "$CHECKS_FILE"

# Run the production API against the restored database/evidence copy only.
docker run -d \
  --name "$RESTORE_API" \
  --network "$NETWORK_NAME" \
  -p 127.0.0.1:4010:4000 \
  -v "$RESTORE_EVIDENCE_DIR:/mnt/ptc-evidence" \
  -e NODE_ENV=production \
  -e PORT=4000 \
  -e "DATABASE_URL=$RESTORE_URL" \
  -e SESSION_COOKIE_NAME=ptc_session \
  -e SESSION_TTL_HOURS=720 \
  -e SESSION_ABSOLUTE_TTL_HOURS=720 \
  -e COOKIE_SECURE=false \
  -e ALLOWED_ORIGINS=http://127.0.0.1:4010 \
  -e TRUST_PROXY=false \
  -e AUTH_MODE=local \
  -e "INGESTION_SERVICE_TOKEN=$INGESTION_SERVICE_TOKEN" \
  -e EVIDENCE_ROOT=/mnt/ptc-evidence \
  -e MAX_EVIDENCE_BYTES=26214400 \
  -e BUILD_VERSION=recovery-cert \
  -e "BUILD_COMMIT=${GITHUB_SHA:-local}" \
  -e SCHEMA_VERSION=20260731-production-readiness \
  -e SIMULATOR_ENABLED=false \
  ptc-recovery-api-runtime >/dev/null

for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:4010/readyz > "$ARTIFACT_DIR/restored-readyz.json" 2>/dev/null; then
    break
  fi
  sleep 1
done
jq -e '.status == "ready" and .database == "connected"' "$ARTIFACT_DIR/restored-readyz.json" >/dev/null || {
  docker logs "$RESTORE_API" > "$ARTIFACT_DIR/restored-api-startup.log" 2>&1 || true
  fail_check "API did not become ready against restored PostgreSQL"
}
printf 'restored_api_ready=PASS\n' >> "$CHECKS_FILE"

curl -fsS -c "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"supervisor\",\"password\":\"$SEED_SUPERVISOR_PASSWORD\"}" \
  http://127.0.0.1:4010/api/auth/login > "$ARTIFACT_DIR/restored-login.json"
jq -e '.user.role == "supervisor"' "$ARTIFACT_DIR/restored-login.json" >/dev/null || fail_check "restored API login failed"

curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:4010/api/events/$EVENT_ID" > "$ARTIFACT_DIR/restored-event.json"
jq -e '.id == "'"$EVENT_ID"'" and .reviewStatus == "confirmed" and .evidenceAvailable == true' "$ARTIFACT_DIR/restored-event.json" >/dev/null || fail_check "known event API check failed after restore"

curl -fsS -b "$COOKIE_JAR" http://127.0.0.1:4010/api/reports/summary > "$ARTIFACT_DIR/restored-report-summary.json"
jq -e '.total >= 1' "$ARTIFACT_DIR/restored-report-summary.json" >/dev/null || fail_check "report generation failed against restored DB"

curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:4010/api/evidence/$EVIDENCE_ID/content" > "$ARTIFACT_DIR/restored-evidence.bin"
cmp "$PRIMARY_EVIDENCE_DIR/$STORAGE_KEY" "$ARTIFACT_DIR/restored-evidence.bin" || fail_check "restored evidence API content differs"
printf 'restored_api_smoke=PASS\n' >> "$CHECKS_FILE"

docker logs "$RESTORE_API" > "$ARTIFACT_DIR/restored-api.log" 2>&1 || true

LEAK_PATTERN="${DB_PASSWORD}|postgresql://${DB_USER}:|${INGESTION_SERVICE_TOKEN}|${SEED_SUPERVISOR_PASSWORD}"
if grep -R -n -E "$LEAK_PATTERN" "$ARTIFACT_DIR" 2>/dev/null | grep -v '/cookies.txt:'; then
  fail_check "credential or database connection-string leakage detected"
fi
printf 'credential_leak_scan=PASS\n' >> "$CHECKS_FILE"

BACKUP_SHA="$(awk '{print $1}' "$BACKUP_SHA_FILE")"
EVIDENCE_ARCHIVE_SHA="$(awk '{print $1}' "$EVIDENCE_SHA_FILE")"
cat > "$ARTIFACT_DIR/certification-summary.txt" <<SUMMARY
Automated backup/recovery software certification: PASS
Primary PostgreSQL boundary: isolated disposable service, no host-published DB port
Backup format: PostgreSQL custom format
Backup checksum verification: PASS
Backup SHA-256: $BACKUP_SHA
Restore PostgreSQL boundary: second disposable service, no host-published DB port
Restore destructive to primary: NO
Prisma migration history restored: PASS
Known event reconciliation: PASS ($EVENT_ID)
Known audit reconciliation: PASS
Evidence metadata reconciliation: PASS ($EVIDENCE_ID)
Evidence archive checksum verification: PASS
Evidence archive SHA-256: $EVIDENCE_ARCHIVE_SHA
Evidence binary restore/reconciliation: PASS
API /readyz against restored DB: PASS
API login/event/report/evidence smoke against restored DB: PASS
Credential/connection-string leakage scan: PASS
Real PTC production-environment execution: NOT CLAIMED; remains under #148
SUMMARY

# Retain only sanitized evidence. The synthetic backup/archive and cookie are not uploaded.
rm -f "$COOKIE_JAR" "$BACKUP_FILE" "$EVIDENCE_ARCHIVE" "$ARTIFACT_DIR/restored-evidence.bin"

echo "Automated backup/recovery software certification passed."
