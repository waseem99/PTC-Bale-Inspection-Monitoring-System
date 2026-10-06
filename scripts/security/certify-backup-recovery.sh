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
BACKUP_SHA_FILE="$BACKUP_FILE.sha256"
EVIDENCE_ARCHIVE="$ARTIFACT_DIR/evidence-primary.tar.gz"
EVIDENCE_SHA_FILE="$EVIDENCE_ARCHIVE.sha256"
COOKIE_JAR="$ARTIFACT_DIR/cookies.txt"

mkdir -p "$ARTIFACT_DIR" "$PRIMARY_EVIDENCE_DIR" "$RESTORE_EVIDENCE_DIR"
chmod 0777 "$PRIMARY_EVIDENCE_DIR" "$RESTORE_EVIDENCE_DIR"
rm -rf "$PRIMARY_EVIDENCE_DIR"/* "$RESTORE_EVIDENCE_DIR"/*
rm -f "$ARTIFACT_DIR"/* 2>/dev/null || true

cleanup() {
  docker rm -f "$RESTORE_API" "$RESTORE_DB" "$PRIMARY_DB" >/dev/null 2>&1 || true
  docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

require_command() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }
}
for command_name in docker curl jq sha256sum grep cmp tar; do require_command "$command_name"; done

if [[ "$PRIMARY_URL" == "$RESTORE_URL" ]]; then
  echo "Primary and restore DATABASE_URL values must be different." >&2
  exit 1
fi

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

  if [[ -n "$(docker port "$name" 2>/dev/null)" ]]; then
    echo "PostgreSQL container $name unexpectedly publishes a host port." >&2
    exit 1
  fi

  for _ in $(seq 1 60); do
    if docker exec "$name" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  docker logs "$name" >&2 || true
  echo "PostgreSQL container $name did not become ready." >&2
  exit 1
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
if [[ -z "$SUPERVISOR_ID" ]]; then
  echo "Seeded supervisor account was not found." >&2
  exit 1
fi

mkdir -p "$PRIMARY_EVIDENCE_DIR/cert"
printf '\x89PNG\r\n\x1a\nPTC-AUTOMATED-RECOVERY-CERT' > "$PRIMARY_EVIDENCE_DIR/$STORAGE_KEY"
EVIDENCE_BINARY_SHA="$(sha256sum "$PRIMARY_EVIDENCE_DIR/$STORAGE_KEY" | awk '{print $1}')"
EVIDENCE_SIZE="$(wc -c < "$PRIMARY_EVIDENCE_DIR/$STORAGE_KEY" | tr -d ' ')"

docker exec "$PRIMARY_DB" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" >/dev/null <<SQL
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

docker exec "$PRIMARY_DB" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"
[[ -s "$BACKUP_FILE" ]]
sha256sum "$BACKUP_FILE" > "$BACKUP_SHA_FILE"
sha256sum -c "$BACKUP_SHA_FILE" >/dev/null
docker run --rm -i postgres:16-alpine pg_restore --list < "$BACKUP_FILE" > "$ARTIFACT_DIR/postgres-backup-list.txt"
grep -q 'TABLE DATA public inspection_events' "$ARTIFACT_DIR/postgres-backup-list.txt"
grep -q 'TABLE DATA public audit_logs' "$ARTIFACT_DIR/postgres-backup-list.txt"
grep -q 'TABLE DATA public evidence_metadata' "$ARTIFACT_DIR/postgres-backup-list.txt"

tar -czf "$EVIDENCE_ARCHIVE" -C "$PRIMARY_EVIDENCE_DIR" .
sha256sum "$EVIDENCE_ARCHIVE" > "$EVIDENCE_SHA_FILE"
sha256sum -c "$EVIDENCE_SHA_FILE" >/dev/null

echo "Starting disposable restore PostgreSQL target..."
start_postgres "$RESTORE_DB"

echo "Restoring PostgreSQL backup into disposable target..."
if ! docker exec -i "$RESTORE_DB" pg_restore \
  -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges --exit-on-error \
  < "$BACKUP_FILE" > "$ARTIFACT_DIR/postgres-restore.log" 2>&1; then
  docker logs "$RESTORE_DB" > "$ARTIFACT_DIR/restore-postgres-container.log" 2>&1 || true
  cat "$ARTIFACT_DIR/postgres-restore.log" >&2 || true
  exit 1
fi

MIGRATION_COUNT="$(docker exec "$RESTORE_DB" psql -U "$DB_USER" -d "$DB_NAME" -Atc 'select count(*) from _prisma_migrations where finished_at is not null;')"
[[ "$MIGRATION_COUNT" -ge 1 ]]

tar -xzf "$EVIDENCE_ARCHIVE" -C "$RESTORE_EVIDENCE_DIR"
[[ -f "$RESTORE_EVIDENCE_DIR/$STORAGE_KEY" ]]
RESTORED_BINARY_SHA="$(sha256sum "$RESTORE_EVIDENCE_DIR/$STORAGE_KEY" | awk '{print $1}')"
[[ "$RESTORED_BINARY_SHA" == "$EVIDENCE_BINARY_SHA" ]]

RESTORED_EVENT_COUNT="$(docker exec "$RESTORE_DB" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select count(*) from inspection_events where id='${EVENT_ID}';")"
RESTORED_AUDIT_COUNT="$(docker exec "$RESTORE_DB" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select count(*) from audit_logs where \"targetId\"='${EVENT_ID}' and action='event.review.updated';")"
RESTORED_EVIDENCE_ROW="$(docker exec "$RESTORE_DB" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select \"storageKey\" || '|' || checksum from evidence_metadata where id='${EVIDENCE_ID}';")"
[[ "$RESTORED_EVENT_COUNT" == "1" ]]
[[ "$RESTORED_AUDIT_COUNT" == "1" ]]
[[ "$RESTORED_EVIDENCE_ROW" == "$STORAGE_KEY|$EVIDENCE_BINARY_SHA" ]]

start_restored_api() {
  docker rm -f "$RESTORE_API" >/dev/null 2>&1 || true
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
  jq -e '.status == "ready" and .database == "connected"' "$ARTIFACT_DIR/restored-readyz.json" >/dev/null
}

start_restored_api

curl -fsS -c "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"supervisor\",\"password\":\"$SEED_SUPERVISOR_PASSWORD\"}" \
  http://127.0.0.1:4010/api/auth/login > "$ARTIFACT_DIR/restored-login.json"
jq -e '.user.role == "supervisor"' "$ARTIFACT_DIR/restored-login.json" >/dev/null

curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:4010/api/events/$EVENT_ID" > "$ARTIFACT_DIR/restored-event.json"
jq -e '.id == "'"$EVENT_ID"'" and .reviewStatus == "confirmed" and .evidenceAvailable == true' "$ARTIFACT_DIR/restored-event.json" >/dev/null

curl -fsS -b "$COOKIE_JAR" http://127.0.0.1:4010/api/reports/summary > "$ARTIFACT_DIR/restored-report-summary.json"
jq -e '.total >= 1' "$ARTIFACT_DIR/restored-report-summary.json" >/dev/null

curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:4010/api/evidence/$EVIDENCE_ID/content" > "$ARTIFACT_DIR/restored-evidence.bin"
cmp "$PRIMARY_EVIDENCE_DIR/$STORAGE_KEY" "$ARTIFACT_DIR/restored-evidence.bin"

docker logs "$RESTORE_API" > "$ARTIFACT_DIR/restored-api.log" 2>&1 || true

LEAK_PATTERN="${DB_PASSWORD}|postgresql://${DB_USER}:|${INGESTION_SERVICE_TOKEN}|${SEED_SUPERVISOR_PASSWORD}"
if grep -R -n -E "$LEAK_PATTERN" "$ARTIFACT_DIR" 2>/dev/null | grep -v '/cookies.txt:'; then
  echo "Credential or database connection-string leakage detected in certification evidence." >&2
  exit 1
fi
rm -f "$COOKIE_JAR"

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

echo "Automated backup/recovery software certification passed."
