#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <runtime.env> <aws-region> [parameter-name]" >&2
  exit 64
fi

ENV_FILE="$1"
AWS_REGION="$2"
PARAMETER_NAME="${3:-/ptc-bale/staging/runtime-env-b64}"

[[ -s "$ENV_FILE" ]] || { echo "Environment file is missing or empty: $ENV_FILE" >&2; exit 1; }

for required in DATABASE_URL INGESTION_SERVICE_TOKEN COOKIE_SECURE SIMULATOR_ENABLED; do
  grep -q "^${required}=" "$ENV_FILE" || { echo "Missing required runtime setting: ${required}" >&2; exit 1; }
done

grep -q '^COOKIE_SECURE=true$' "$ENV_FILE" || { echo "COOKIE_SECURE must be true for staging." >&2; exit 1; }
grep -q '^SIMULATOR_ENABLED=false$' "$ENV_FILE" || { echo "SIMULATOR_ENABLED must be false for staging." >&2; exit 1; }

ENCODED="$(python3 - "$ENV_FILE" <<'PY'
import base64
import pathlib
import sys
print(base64.b64encode(pathlib.Path(sys.argv[1]).read_bytes()).decode('ascii'))
PY
)"

if (( ${#ENCODED} > 4096 )); then
  echo "Encoded environment exceeds the 4 KB standard Parameter Store limit." >&2
  exit 1
fi

aws ssm put-parameter \
  --region "$AWS_REGION" \
  --name "$PARAMETER_NAME" \
  --description "PTC Bale staging runtime environment encoded as base64" \
  --type SecureString \
  --tier Standard \
  --value "$ENCODED" \
  --overwrite >/dev/null

unset ENCODED
echo "Updated secure runtime parameter: $PARAMETER_NAME"
