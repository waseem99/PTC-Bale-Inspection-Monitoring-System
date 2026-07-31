#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_DIR="$REPO_ROOT/infrastructure/local"
COMPOSE_FILE="$LOCAL_DIR/docker-compose.local.yml"
DATA_ROOT="${PTC_DATA_ROOT:-$HOME/.ptc-bale}"
CONFIG_DIR="$DATA_ROOT/config"
ENV_FILE="${PTC_RUNTIME_ENV:-$CONFIG_DIR/runtime.env}"
LOCAL_URL=""

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
info() { printf '[ptc-local] %s\n' "$*"; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required."
}

require_docker() {
  require_command docker
  docker info >/dev/null 2>&1 || fail "Docker is not running. Start Docker Desktop or Docker Engine."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."
}

random_hex() {
  local bytes="${1:-32}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  else
    od -An -N"$bytes" -tx1 /dev/urandom | tr -d ' \n'
  fi
}

repo_commit() {
  git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || printf 'unknown'
}

ensure_layout() {
  mkdir -p "$CONFIG_DIR" "$DATA_ROOT/postgres" "$DATA_ROOT/evidence" "$DATA_ROOT/spool" "$DATA_ROOT/backups" "$DATA_ROOT/logs/caddy"
  chmod 700 "$DATA_ROOT" "$CONFIG_DIR" "$DATA_ROOT/evidence" "$DATA_ROOT/spool" "$DATA_ROOT/backups" 2>/dev/null || true
}

write_env() {
  [[ ! -e "$ENV_FILE" ]] || return 0
  ensure_layout
  local commit image_tag uid gid http_port
  commit="$(repo_commit)"
  image_tag="local-${commit:0:12}"
  uid="$(id -u 2>/dev/null || printf '1000')"
  gid="$(id -g 2>/dev/null || printf '1000')"
  http_port="${LOCAL_HTTP_PORT:-8080}"
  local db_password viewer_password supervisor_password admin_password ingestion_token
  db_password="$(random_hex 24)"
  viewer_password="$(random_hex 16)"
  supervisor_password="$(random_hex 16)"
  admin_password="$(random_hex 16)"
  ingestion_token="$(random_hex 32)"
  umask 077
  cat >"$ENV_FILE" <<EOF
PTC_DATA_ROOT=$DATA_ROOT
LOCAL_UID=$uid
LOCAL_GID=$gid
LOCAL_BIND_ADDRESS=127.0.0.1
LOCAL_HTTP_PORT=$http_port
ALLOWED_ORIGINS=http://localhost:$http_port,http://127.0.0.1:$http_port
PTC_RUNTIME_MODE=simulator
POSTGRES_DB=ptc_bale
POSTGRES_USER=ptc_app
POSTGRES_PASSWORD=$db_password
DATABASE_URL=postgresql://ptc_app:$db_password@postgres:5432/ptc_bale?schema=public
SESSION_COOKIE_NAME=ptc_session
SESSION_TTL_HOURS=8
SEED_VIEWER_PASSWORD=$viewer_password
SEED_SUPERVISOR_PASSWORD=$supervisor_password
SEED_ADMIN_PASSWORD=$admin_password
INGESTION_SERVICE_TOKEN=$ingestion_token
MAX_EVIDENCE_BYTES=26214400
EDGE_FLUSH_INTERVAL_SECONDS=5
EDGE_HTTP_TIMEOUT_SECONDS=15
SIMULATOR_SEQUENCE_BASE=1000
SIMULATOR_GENERATE_EVERY_SECONDS=300
IMAGE_TAG=$image_tag
BUILD_VERSION=$image_tag
BUILD_COMMIT=$commit
SCHEMA_VERSION=20260731-camera-contract-v1
EOF
  chmod 600 "$ENV_FILE" 2>/dev/null || true
  info "Generated protected runtime configuration at $ENV_FILE"
  info "Credentials were generated but not printed. Retrieve them only from the protected runtime file."
}

load_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1
}

compose() {
  [[ -f "$ENV_FILE" ]] || fail "Runtime configuration is missing. Run bootstrap first."
  docker compose --env-file "$ENV_FILE" --project-directory "$LOCAL_DIR" -f "$COMPOSE_FILE" "$@"
}

wait_ready() {
  local port url
  port="$(load_env_value LOCAL_HTTP_PORT)"
  url="http://127.0.0.1:${port}"
  LOCAL_URL="$url"
  for _ in $(seq 1 90); do
    if curl --fail --silent --show-error "$url/healthz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  compose ps
  compose logs --tail=200 api proxy postgres >&2 || true
  fail "The local stack did not become ready at $url."
}

bootstrap() {
  require_docker
  require_command curl
  ensure_layout
  write_env
  info "Building the local release images."
  compose build --pull
  info "Starting PostgreSQL, migrations, seed, API, dashboard, edge spool, and proxy."
  compose up -d --remove-orphans
  wait_ready
  smoke
  info "PTC Bale local deployment is ready at $LOCAL_URL"
}

start() {
  require_docker
  compose up -d --remove-orphans
  wait_ready
  info "Local deployment is running at $LOCAL_URL"
}

stop() {
  require_docker
  compose stop
}

restart_stack() {
  require_docker
  compose restart postgres api dashboard edge-spool proxy
  wait_ready
  smoke
}

status() {
  require_docker
  compose ps
  local port
  port="$(load_env_value LOCAL_HTTP_PORT)"
  curl --fail --silent "http://127.0.0.1:${port}/healthz" >/dev/null && info "Proxy health: OK" || info "Proxy health: unavailable"
}

logs() {
  require_docker
  compose logs --tail=250 -f "${@:2}"
}

smoke() {
  require_command curl
  local port url password cookie body
  port="$(load_env_value LOCAL_HTTP_PORT)"
  url="http://127.0.0.1:${port}"
  password="$(load_env_value SEED_VIEWER_PASSWORD)"
  cookie="$(mktemp)"
  trap 'rm -f "$cookie"' RETURN
  curl --fail --silent --show-error "$url/healthz" >/dev/null
  body="$(printf '{"username":"viewer","password":"%s"}' "$password")"
  curl --fail --silent --show-error -c "$cookie" -H 'Content-Type: application/json' -H "Origin: $url" -d "$body" "$url/api/auth/login" >/dev/null
  curl --fail --silent --show-error -b "$cookie" "$url/api/auth/me" | grep -q 'viewer'
  curl --fail --silent --show-error -b "$cookie" "$url/api/cameras" | grep -q 'CAM-01'
  curl --fail --silent --show-error -b "$cookie" "$url/api/reports/summary" | grep -q 'generatedAt'
  rm -f "$cookie"
  trap - RETURN
  info "Authenticated local smoke test passed."
}

backup() {
  require_docker
  local stamp dump checksum evidence
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  dump="ptc-bale-${stamp}.dump"
  evidence="ptc-bale-evidence-${stamp}.tar.gz"
  compose --profile tools run --rm backup-tools pg_dump --format=custom --file="/backups/$dump"
  compose --profile tools run --rm archive-tools sh -c "tar -C /evidence -czf /backups/$evidence ."
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$DATA_ROOT/backups" && sha256sum "$dump" "$evidence" >"ptc-bale-${stamp}.sha256")
  else
    (cd "$DATA_ROOT/backups" && shasum -a 256 "$dump" "$evidence" >"ptc-bale-${stamp}.sha256")
  fi
  info "Backup completed in $DATA_ROOT/backups"
}

restore() {
  require_docker
  local dump="${2:-}" confirmation="${3:-}"
  [[ -n "$dump" ]] || fail "Usage: $0 restore /absolute/path/file.dump --confirm"
  [[ "$confirmation" == "--confirm" ]] || fail "Restore is destructive. Re-run with --confirm."
  [[ -f "$dump" ]] || fail "Backup file not found: $dump"
  backup
  compose stop edge-spool api
  docker cp "$dump" "$(compose ps -q postgres):/tmp/restore.dump"
  compose exec -T postgres sh -c 'pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/restore.dump'
  compose exec -T postgres rm -f /tmp/restore.dump
  compose up -d api edge-spool proxy
  wait_ready
  smoke
  info "Database restore completed and verified."
}

set_env_value() {
  local key="$1" value="$2" temporary
  temporary="$(mktemp)"
  awk -v key="$key" -v value="$value" 'BEGIN{found=0} $0 ~ "^" key "=" {print key "=" value; found=1; next} {print} END{if(!found) print key "=" value}' "$ENV_FILE" >"$temporary"
  chmod 600 "$temporary" 2>/dev/null || true
  mv "$temporary" "$ENV_FILE"
}

rotate_secrets() {
  require_docker
  backup
  set_env_value SEED_VIEWER_PASSWORD "$(random_hex 16)"
  set_env_value SEED_SUPERVISOR_PASSWORD "$(random_hex 16)"
  set_env_value SEED_ADMIN_PASSWORD "$(random_hex 16)"
  set_env_value INGESTION_SERVICE_TOKEN "$(random_hex 32)"
  compose run --rm seed
  compose up -d --force-recreate api edge-spool
  wait_ready
  info "Application credentials and ingestion token rotated. New values remain only in $ENV_FILE"
}

set_mode() {
  local mode="${2:-}"
  [[ "$mode" == "simulator" || "$mode" == "hardware-ready" ]] || fail "Mode must be simulator or hardware-ready."
  set_env_value PTC_RUNTIME_MODE "$mode"
  compose up -d --force-recreate edge-spool
  info "Runtime mode changed to $mode"
}

upgrade() {
  require_docker
  backup
  local commit tag
  commit="$(repo_commit)"
  tag="local-${commit:0:12}"
  set_env_value BUILD_COMMIT "$commit"
  set_env_value BUILD_VERSION "$tag"
  set_env_value IMAGE_TAG "$tag"
  compose build
  compose up -d --remove-orphans
  wait_ready
  smoke
  info "Upgrade completed at commit $commit"
}

lan_enable() {
  local ip="${2:-}"
  [[ "$ip" =~ ^[0-9a-fA-F:.]+$ ]] || fail "Provide the workstation's trusted private IP."
  local port
  port="$(load_env_value LOCAL_HTTP_PORT)"
  set_env_value LOCAL_BIND_ADDRESS 0.0.0.0
  set_env_value ALLOWED_ORIGINS "http://localhost:${port},http://127.0.0.1:${port},http://${ip}:${port}"
  compose up -d --force-recreate api proxy
  info "LAN mode enabled at http://${ip}:${port}. Configure the host firewall for trusted clients only."
}

lan_disable() {
  local port
  port="$(load_env_value LOCAL_HTTP_PORT)"
  set_env_value LOCAL_BIND_ADDRESS 127.0.0.1
  set_env_value ALLOWED_ORIGINS "http://localhost:${port},http://127.0.0.1:${port}"
  compose up -d --force-recreate api proxy
  info "Workstation-only binding restored."
}

uninstall_stack() {
  require_docker
  local option="${2:-}"
  compose down --remove-orphans
  if [[ "$option" == "--delete-data" ]]; then
    [[ "${3:-}" == "--confirm" ]] || fail "Data deletion requires --delete-data --confirm."
    rm -rf "$DATA_ROOT"
    info "Application and local data removed."
  else
    info "Application stopped and containers removed. Data retained at $DATA_ROOT"
  fi
}

usage() {
  cat <<EOF
Usage: $0 <command>

Commands:
  bootstrap                  Generate protected config, build, start, and verify
  start | stop | restart
  status | logs [service] | smoke
  backup
  restore <dump> --confirm
  rotate-secrets
  mode simulator|hardware-ready
  upgrade
  lan-enable <private-ip> | lan-disable
  uninstall [--delete-data --confirm]
EOF
}

command="${1:-}"
case "$command" in
  bootstrap) bootstrap ;;
  start) start ;;
  stop) stop ;;
  restart) restart_stack ;;
  status) status ;;
  logs) logs "$@" ;;
  smoke) smoke ;;
  backup) backup ;;
  restore) restore "$@" ;;
  rotate-secrets) rotate_secrets ;;
  mode) set_mode "$@" ;;
  upgrade) upgrade ;;
  lan-enable) lan_enable "$@" ;;
  lan-disable) lan_disable ;;
  uninstall) uninstall_stack "$@" ;;
  *) usage; [[ -z "$command" ]] || exit 2 ;;
esac
