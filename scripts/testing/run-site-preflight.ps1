$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$Manifest = if ($env:PTC_SITE_MANIFEST) { $env:PTC_SITE_MANIFEST } else { Join-Path $Root "tools/testing/site-camera-manifest.template.json" }
$RoiConfig = if ($env:PTC_ROI_CONFIG) { $env:PTC_ROI_CONFIG } else { Join-Path $Root "services/ai-inference/config/ptc.camera-roi.template.json" }
$Output = if ($env:PTC_SITE_PREFLIGHT_OUTPUT) { $env:PTC_SITE_PREFLIGHT_OUTPUT } else { Join-Path $Root "build/site-preflight/site-preflight.json" }

$Arguments = @(
    (Join-Path $Root "tools/testing/ptc_site_preflight.py"),
    "--manifest", $Manifest,
    "--roi-config", $RoiConfig,
    "--output", $Output
)
if ($env:PTC_SITE_VALIDATE_ONLY -eq "1") {
    $Arguments += "--validate-only"
}

python @Arguments
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
