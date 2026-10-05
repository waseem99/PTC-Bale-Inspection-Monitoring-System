#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${PTC_ROOT_DIR:-/opt/ptc-bale}"
CURRENT_DIR="${PTC_CURRENT_DIR:-$(readlink -f "${ROOT_DIR}/current" 2>/dev/null || pwd)}"
ENV_FILE="${ENV_FILE:-${CURRENT_DIR}/.env}"
POSTGRES_CLIENT_IMAGE="${POSTGRES_CLIENT_IMAGE:-postgres:16}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL is required}"

case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *) echo "DATABASE_URL must be a PostgreSQL URL." >&2; exit 1 ;;
esac

# Prisma commonly carries ?schema=public, which libpq tools do not understand.
PG_DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/\?&/?/; s/[?&]$//')"
REDACTED_URL="$(printf '%s' "$PG_DATABASE_URL" | sed -E 's#(postgres(ql)?://)[^@]+@#\1***@#')"

echo "Option A database endpoint: $REDACTED_URL"

if printf '%s' "$PG_DATABASE_URL" | grep -Eq '@(localhost|127\.0\.0\.1|postgres)(:|/)'; then
  echo "FAIL: Option A requires a PostgreSQL endpoint outside the application host/local Docker service." >&2
  exit 1
fi

command -v docker >/dev/null 2>&1 || { echo "docker is required for the repository-supplied PostgreSQL client." >&2; exit 1; }

docker run --rm \
  -e PG_DATABASE_URL="$PG_DATABASE_URL" \
  "$POSTGRES_CLIENT_IMAGE" \
  sh -ec 'pg_isready --dbname="$PG_DATABASE_URL" >/dev/null'

docker run --rm \
  -e PG_DATABASE_URL="$PG_DATABASE_URL" \
  "$POSTGRES_CLIENT_IMAGE" \
  sh -ec 'psql "$PG_DATABASE_URL" -v ON_ERROR_STOP=1 -Atqc "SELECT 1"' \
  | grep -qx '1'

if [[ -n "${EVIDENCE_ROOT:-}" ]]; then
  case "$EVIDENCE_ROOT" in
    /var/www/*|*/public/*)
      echo "FAIL: EVIDENCE_ROOT must not be inside a public web path." >&2
      exit 1
      ;;
  esac
  echo "Evidence root configured outside public web path."
else
  echo "WARN: EVIDENCE_ROOT is not set in this shell/environment." >&2
fi

echo "PASS: remote PostgreSQL connectivity preflight succeeded."
