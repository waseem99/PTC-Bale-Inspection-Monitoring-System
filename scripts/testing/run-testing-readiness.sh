#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="${PTC_TEST_OUTPUT_DIR:-$REPO_ROOT/build/testing-readiness}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

mkdir -p "$OUTPUT_DIR"
cd "$REPO_ROOT"

"$PYTHON_BIN" -m unittest discover -s tools/testing/tests -v
"$PYTHON_BIN" tools/testing/ptc_acceptance.py offline --output "$OUTPUT_DIR/offline"

if [[ -n "${PTC_BASE_URL:-}" ]]; then
  "$PYTHON_BIN" tools/testing/ptc_acceptance.py deployment --output "$OUTPUT_DIR/deployment-record.json"
fi

if [[ -n "${PTC_BASE_URL:-}" && -n "${INGESTION_SERVICE_TOKEN:-}" && -n "${SEED_VIEWER_PASSWORD:-}" && -n "${SEED_SUPERVISOR_PASSWORD:-}" ]]; then
  "$PYTHON_BIN" tools/testing/ptc_acceptance.py integrated --output "$OUTPUT_DIR/integrated-record.json"
fi

printf 'Testing-readiness outputs: %s\n' "$OUTPUT_DIR"
