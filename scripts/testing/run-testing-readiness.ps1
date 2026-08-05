$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../..")).Path
$OutputDir = if ($env:PTC_TEST_OUTPUT_DIR) { $env:PTC_TEST_OUTPUT_DIR } else { Join-Path $RepoRoot "build/testing-readiness" }
$Python = if ($env:PYTHON_BIN) { $env:PYTHON_BIN } else { "python" }

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Push-Location $RepoRoot
try {
    & $Python -m unittest discover -s tools/testing/tests -v
    if ($LASTEXITCODE -ne 0) { throw "Testing package unit tests failed." }

    & $Python tools/testing/ptc_acceptance.py offline --output (Join-Path $OutputDir "offline")
    if ($LASTEXITCODE -ne 0) { throw "Offline acceptance generation failed." }

    if ($env:PTC_BASE_URL) {
        & $Python tools/testing/ptc_acceptance.py deployment --output (Join-Path $OutputDir "deployment-record.json")
        if ($LASTEXITCODE -ne 0) { throw "Deployment verification failed." }
    }

    if ($env:PTC_BASE_URL -and $env:INGESTION_SERVICE_TOKEN -and $env:SEED_VIEWER_PASSWORD -and $env:SEED_SUPERVISOR_PASSWORD) {
        & $Python tools/testing/ptc_acceptance.py integrated --output (Join-Path $OutputDir "integrated-record.json")
        if ($LASTEXITCODE -ne 0) { throw "Integrated synthetic acceptance failed." }
    }

    Write-Host "Testing-readiness outputs: $OutputDir"
}
finally {
    Pop-Location
}
