#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

NETWORK_NAME="ptc-db-cert-${GITHUB_RUN_ID:-local}"
DB_CONTAINER="ptc-cert-db-${GITHUB_RUN_ID:-local}"
API_CONTAINER="ptc-cert-api-${GITHUB_RUN_ID:-local}"
DB_NAME="ptc_cert"
DB_USER="ptc_cert"
DB_PASSWORD="PTC_DB_CERT_CANARY_SECRET_2026"
DB_HOST="$DB_CONTAINER"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?schema=public"
SEED_VIEWER_PASSWORD="Viewer-Cert-2026!"
SEED_SUPERVISOR_PASSWORD="Supervisor-Cert-2026!"
SEED_ADMIN_PASSWORD="Admin-Cert-2026!"
INGESTION_SERVICE_TOKEN="PTC-CERT-INGESTION-TOKEN-2026-ONLY"
EVENT_ID="CERT-REMOTE-DB-001"
EVIDENCE_ID="EVD-CERT-REMOTE-DB-001"
ARTIFACT_DIR="${CERT_ARTIFACT_DIR:-$ROOT_DIR/.certification/separated-postgres}"
EVIDENCE_HOST_DIR="${CERT_EVIDENCE_DIR:-$ROOT_DIR/.certification/evidence-mount}"
COOKIE_JAR="$ARTIFACT_DIR/cookies.txt"

mkdir -p "$ARTIFACT_DIR" "$EVIDENCE_HOST_DIR"
chmod 0777 "$EVIDENCE_HOST_DIR"
rm -f "$ARTIFACT_DIR"/*.json "$ARTIFACT_DIR"/*.pdf "$ARTIFACT_DIR"/*.log "$ARTIFACT_DIR"/*.txt "$COOKIE_JAR" 2>/dev/null || true

cleanup() {
  docker rm -f "$API_CONTAINER" "$DB_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

require_command() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }
}
for command_name in docker curl jq sha256sum grep cmp; do require_command "$command_name"; done

if [[ "$DATABASE_URL" == *"@localhost:"* || "$DATABASE_URL" == *"@127.0.0.1:"* || "$DATABASE_URL" == *"@postgres:"* ]]; then
  echo "Certification DATABASE_URL must use a distinct non-loopback service hostname." >&2
  exit 1
fi

docker network create "$NETWORK_NAME" >/dev/null

docker run -d \
  --name "$DB_CONTAINER" \
  --network "$NETWORK_NAME" \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  postgres:16-alpine >/dev/null

if [[ -n "$(docker port "$DB_CONTAINER" 2>/dev/null)" ]]; then
  echo "PostgreSQL certification container must not publish any host port." >&2
  exit 1
fi

for _ in $(seq 1 60); do
  if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null

echo "Building API certification images..."
docker build --target build -t ptc-api-cert-build -f apps/platform-api/Dockerfile . >/dev/null
docker build --target runtime -t ptc-api-cert-runtime -f apps/platform-api/Dockerfile . >/dev/null

COMMON_SEED_ENV=(
  -e "DATABASE_URL=$DATABASE_URL"
  -e NODE_ENV=test
  -e "SEED_VIEWER_PASSWORD=$SEED_VIEWER_PASSWORD"
  -e "SEED_SUPERVISOR_PASSWORD=$SEED_SUPERVISOR_PASSWORD"
  -e "SEED_ADMIN_PASSWORD=$SEED_ADMIN_PASSWORD"
)

docker run --rm --network "$NETWORK_NAME" "${COMMON_SEED_ENV[@]}" \
  ptc-api-cert-build pnpm --filter @ptc-bale/platform-api db:migrate:deploy > "$ARTIFACT_DIR/migrations.log"

docker run --rm --network "$NETWORK_NAME" "${COMMON_SEED_ENV[@]}" \
  ptc-api-cert-build pnpm --filter @ptc-bale/platform-api seed:reset > "$ARTIFACT_DIR/seed.log"

start_api() {
  docker rm -f "$API_CONTAINER" >/dev/null 2>&1 || true
  docker run -d \
    --name "$API_CONTAINER" \
    --network "$NETWORK_NAME" \
    -p 127.0.0.1:4000:4000 \
    -v "$EVIDENCE_HOST_DIR:/mnt/ptc-evidence" \
    -e NODE_ENV=production \
    -e PORT=4000 \
    -e "DATABASE_URL=$DATABASE_URL" \
    -e SESSION_COOKIE_NAME=ptc_session \
    -e SESSION_TTL_HOURS=720 \
    -e SESSION_ABSOLUTE_TTL_HOURS=720 \
    -e COOKIE_SECURE=false \
    -e ALLOWED_ORIGINS=http://127.0.0.1:4000 \
    -e TRUST_PROXY=false \
    -e AUTH_MODE=local \
    -e "INGESTION_SERVICE_TOKEN=$INGESTION_SERVICE_TOKEN" \
    -e EVIDENCE_ROOT=/mnt/ptc-evidence \
    -e MAX_EVIDENCE_BYTES=26214400 \
    -e BUILD_VERSION=separate-db-cert \
    -e "BUILD_COMMIT=${GITHUB_SHA:-local}" \
    -e SCHEMA_VERSION=20260731-production-readiness \
    -e SIMULATOR_ENABLED=false \
    ptc-api-cert-runtime >/dev/null

  for _ in $(seq 1 60); do
    if curl -fsS http://127.0.0.1:4000/readyz > "$ARTIFACT_DIR/readyz-connected.json" 2>/dev/null; then break; fi
    sleep 1
  done
  jq -e '.status == "ready" and .database == "connected"' "$ARTIFACT_DIR/readyz-connected.json" >/dev/null
}

login_supervisor() {
  rm -f "$COOKIE_JAR"
  curl -fsS -c "$COOKIE_JAR" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"supervisor\",\"password\":\"$SEED_SUPERVISOR_PASSWORD\"}" \
    http://127.0.0.1:4000/api/auth/login > "$ARTIFACT_DIR/login.json"
  jq -e '.user.role == "supervisor" and .token == ""' "$ARTIFACT_DIR/login.json" >/dev/null
  curl -fsS -b "$COOKIE_JAR" http://127.0.0.1:4000/api/auth/me > "$ARTIFACT_DIR/session.json"
  jq -e '.user.username == "supervisor" and .user.role == "supervisor"' "$ARTIFACT_DIR/session.json" >/dev/null
}

start_api
login_supervisor

SESSION_COUNT="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atc 'select count(*) from sessions;')"
[[ "$SESSION_COUNT" -ge 1 ]]

cat > "$ARTIFACT_DIR/event-payload.json" <<JSON
{
  "id": "$EVENT_ID",
  "cameraId": "CAM-01",
  "cameraName": "Camera 01",
  "zone": "Certification Zone",
  "timestamp": "2026-10-06T00:00:00Z",
  "outcome": "completed",
  "reason": "Separated PostgreSQL software certification event",
  "confidence": 99,
  "summary": "CI certification event using a network-separated PostgreSQL service.",
  "modelVersion": "cert-model-1",
  "ruleVersion": "cert-rules-1",
  "configVersion": "cert-config-1",
  "edgeVersion": "cert-edge-1",
  "schemaVersion": 1,
  "source": "edge",
  "steps": [
    {"label": "Certification step", "state": "complete", "time": "00:00"}
  ],
  "evidence": {
    "id": "$EVIDENCE_ID",
    "state": "pending",
    "type": "snapshot"
  }
}
JSON

curl -fsS \
  -H "Authorization: Bearer $INGESTION_SERVICE_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary "@$ARTIFACT_DIR/event-payload.json" \
  http://127.0.0.1:4000/api/ingest/events > "$ARTIFACT_DIR/ingest.json"
jq -e '.eventId == "'"$EVENT_ID"'" and (.status == "accepted" or .status == "duplicate")' "$ARTIFACT_DIR/ingest.json" >/dev/null

printf '\x89PNG\r\n\x1a\nPTC-SEPARATE-EVIDENCE-CERT' > "$ARTIFACT_DIR/evidence.bin"
EVIDENCE_SHA="$(sha256sum "$ARTIFACT_DIR/evidence.bin" | awk '{print $1}')"
curl -fsS \
  -H "Authorization: Bearer $INGESTION_SERVICE_TOKEN" \
  -H "X-Evidence-ID: $EVIDENCE_ID" \
  -H "X-Checksum-SHA256: $EVIDENCE_SHA" \
  -H 'Content-Type: image/png' \
  --data-binary "@$ARTIFACT_DIR/evidence.bin" \
  "http://127.0.0.1:4000/api/ingest/evidence/$EVENT_ID" > "$ARTIFACT_DIR/evidence-finalize.json"
jq -e '.status == "available" and .evidenceId == "'"$EVIDENCE_ID"'"' "$ARTIFACT_DIR/evidence-finalize.json" >/dev/null

STORAGE_KEY="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select \"storageKey\" from evidence_metadata where id='${EVIDENCE_ID}';")"
printf '%s\n' "$STORAGE_KEY" > "$ARTIFACT_DIR/storage-key.txt"
MOUNT_SOURCE="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/mnt/ptc-evidence"}}{{.Source}}{{end}}{{end}}' "$API_CONTAINER")"
printf '%s\n' "$MOUNT_SOURCE" > "$ARTIFACT_DIR/evidence-mount-source.txt"
docker exec "$API_CONTAINER" find /mnt/ptc-evidence -type f -printf '%P\n' | sort > "$ARTIFACT_DIR/evidence-files.txt"
if [[ -z "$STORAGE_KEY" ]]; then
  echo "Evidence metadata did not persist a storageKey." >&2
  exit 1
fi
if [[ "$MOUNT_SOURCE" != "$EVIDENCE_HOST_DIR" ]]; then
  echo "Evidence root is not backed by the expected external bind mount." >&2
  exit 1
fi
if ! docker exec "$API_CONTAINER" test -f "/mnt/ptc-evidence/$STORAGE_KEY"; then
  echo "Evidence binary is not present on the external evidence mount at $STORAGE_KEY." >&2
  cat "$ARTIFACT_DIR/evidence-files.txt" >&2 || true
  exit 1
fi

curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:4000/api/events/$EVENT_ID" > "$ARTIFACT_DIR/event-before-review.json"
EVENT_VERSION="$(jq -r '.version' "$ARTIFACT_DIR/event-before-review.json")"
[[ "$EVENT_VERSION" =~ ^[0-9]+$ ]]

curl -fsS -b "$COOKIE_JAR" \
  -X PATCH \
  -H 'Content-Type: application/json' \
  -d "{\"reviewStatus\":\"confirmed\",\"remarks\":\"Separate PostgreSQL certification review\",\"expectedVersion\":$EVENT_VERSION}" \
  "http://127.0.0.1:4000/api/events/$EVENT_ID/review" > "$ARTIFACT_DIR/review.json"
jq -e '.reviewStatus == "confirmed"' "$ARTIFACT_DIR/review.json" >/dev/null

AUDIT_COUNT="$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -Atc "select count(*) from audit_logs where \"targetId\"='${EVENT_ID}';")"
[[ "$AUDIT_COUNT" -ge 1 ]]

curl -fsS -b "$COOKIE_JAR" http://127.0.0.1:4000/api/reports/summary > "$ARTIFACT_DIR/report-summary.json"
jq -e '.total >= 1' "$ARTIFACT_DIR/report-summary.json" >/dev/null
curl -fsS -b "$COOKIE_JAR" http://127.0.0.1:4000/api/reports/pdf > "$ARTIFACT_DIR/report.pdf"
grep -a -q '^%PDF-' "$ARTIFACT_DIR/report.pdf"

# Evidence must remain on the externalized mount across an API container restart.
docker logs "$API_CONTAINER" > "$ARTIFACT_DIR/api-before-restart.log" 2>&1 || true
docker rm -f "$API_CONTAINER" >/dev/null
start_api
login_supervisor
curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:4000/api/evidence/$EVIDENCE_ID/content" > "$ARTIFACT_DIR/evidence-after-restart.bin"
cmp "$ARTIFACT_DIR/evidence.bin" "$ARTIFACT_DIR/evidence-after-restart.bin"

# Readiness must accurately report database loss and recovery.
docker stop "$DB_CONTAINER" >/dev/null
HTTP_CODE="$(curl -sS --max-time 15 -o "$ARTIFACT_DIR/readyz-disconnected.json" -w '%{http_code}' http://127.0.0.1:4000/readyz || true)"
[[ "$HTTP_CODE" == "503" ]]
jq -e '.status == "not-ready" and .database == "disconnected"' "$ARTIFACT_DIR/readyz-disconnected.json" >/dev/null

docker start "$DB_CONTAINER" >/dev/null
for _ in $(seq 1 60); do
  if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1 \
    && curl -fsS http://127.0.0.1:4000/readyz > "$ARTIFACT_DIR/readyz-recovered.json" 2>/dev/null; then break; fi
  sleep 1
done
jq -e '.status == "ready" and .database == "connected"' "$ARTIFACT_DIR/readyz-recovered.json" >/dev/null

docker logs "$API_CONTAINER" > "$ARTIFACT_DIR/api-after-restart.log" 2>&1 || true

# The DB credential/connection string must not appear in user-facing responses, logs, or frontend output.
LEAK_PATTERN="${DB_PASSWORD}|postgresql://${DB_USER}:"
if grep -R -n -E "$LEAK_PATTERN" "$ARTIFACT_DIR" apps/dashboard-web/dist 2>/dev/null \
  | grep -v '/event-payload.json:' \
  | grep -v '/cookies.txt:'; then
  echo "Database credential/connection-string leakage detected." >&2
  exit 1
fi

# Do not retain test credentials in uploaded certification evidence.
rm -f "$COOKIE_JAR" "$ARTIFACT_DIR/event-payload.json"

cat > "$ARTIFACT_DIR/certification-summary.txt" <<SUMMARY
Separated PostgreSQL software certification: PASS
Database boundary: dedicated Docker container on isolated Docker network
Database host observed by application: non-loopback service hostname
Database host port published: no
Migrations: PASS
Readiness connected/disconnected/recovered: PASS
Login/session persistence: PASS
Event ingestion: PASS
Supervisor review + audit persistence: PASS
Reports JSON/PDF: PASS
Evidence external mount write/read/restart persistence: PASS
DB secret/connection-string leakage scan: PASS
Real PTC DB VM/server provisioned: NO (deployment-time PTC input)
SUMMARY

echo "Separated PostgreSQL software certification passed."
