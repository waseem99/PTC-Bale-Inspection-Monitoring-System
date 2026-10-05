#!/usr/bin/env bash
set -Eeuo pipefail

LABEL="${1:-manual}"
ROOT_DIR="${PTC_ROOT_DIR:-/opt/ptc-bale}"
CURRENT_DIR="${PTC_CURRENT_DIR:-$(readlink -f "${ROOT_DIR}/current" 2>/dev/null || pwd)}"
ENV_FILE="${ENV_FILE:-${CURRENT_DIR}/.env}"
POSTGRES_CLIENT_IMAGE="${POSTGRES_CLIENT_IMAGE:-postgres:16}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${ARTIFACT_BUCKET:?ARTIFACT_BUCKET is required for off-host backup evidence}"
: "${AWS_REGION:?AWS_REGION is required}"

PG_DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/\?&/?/; s/[?&]$//')"

if printf '%s' "$PG_DATABASE_URL" | grep -Eq '@(localhost|127\.0\.0\.1|postgres)(:|/)'; then
  echo "Refusing Option A remote backup: DATABASE_URL still targets a local/same-host PostgreSQL endpoint." >&2
  exit 1
fi

command -v docker >/dev/null 2>&1 || { echo "docker is required." >&2; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "aws CLI is required for the approved off-host backup destination." >&2; exit 1; }

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SAFE_LABEL="$(printf '%s' "$LABEL" | tr -cs 'A-Za-z0-9._-' '-')"
BACKUP_FILE="${BACKUP_DIR}/ptc-bale-remote-${SAFE_LABEL}-${TIMESTAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

docker run --rm \
  -e PG_DATABASE_URL="$PG_DATABASE_URL" \
  "$POSTGRES_CLIENT_IMAGE" \
  sh -ec 'pg_dump --dbname="$PG_DATABASE_URL" --format=custom --no-owner --no-privileges' \
  > "$BACKUP_FILE"

[[ -s "$BACKUP_FILE" ]] || { echo "Backup file is empty: $BACKUP_FILE" >&2; exit 1; }

docker run --rm -i "$POSTGRES_CLIENT_IMAGE" pg_restore --list < "$BACKUP_FILE" >/dev/null

sha256sum "$BACKUP_FILE" > "$CHECKSUM_FILE"
aws s3 cp --region "$AWS_REGION" "$BACKUP_FILE" "s3://${ARTIFACT_BUCKET}/backups/$(basename "$BACKUP_FILE")" --only-show-errors
aws s3 cp --region "$AWS_REGION" "$CHECKSUM_FILE" "s3://${ARTIFACT_BUCKET}/backups/$(basename "$CHECKSUM_FILE")" --only-show-errors

find "$BACKUP_DIR" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "PASS: remote PostgreSQL backup created, structurally verified, checksummed and uploaded."
echo "Backup object: s3://${ARTIFACT_BUCKET}/backups/$(basename "$BACKUP_FILE")"
echo "Checksum object: s3://${ARTIFACT_BUCKET}/backups/$(basename "$CHECKSUM_FILE")"
