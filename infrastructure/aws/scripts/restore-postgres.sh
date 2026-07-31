#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: CONFIRM_PTC_RESTORE=YES $0 <s3://bucket/backups/file.dump|local-file.dump>" >&2
  exit 64
fi

if [[ "${CONFIRM_PTC_RESTORE:-}" != "YES" ]]; then
  echo "Set CONFIRM_PTC_RESTORE=YES to acknowledge that this replaces the staging database." >&2
  exit 1
fi

SOURCE="$1"
ROOT_DIR="/opt/ptc-bale"
CURRENT_DIR="$(readlink -f "${ROOT_DIR}/current")"
ENV_FILE="${CURRENT_DIR}/.env"
RESTORE_DIR="${ROOT_DIR}/restore"
mkdir -p "$RESTORE_DIR"
chmod 700 "$RESTORE_DIR"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${AWS_REGION:?AWS_REGION is required}"

if [[ "$SOURCE" == s3://* ]]; then
  LOCAL_FILE="${RESTORE_DIR}/$(basename "$SOURCE")"
  aws s3 cp --region "$AWS_REGION" "$SOURCE" "$LOCAL_FILE" --only-show-errors
else
  LOCAL_FILE="$(readlink -f "$SOURCE")"
fi

[[ -s "$LOCAL_FILE" ]] || { echo "Restore file is missing or empty: $LOCAL_FILE" >&2; exit 1; }
"${CURRENT_DIR}/scripts/backup-postgres.sh" pre-restore

cd "$CURRENT_DIR"
docker compose -f docker-compose.staging.yml stop api
docker compose -f docker-compose.staging.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges < "$LOCAL_FILE"
docker compose -f docker-compose.staging.yml up -d api

for attempt in {1..40}; do
  HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' ptc-bale-staging-api-1 2>/dev/null || true)"
  [[ "$HEALTH" == "healthy" ]] && break
  [[ "$attempt" -eq 40 ]] && { echo "API did not recover after restore." >&2; exit 1; }
  sleep 3
done

echo "Restore completed from $SOURCE"
