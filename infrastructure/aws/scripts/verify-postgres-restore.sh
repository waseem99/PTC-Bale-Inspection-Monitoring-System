#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: CONFIRM_DISPOSABLE_RESTORE=YES RESTORE_DATABASE_URL=postgresql://... $0 <s3://bucket/backups/file.dump|local-file.dump>" >&2
  exit 64
fi

if [[ "${CONFIRM_DISPOSABLE_RESTORE:-}" != "YES" ]]; then
  echo "Set CONFIRM_DISPOSABLE_RESTORE=YES to acknowledge the restore target is disposable/non-production." >&2
  exit 1
fi

SOURCE="$1"
ROOT_DIR="${PTC_ROOT_DIR:-/opt/ptc-bale}"
CURRENT_DIR="${PTC_CURRENT_DIR:-$(readlink -f "${ROOT_DIR}/current" 2>/dev/null || pwd)}"
ENV_FILE="${ENV_FILE:-${CURRENT_DIR}/.env}"
RESTORE_DIR="${RESTORE_DIR:-${ROOT_DIR}/restore-option-a}"
POSTGRES_CLIENT_IMAGE="${POSTGRES_CLIENT_IMAGE:-postgres:16}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required and must point to a disposable/non-production PostgreSQL target}"

PG_RESTORE_URL="$(printf '%s' "$RESTORE_DATABASE_URL" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/\?&/?/; s/[?&]$//')"
PG_PRIMARY_URL="$(printf '%s' "${DATABASE_URL:-}" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/\?&/?/; s/[?&]$//')"

if [[ -n "$PG_PRIMARY_URL" && "$PG_RESTORE_URL" == "$PG_PRIMARY_URL" ]]; then
  echo "REFUSED: RESTORE_DATABASE_URL matches DATABASE_URL. Isolated verification must never overwrite the active DB." >&2
  exit 1
fi

command -v docker >/dev/null 2>&1 || { echo "docker is required." >&2; exit 1; }
mkdir -p "$RESTORE_DIR"
chmod 700 "$RESTORE_DIR"

if [[ "$SOURCE" == s3://* ]]; then
  : "${AWS_REGION:?AWS_REGION is required for S3 restore verification}"
  command -v aws >/dev/null 2>&1 || { echo "aws CLI is required for S3 restore verification." >&2; exit 1; }
  LOCAL_FILE="${RESTORE_DIR}/$(basename "$SOURCE")"
  CHECKSUM_FILE="${LOCAL_FILE}.sha256"
  aws s3 cp --region "$AWS_REGION" "$SOURCE" "$LOCAL_FILE" --only-show-errors
  if aws s3 cp --region "$AWS_REGION" "${SOURCE}.sha256" "$CHECKSUM_FILE" --only-show-errors 2>/dev/null; then
    EXPECTED_SHA="$(awk 'NR==1 {print $1}' "$CHECKSUM_FILE")"
    ACTUAL_SHA="$(sha256sum "$LOCAL_FILE" | awk '{print $1}')"
    [[ "$EXPECTED_SHA" == "$ACTUAL_SHA" ]] || { echo "Backup checksum mismatch." >&2; exit 1; }
    echo "Backup checksum verified."
  else
    echo "WARN: companion checksum object not found; restore may proceed only as an execution test." >&2
  fi
else
  LOCAL_FILE="$(readlink -f "$SOURCE")"
  if [[ -f "${LOCAL_FILE}.sha256" ]]; then
    EXPECTED_SHA="$(awk 'NR==1 {print $1}' "${LOCAL_FILE}.sha256")"
    ACTUAL_SHA="$(sha256sum "$LOCAL_FILE" | awk '{print $1}')"
    [[ "$EXPECTED_SHA" == "$ACTUAL_SHA" ]] || { echo "Backup checksum mismatch." >&2; exit 1; }
    echo "Backup checksum verified."
  fi
fi

[[ -s "$LOCAL_FILE" ]] || { echo "Restore file is missing or empty: $LOCAL_FILE" >&2; exit 1; }

docker run --rm -i "$POSTGRES_CLIENT_IMAGE" pg_restore --list < "$LOCAL_FILE" >/dev/null

docker run --rm -i \
  -e PG_RESTORE_URL="$PG_RESTORE_URL" \
  "$POSTGRES_CLIENT_IMAGE" \
  sh -ec 'pg_restore --dbname="$PG_RESTORE_URL" --clean --if-exists --no-owner --no-privileges --exit-on-error' \
  < "$LOCAL_FILE"

docker run --rm \
  -e PG_RESTORE_URL="$PG_RESTORE_URL" \
  "$POSTGRES_CLIENT_IMAGE" \
  sh -ec 'psql "$PG_RESTORE_URL" -v ON_ERROR_STOP=1 -Atqc "SELECT COUNT(*) FROM \"_prisma_migrations\""' \
  | grep -Eq '^[1-9][0-9]*$'

REDACTED_URL="$(printf '%s' "$PG_RESTORE_URL" | sed -E 's#(postgres(ql)?://)[^@]+@#\1***@#')"
echo "PASS: isolated PostgreSQL restore completed and Prisma migration history is present."
echo "Restore target: $REDACTED_URL"
echo "Next: point a non-production API instance at RESTORE_DATABASE_URL and run the application smoke checks from docs/44-database-resilience-option-a.md."
