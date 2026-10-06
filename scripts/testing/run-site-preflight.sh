#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="${PTC_SITE_MANIFEST:-${ROOT_DIR}/tools/testing/site-camera-manifest.template.json}"
ROI_CONFIG="${PTC_ROI_CONFIG:-${ROOT_DIR}/services/ai-inference/config/ptc.camera-roi.template.json}"
OUTPUT="${PTC_SITE_PREFLIGHT_OUTPUT:-${ROOT_DIR}/build/site-preflight/site-preflight.json}"

ARGS=(
  --manifest "$MANIFEST"
  --roi-config "$ROI_CONFIG"
  --output "$OUTPUT"
)

if [[ "${PTC_SITE_VALIDATE_ONLY:-0}" == "1" ]]; then
  ARGS+=(--validate-only)
fi

python3 "${ROOT_DIR}/tools/testing/ptc_site_preflight.py" "${ARGS[@]}"
