#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: $0 <image-tag> <artifact-bucket> <aws-region> <runtime-parameter-name>" >&2
  exit 64
fi

IMAGE_TAG="$1"
ARTIFACT_BUCKET="$2"
AWS_REGION="$3"
RUNTIME_PARAMETER_NAME="$4"
ROOT_DIR="/opt/ptc-bale"
RELEASE_DIR="${ROOT_DIR}/releases/${IMAGE_TAG}"
SHARED_DIR="${ROOT_DIR}/shared"
CURRENT_LINK="${ROOT_DIR}/current"
PREVIOUS_RELEASE=""

if [[ ! -d "$RELEASE_DIR" ]]; then
  echo "Release directory does not exist: $RELEASE_DIR" >&2
  exit 1
fi

if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" || true)"
fi

rollback() {
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    return
  fi
  echo "Deployment failed with status ${exit_code}."
  if [[ -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
    echo "Attempting application rollback to ${PREVIOUS_RELEASE}. Database migrations are not automatically reversed."
    ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    cd "$PREVIOUS_RELEASE"
    docker compose -f docker-compose.staging.yml up -d postgres api dashboard caddy || true
  fi
  exit "$exit_code"
}
trap rollback EXIT

mkdir -p "$SHARED_DIR" "${ROOT_DIR}/backups"
chmod 700 "$SHARED_DIR" "${ROOT_DIR}/backups"

aws ssm get-parameter \
  --region "$AWS_REGION" \
  --name "$RUNTIME_PARAMETER_NAME" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text | base64 --decode > "${SHARED_DIR}/runtime.env.new"

if [[ ! -s "${SHARED_DIR}/runtime.env.new" ]]; then
  echo "The decoded runtime environment file is empty." >&2
  exit 1
fi

chmod 600 "${SHARED_DIR}/runtime.env.new"
mv "${SHARED_DIR}/runtime.env.new" "${SHARED_DIR}/runtime.env"
cp "${SHARED_DIR}/runtime.env" "${RELEASE_DIR}/.env"
cat >> "${RELEASE_DIR}/.env" <<ENVEOF
IMAGE_TAG=${IMAGE_TAG}
ARTIFACT_BUCKET=${ARTIFACT_BUCKET}
AWS_REGION=${AWS_REGION}
RUNTIME_PARAMETER_NAME=${RUNTIME_PARAMETER_NAME}
ENVEOF
chmod 600 "${RELEASE_DIR}/.env"

cd "$RELEASE_DIR"
docker load < images.tar.gz

docker compose -f docker-compose.staging.yml config --quiet
docker compose -f docker-compose.staging.yml up -d postgres

for attempt in {1..60}; do
  if docker compose -f docker-compose.staging.yml exec -T postgres \
    pg_isready -U "$(grep '^POSTGRES_USER=' .env | cut -d= -f2-)" \
    -d "$(grep '^POSTGRES_DB=' .env | cut -d= -f2-)" >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" -eq 60 ]]; then
    echo "PostgreSQL did not become ready." >&2
    docker compose -f docker-compose.staging.yml logs postgres
    exit 1
  fi
  sleep 2
done

if [[ -f "${SHARED_DIR}/seeded" && -n "$PREVIOUS_RELEASE" ]]; then
  "${RELEASE_DIR}/scripts/backup-postgres.sh" "predeploy-${IMAGE_TAG}"
fi

docker compose -f docker-compose.staging.yml --profile tools run --rm tools \
  pnpm --filter @ptc-bale/platform-api db:migrate:deploy

SEED_ON_FIRST_DEPLOY="$(grep '^SEED_ON_FIRST_DEPLOY=' .env | tail -1 | cut -d= -f2- || true)"
if [[ ! -f "${SHARED_DIR}/seeded" && "$SEED_ON_FIRST_DEPLOY" == "true" ]]; then
  docker compose -f docker-compose.staging.yml --profile tools run --rm tools \
    pnpm --filter @ptc-bale/platform-api seed
  date -u +%FT%TZ > "${SHARED_DIR}/seeded"
fi

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
docker compose -f docker-compose.staging.yml up -d api dashboard caddy

for attempt in {1..60}; do
  API_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' ptc-bale-staging-api-1 2>/dev/null || true)"
  DASHBOARD_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' ptc-bale-staging-dashboard-1 2>/dev/null || true)"
  if [[ "$API_HEALTH" == "healthy" && "$DASHBOARD_HEALTH" == "healthy" ]]; then
    break
  fi
  if [[ "$attempt" -eq 60 ]]; then
    echo "Application containers did not become healthy." >&2
    docker compose -f docker-compose.staging.yml ps
    docker compose -f docker-compose.staging.yml logs --tail=200 api dashboard caddy
    exit 1
  fi
  sleep 3
done

cat > /etc/systemd/system/ptc-bale-backup.service <<'UNIT'
[Unit]
Description=PTC Bale PostgreSQL backup
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
ExecStart=/opt/ptc-bale/current/scripts/backup-postgres.sh scheduled
UNIT

cat > /etc/systemd/system/ptc-bale-backup.timer <<'UNIT'
[Unit]
Description=Daily PTC Bale PostgreSQL backup

[Timer]
OnCalendar=*-*-* 02:15:00 UTC
Persistent=true
RandomizedDelaySec=900

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now ptc-bale-backup.timer

find "${ROOT_DIR}/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr \
  | tail -n +4 \
  | cut -d' ' -f2- \
  | xargs -r rm -rf

docker image prune -f >/dev/null

echo "Deployment ${IMAGE_TAG} completed."
docker compose -f docker-compose.staging.yml ps
trap - EXIT
