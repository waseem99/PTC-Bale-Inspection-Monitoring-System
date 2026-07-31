#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_DIR="$REPO_ROOT/infrastructure/local"
COMPOSE_FILE="$LOCAL_DIR/docker-compose.local.yml"
WORK_ROOT="${PTC_CI_ROOT:-${RUNNER_TEMP:-/tmp}/ptc-bale-local-ci}"
ENV_FILE="$WORK_ROOT/runtime.env"
DATA_ROOT="$WORK_ROOT/data"
HTTP_PORT="${PTC_CI_HTTP_PORT:-18080}"
BASE_URL="http://127.0.0.1:${HTTP_PORT}"
EVIDENCE_STATE=""
EVENT_ID=""

info() { printf '[local-ci] %s\n' "$*"; }
fail() { printf '[local-ci] ERROR: %s\n' "$*" >&2; exit 1; }

compose() {
  docker compose --env-file "$ENV_FILE" --project-directory "$LOCAL_DIR" -f "$COMPOSE_FILE" "$@"
}

cleanup() {
  set +e
  if [[ -f "$ENV_FILE" ]]; then
    compose down --remove-orphans >/dev/null 2>&1
  fi
}
trap cleanup EXIT

wait_http() {
  local url="$1" attempts="${2:-120}"
  for _ in $(seq 1 "$attempts"); do
    curl --fail --silent "$url" >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

mask_secret() {
  [[ -n "${GITHUB_ACTIONS:-}" ]] && printf '::add-mask::%s\n' "$1"
}

validate_sources() {
  info "Validating shell, Python, PowerShell, and edge-spool sources"
  bash -n "$SCRIPT_DIR/bootstrap.sh" "$SCRIPT_DIR/ptc-local.sh" "$SCRIPT_DIR/ci.sh"
  python -m py_compile \
    "$REPO_ROOT/tools/edge-simulator/ptc_edge_spool.py" \
    "$REPO_ROOT/tools/edge-simulator/local_service.py"
  (
    cd "$REPO_ROOT/tools/edge-simulator"
    python -m unittest -v
  )
  if command -v pwsh >/dev/null 2>&1; then
    pwsh -NoLogo -NoProfile -Command "
      \$tokens = \$null
      \$errors = \$null
      [System.Management.Automation.Language.Parser]::ParseFile('$REPO_ROOT/scripts/local/ptc-local.ps1', [ref]\$tokens, [ref]\$errors) | Out-Null
      [System.Management.Automation.Language.Parser]::ParseFile('$REPO_ROOT/scripts/local/bootstrap.ps1', [ref]\$tokens, [ref]\$errors) | Out-Null
      if (\$errors.Count -gt 0) { \$errors | ForEach-Object { Write-Error \$_ }; exit 1 }
    "
  fi
}

generate_runtime() {
  info "Generating isolated protected runtime configuration"
  rm -rf "$WORK_ROOT"
  mkdir -p \
    "$DATA_ROOT/postgres" \
    "$DATA_ROOT/evidence" \
    "$DATA_ROOT/spool" \
    "$DATA_ROOT/backups" \
    "$DATA_ROOT/logs/caddy"

  DB_PASSWORD="$(openssl rand -hex 24)"
  VIEWER_PASSWORD="$(openssl rand -hex 16)"
  SUPERVISOR_PASSWORD="$(openssl rand -hex 16)"
  ADMIN_PASSWORD="$(openssl rand -hex 16)"
  INGESTION_TOKEN="$(openssl rand -hex 32)"
  export VIEWER_PASSWORD SUPERVISOR_PASSWORD ADMIN_PASSWORD INGESTION_TOKEN
  for secret in "$DB_PASSWORD" "$VIEWER_PASSWORD" "$SUPERVISOR_PASSWORD" "$ADMIN_PASSWORD" "$INGESTION_TOKEN"; do
    mask_secret "$secret"
  done

  local commit tag
  commit="${GITHUB_SHA:-$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || printf unknown)}"
  tag="local-ci-${commit:0:12}"
  umask 077
  cat > "$ENV_FILE" <<EOF
PTC_DATA_ROOT=$DATA_ROOT
LOCAL_UID=$(id -u)
LOCAL_GID=$(id -g)
LOCAL_BIND_ADDRESS=127.0.0.1
LOCAL_HTTP_PORT=$HTTP_PORT
ALLOWED_ORIGINS=http://localhost:$HTTP_PORT,http://127.0.0.1:$HTTP_PORT
PTC_RUNTIME_MODE=simulator
POSTGRES_DB=ptc_bale
POSTGRES_USER=ptc_app
POSTGRES_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://ptc_app:$DB_PASSWORD@postgres:5432/ptc_bale?schema=public
SESSION_COOKIE_NAME=ptc_session
SESSION_TTL_HOURS=8
SEED_VIEWER_PASSWORD=$VIEWER_PASSWORD
SEED_SUPERVISOR_PASSWORD=$SUPERVISOR_PASSWORD
SEED_ADMIN_PASSWORD=$ADMIN_PASSWORD
INGESTION_SERVICE_TOKEN=$INGESTION_TOKEN
MAX_EVIDENCE_BYTES=26214400
EDGE_FLUSH_INTERVAL_SECONDS=2
EDGE_HTTP_TIMEOUT_SECONDS=5
SIMULATOR_SEQUENCE_BASE=1000
SIMULATOR_GENERATE_EVERY_SECONDS=3600
IMAGE_TAG=$tag
BUILD_VERSION=$tag
BUILD_COMMIT=$commit
SCHEMA_VERSION=20260731-camera-contract-v1
EOF
  chmod 600 "$ENV_FILE"
}

validate_compose() {
  info "Validating Compose and host-exposure boundaries"
  compose config --quiet
  compose config --format json > "$WORK_ROOT/compose.json"
  jq -e '
    (.services.postgres.ports == null) and
    (.services.api.ports == null) and
    (.services.dashboard.ports == null) and
    (.services["edge-spool"].ports == null) and
    (.services.proxy.ports | length == 1) and
    (.services.proxy.ports[0].host_ip == "127.0.0.1") and
    (.networks.internal.internal == true)
  ' "$WORK_ROOT/compose.json" >/dev/null
}

start_stack() {
  info "Building and starting complete local stack"
  compose build
  compose up -d --remove-orphans
  if ! wait_http "$BASE_URL/healthz" 120; then
    compose ps
    compose logs --tail=300
    fail "Local stack did not become ready"
  fi
  compose ps
}

authenticated_checks() {
  info "Checking authentication, camera contract, reports, evidence, and realtime"
  curl --fail --silent --show-error \
    --cookie-jar "$WORK_ROOT/supervisor.cookies" \
    --header "Origin: $BASE_URL" \
    --header 'Content-Type: application/json' \
    --data "{\"username\":\"supervisor\",\"password\":\"$SUPERVISOR_PASSWORD\"}" \
    "$BASE_URL/api/auth/login" > "$WORK_ROOT/supervisor-login.json"
  jq -e '.user.role == "supervisor"' "$WORK_ROOT/supervisor-login.json" >/dev/null

  curl --fail --silent --show-error --cookie "$WORK_ROOT/supervisor.cookies" \
    "$BASE_URL/api/camera-config" > "$WORK_ROOT/camera-config.json"
  jq -e '.schemaVersion == "camera-contract-v1" and (.cameras | length) == 4' \
    "$WORK_ROOT/camera-config.json" >/dev/null

  curl --fail --silent --show-error --cookie "$WORK_ROOT/supervisor.cookies" \
    "$BASE_URL/api/reports/summary" > "$WORK_ROOT/report-summary.json"
  jq -e '.generatedAt and (.total >= 257)' "$WORK_ROOT/report-summary.json" >/dev/null

  curl --fail --silent --show-error --cookie "$WORK_ROOT/supervisor.cookies" \
    "$BASE_URL/api/reports/pdf" > "$WORK_ROOT/report.pdf"
  [[ "$(head -c 4 "$WORK_ROOT/report.pdf")" == '%PDF' ]] || fail "PDF signature is invalid"

  for _ in $(seq 1 60); do
    EVENT_ID="$(compose exec -T postgres psql -U ptc_app -d ptc_bale -At \
      -c "SELECT id FROM inspection_events WHERE source='simulator' ORDER BY \"createdAt\" DESC LIMIT 1;" | tr -d '\r')"
    if [[ -n "$EVENT_ID" ]]; then
      EVIDENCE_STATE="$(compose exec -T postgres psql -U ptc_app -d ptc_bale -At \
        -c "SELECT state::text FROM evidence_metadata WHERE \"eventId\"='$EVENT_ID';" | tr -d '[:space:]')"
      [[ "$EVIDENCE_STATE" == available ]] && break
    fi
    sleep 2
  done
  [[ -n "$EVENT_ID" && "$EVIDENCE_STATE" == available ]] || fail "Simulator evidence did not become available"

  curl --fail --silent --show-error --cookie "$WORK_ROOT/supervisor.cookies" \
    "$BASE_URL/api/events/$EVENT_ID/evidence" > "$WORK_ROOT/evidence.json"
  local evidence_url
  evidence_url="$(jq -er '.contentUrl' "$WORK_ROOT/evidence.json")"
  curl --fail --silent --show-error --cookie "$WORK_ROOT/supervisor.cookies" \
    --range 0-15 "$BASE_URL$evidence_url" > "$WORK_ROOT/evidence-range.bin"
  [[ "$(wc -c < "$WORK_ROOT/evidence-range.bin")" -eq 16 ]] || fail "Evidence range response is invalid"

  set +e
  timeout 5 curl --no-buffer --silent --show-error --cookie "$WORK_ROOT/supervisor.cookies" \
    "$BASE_URL/api/realtime" > "$WORK_ROOT/realtime.txt"
  local realtime_status=$?
  set -e
  [[ "$realtime_status" -eq 0 || "$realtime_status" -eq 124 ]] || fail "Realtime stream failed"
  grep -Eq 'retry:|event:' "$WORK_ROOT/realtime.txt" || fail "Realtime stream did not initialize"
}

outage_replay_check() {
  info "Checking durable queue through API outage and exact replay"
  compose stop api
  compose exec -T edge-spool python /app/ptc_edge_spool.py \
    --database /var/lib/ptc-bale/spool/spool.sqlite3 \
    enqueue-event --camera CAM-04 --scenario incomplete --sequence 999999 > "$WORK_ROOT/outage-event-id.txt"
  compose exec -T edge-spool python /app/ptc_edge_spool.py \
    --database /var/lib/ptc-bale/spool/spool.sqlite3 \
    enqueue-event --camera CAM-04 --scenario incomplete --sequence 999999 > "$WORK_ROOT/replay-event-id.txt"
  diff -u "$WORK_ROOT/outage-event-id.txt" "$WORK_ROOT/replay-event-id.txt"
  sleep 4
  compose exec -T edge-spool python /app/ptc_edge_spool.py \
    --database /var/lib/ptc-bale/spool/spool.sqlite3 status > "$WORK_ROOT/spool-during-outage.json"
  jq -e '.pending >= 1' "$WORK_ROOT/spool-during-outage.json" >/dev/null

  compose start api
  for _ in $(seq 1 60); do
    compose exec -T api wget -qO- http://127.0.0.1:4000/readyz >/dev/null 2>&1 && break
    sleep 2
  done
  local count=0
  for _ in $(seq 1 60); do
    count="$(compose exec -T postgres psql -U ptc_app -d ptc_bale -At \
      -c "SELECT count(*) FROM inspection_events WHERE id='SIM-CAM-04-incomplete-999999';" | tr -d '[:space:]')"
    [[ "$count" == 1 ]] && break
    sleep 2
  done
  [[ "$count" == 1 ]] || fail "Outage event was not delivered exactly once"
}

backup_check() {
  info "Checking database/evidence backup and checksums"
  PTC_RUNTIME_ENV="$ENV_FILE" PTC_DATA_ROOT="$DATA_ROOT" bash "$SCRIPT_DIR/ptc-local.sh" backup
  local checksum_file
  checksum_file="$(find "$DATA_ROOT/backups" -maxdepth 1 -name '*.sha256' -print -quit)"
  [[ -n "$(find "$DATA_ROOT/backups" -maxdepth 1 -name '*.dump' -print -quit)" ]] || fail "Database dump missing"
  [[ -n "$(find "$DATA_ROOT/backups" -maxdepth 1 -name '*evidence*.tar.gz' -print -quit)" ]] || fail "Evidence archive missing"
  [[ -n "$checksum_file" ]] || fail "Checksum manifest missing"
  (cd "$DATA_ROOT/backups" && sha256sum --check "$(basename "$checksum_file")")
}

hardware_ready_check() {
  info "Checking hardware-ready mode"
  local before after mode
  before="$(compose exec -T postgres psql -U ptc_app -d ptc_bale -At \
    -c "SELECT count(*) FROM inspection_events WHERE source='simulator';" | tr -d '[:space:]')"
  PTC_RUNTIME_ENV="$ENV_FILE" PTC_DATA_ROOT="$DATA_ROOT" bash "$SCRIPT_DIR/ptc-local.sh" mode hardware-ready
  grep -q '^PTC_RUNTIME_MODE=hardware-ready$' "$ENV_FILE"
  sleep 8
  after="$(compose exec -T postgres psql -U ptc_app -d ptc_bale -At \
    -c "SELECT count(*) FROM inspection_events WHERE source='simulator';" | tr -d '[:space:]')"
  [[ "$after" == "$before" ]] || fail "Hardware-ready mode generated simulator events"
  mode="$(compose exec -T edge-spool sh -c 'printf %s "$PTC_RUNTIME_MODE"')"
  [[ "$mode" == hardware-ready ]] || fail "Edge service mode was not updated"
}

persistence_check() {
  info "Checking persistence across full service stop/start"
  local before after
  before="$(compose exec -T postgres psql -U ptc_app -d ptc_bale -At \
    -c 'SELECT count(*) FROM inspection_events;' | tr -d '[:space:]')"
  compose stop
  compose up -d
  wait_http "$BASE_URL/healthz" 90 || fail "Stack did not recover after stop/start"
  after="$(compose exec -T postgres psql -U ptc_app -d ptc_bale -At \
    -c 'SELECT count(*) FROM inspection_events;' | tr -d '[:space:]')"
  [[ "$after" == "$before" ]] || fail "Committed event count changed after stop/start"
}

write_record() {
  local output="$REPO_ROOT/local-runtime-certification.log"
  {
    echo "commit=${GITHUB_SHA:-unknown}"
    echo "docker=$(docker version --format '{{.Server.Version}}' 2>/dev/null)"
    echo "compose=$(docker compose version --short 2>/dev/null)"
    echo "runtime_url=$BASE_URL"
    echo "configuration=workstation-only"
    echo "authentication=passed"
    echo "camera_contract=passed"
    echo "reports=passed"
    echo "evidence=passed"
    echo "realtime=passed"
    echo "outage_replay=passed"
    echo "backup_checksum=passed"
    echo "hardware_ready=passed"
    echo "stop_start_persistence=passed"
    echo "secrets_redacted=true"
  } > "$output"
  info "Sanitized certification record: $output"
}

main() {
  command -v docker >/dev/null || fail "Docker is required"
  command -v curl >/dev/null || fail "curl is required"
  command -v jq >/dev/null || fail "jq is required"
  command -v openssl >/dev/null || fail "openssl is required"
  docker info >/dev/null || fail "Docker is not running"
  validate_sources
  generate_runtime
  validate_compose
  start_stack
  authenticated_checks
  outage_replay_check
  backup_check
  hardware_ready_check
  persistence_check
  write_record
  info "Local go-live certification passed"
}

main "$@"
