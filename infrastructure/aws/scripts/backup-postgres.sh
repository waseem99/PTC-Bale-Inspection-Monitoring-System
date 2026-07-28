#!/usr/bin/env bash
set -Eeuo pipefail

LABEL="${1:-manual}"
ROOT_DIR="/opt/ptc-bale"
CURRENT_DIR="$(readlink -f "${ROOT_DIR}/current")"
ENV_FILE="${CURRENT_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Runtime environment not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${ARTIFACT_BUCKET:?ARTIFACT_BUCKET is required}"
: "${AWS_REGION:?AWS_REGION is required}"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SAFE_LABEL="$(printf '%s' "$LABEL" | tr -cs 'A-Za-z0-9._-' '-')"
BACKUP_DIR="${ROOT_DIR}/backups"
BACKUP_FILE="${BACKUP_DIR}/ptc-bale-${SAFE_LABEL}-${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

cd "$CURRENT_DIR"
docker compose -f docker-compose.staging.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]]; then
  echo "Backup file is empty: $BACKUP_FILE" >&2
  exit 1
fi

sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"
aws s3 cp --region "$AWS_REGION" "$BACKUP_FILE" "s3://${ARTIFACT_BUCKET}/backups/$(basename "$BACKUP_FILE")" --only-show-errors
aws s3 cp --region "$AWS_REGION" "${BACKUP_FILE}.sha256" "s3://${ARTIFACT_BUCKET}/backups/$(basename "${BACKUP_FILE}.sha256")" --only-show-errors

find "$BACKUP_DIR" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "Backup uploaded: s3://${ARTIFACT_BUCKET}/backups/$(basename "$BACKUP_FILE")"
