#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DASHBOARD_DIR="$ROOT_DIR/apps/dashboard-web"
RUN_ROOT="$ROOT_DIR/runtime/browser-certification"

CLI_URL=""
CLI_EVENT_ID=""
ENV_FILE=""
SKIP_INSTALL=0
SKIP_BROWSER_INSTALL=0
WITH_SYSTEM_DEPS=0
RUN_DIR=""
RUN_ARCHIVE=""
RESULT="NOT_RUN"
STARTED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

usage() {
  cat <<'USAGE'
PTC Codistan browser certification

Usage:
  pnpm certify:codistan-browser -- --url https://ptc.example.com [options]
  pnpm certify:codistan-browser -- --env-file /secure/ptc-browser-cert.env [options]

Options:
  --url URL                 Deployed Codistan/UAT base URL. Overrides PLAYWRIGHT_BASE_URL.
  --event-id ID             Controlled staging event for persistence testing.
  --env-file PATH           Trusted shell env file containing URL/credentials.
  --skip-install            Skip pnpm install --frozen-lockfile.
  --skip-browser-install    Skip Playwright Chromium/Firefox browser install.
  --with-system-deps        Install Playwright OS dependencies too (may require sudo/root).
  -h, --help                Show this help.

Required credentials:
  E2E_PASSWORD for one shared seeded password, OR all of:
  E2E_VIEWER_PASSWORD, E2E_SUPERVISOR_PASSWORD, E2E_ADMIN_PASSWORD.

Optional username overrides:
  E2E_VIEWER_USERNAME, E2E_SUPERVISOR_USERNAME, E2E_ADMIN_USERNAME.
USAGE
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      [[ $# -ge 2 ]] || fail "--url requires a value."
      CLI_URL="$2"
      shift 2
      ;;
    --event-id)
      [[ $# -ge 2 ]] || fail "--event-id requires a value."
      CLI_EVENT_ID="$2"
      shift 2
      ;;
    --env-file)
      [[ $# -ge 2 ]] || fail "--env-file requires a value."
      ENV_FILE="$2"
      shift 2
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --skip-browser-install)
      SKIP_BROWSER_INSTALL=1
      shift
      ;;
    --with-system-deps)
      WITH_SYSTEM_DEPS=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

if [[ -n "$ENV_FILE" ]]; then
  [[ -f "$ENV_FILE" ]] || fail "Environment file not found: $ENV_FILE"
  # The file is intentionally sourced so quoted/special-character passwords work.
  # It must therefore be a trusted local file and must never be committed.
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

TARGET_URL="${CLI_URL:-${PLAYWRIGHT_BASE_URL:-}}"
EVENT_ID="${CLI_EVENT_ID:-${E2E_EVENT_ID:-EVT-2407-0253}}"
TARGET_URL="${TARGET_URL%/}"

[[ -n "$TARGET_URL" ]] || fail "Set --url, PLAYWRIGHT_BASE_URL, or provide it through --env-file."
case "$TARGET_URL" in
  http://*|https://*) ;;
  *) fail "Target URL must start with http:// or https://." ;;
esac

if [[ -z "${E2E_PASSWORD:-}" ]]; then
  [[ -n "${E2E_VIEWER_PASSWORD:-}" ]] || fail "Missing E2E_VIEWER_PASSWORD (or shared E2E_PASSWORD)."
  [[ -n "${E2E_SUPERVISOR_PASSWORD:-}" ]] || fail "Missing E2E_SUPERVISOR_PASSWORD (or shared E2E_PASSWORD)."
  [[ -n "${E2E_ADMIN_PASSWORD:-}" ]] || fail "Missing E2E_ADMIN_PASSWORD (or shared E2E_PASSWORD)."
fi

for command_name in git node pnpm curl tar sha256sum; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Required command is not installed: $command_name"
done

node -e "const major=Number(process.versions.node.split('.')[0]); if (major < 20) process.exit(1)" \
  || fail "Node.js 20 or newer is required."

[[ -d "$DASHBOARD_DIR" ]] || fail "Dashboard directory is missing: $DASHBOARD_DIR"
[[ -s "$ROOT_DIR/pnpm-lock.yaml" ]] || fail "Committed pnpm-lock.yaml is missing or empty."

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  fail "Repository working tree is not clean. Certification requires an exact Git SHA."
fi

SUITE_SHA="$(git rev-parse HEAD)"
SUITE_SHORT_SHA="$(git rev-parse --short=12 HEAD)"
SUITE_BRANCH="$(git branch --show-current || true)"
RUN_STAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
RUN_NAME="${RUN_STAMP}-${SUITE_SHORT_SHA}"
RUN_DIR="$RUN_ROOT/$RUN_NAME"
RUN_ARCHIVE="$RUN_ROOT/${RUN_NAME}.tar.gz"
mkdir -p "$RUN_DIR"

finalize() {
  local exit_code="$1"
  trap - EXIT
  set +e

  if [[ "$exit_code" -eq 0 ]]; then
    RESULT="PASS"
  else
    RESULT="FAIL"
  fi

  local finished_at
  finished_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

  if [[ -d "$DASHBOARD_DIR/playwright-report" ]]; then
    rm -rf "$RUN_DIR/playwright-report"
    cp -a "$DASHBOARD_DIR/playwright-report" "$RUN_DIR/playwright-report"
  fi
  if [[ -d "$DASHBOARD_DIR/test-results" ]]; then
    rm -rf "$RUN_DIR/test-results"
    cp -a "$DASHBOARD_DIR/test-results" "$RUN_DIR/test-results"
  fi

  cat > "$RUN_DIR/certification.txt" <<META
PTC Codistan Browser Certification
result=$RESULT
exit_code=$exit_code
started_at_utc=$STARTED_AT
finished_at_utc=$finished_at
suite_commit=$SUITE_SHA
suite_branch=${SUITE_BRANCH:-detached}
target_url=$TARGET_URL
event_id=$EVENT_ID
browser_matrix=chromium-1366x768,firefox-1920x1080
node_version=$(node --version 2>/dev/null || true)
pnpm_version=$(pnpm --version 2>/dev/null || true)
META

  (
    cd "$RUN_DIR" || exit 0
    find . -type f ! -name 'manifest.sha256' -print0 \
      | sort -z \
      | xargs -0 -r sha256sum > manifest.sha256
  )

  rm -f "$RUN_ARCHIVE" "$RUN_ARCHIVE.sha256"
  tar -czf "$RUN_ARCHIVE" -C "$RUN_ROOT" "$RUN_NAME"
  (
    cd "$RUN_ROOT" || exit 0
    sha256sum "$(basename "$RUN_ARCHIVE")" > "$(basename "$RUN_ARCHIVE").sha256"
  )

  echo
  echo "Certification result: $RESULT"
  echo "Suite commit: $SUITE_SHA"
  echo "Target: $TARGET_URL"
  echo "Evidence directory: $RUN_DIR"
  echo "Evidence archive: $RUN_ARCHIVE"
  echo "Archive checksum: $RUN_ARCHIVE.sha256"

  exit "$exit_code"
}
trap 'finalize $?' EXIT

cat > "$RUN_DIR/certification-start.txt" <<META
started_at_utc=$STARTED_AT
suite_commit=$SUITE_SHA
suite_branch=${SUITE_BRANCH:-detached}
target_url=$TARGET_URL
event_id=$EVENT_ID
META

echo "PTC Codistan browser certification"
echo "Suite commit: $SUITE_SHA"
echo "Target: $TARGET_URL"
echo "Controlled event: $EVENT_ID"
echo "Evidence: $RUN_DIR"

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "[1/4] Installing repository dependencies from committed lockfile..."
  pnpm install --frozen-lockfile 2>&1 | tee "$RUN_DIR/dependency-install.log"
else
  echo "[1/4] Dependency install skipped by request."
fi

if [[ "$SKIP_BROWSER_INSTALL" -eq 0 ]]; then
  echo "[2/4] Ensuring Chromium and Firefox are installed..."
  (
    cd "$DASHBOARD_DIR"
    if [[ "$WITH_SYSTEM_DEPS" -eq 1 ]]; then
      pnpm exec playwright install --with-deps chromium firefox
    else
      pnpm exec playwright install chromium firefox
    fi
  ) 2>&1 | tee "$RUN_DIR/playwright-install.log"
else
  echo "[2/4] Playwright browser install skipped by request."
fi

echo "[3/4] Verifying deployed API/PostgreSQL readiness..."
READINESS_FILE="$RUN_DIR/readiness.json"
curl --fail --silent --show-error --max-time 20 "$TARGET_URL/readyz" > "$READINESS_FILE"
node - "$READINESS_FILE" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const payload = JSON.parse(fs.readFileSync(path, 'utf8'));
if (payload?.status !== 'ready' || payload?.database !== 'connected') {
  console.error('Readiness response is not acceptable:', JSON.stringify(payload));
  process.exit(1);
}
NODE

echo "[4/4] Running real deployed Playwright acceptance in Chromium + Firefox..."
rm -rf "$DASHBOARD_DIR/playwright-report" "$DASHBOARD_DIR/test-results"

export PLAYWRIGHT_BASE_URL="$TARGET_URL"
export E2E_EVENT_ID="$EVENT_ID"
export CI=true

(
  cd "$DASHBOARD_DIR"
  pnpm test:e2e:acceptance
) 2>&1 | tee "$RUN_DIR/playwright-acceptance.log"
