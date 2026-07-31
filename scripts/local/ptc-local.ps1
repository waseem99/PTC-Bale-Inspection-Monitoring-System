[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('bootstrap','start','stop','restart','status','logs','smoke','backup','restore','rotate-secrets','mode','upgrade','lan-enable','lan-disable','uninstall','help')]
    [string]$Command = 'help',

    [Parameter(Position = 1)]
    [string]$Argument,

    [switch]$Confirm,
    [switch]$DeleteData
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path
$LocalDir = Join-Path $RepoRoot 'infrastructure\local'
$ComposeFile = Join-Path $LocalDir 'docker-compose.local.yml'
$DefaultDataRoot = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'PTC-Bale' } else { Join-Path $HOME '.ptc-bale' }
$DataRoot = if ($env:PTC_DATA_ROOT) { $env:PTC_DATA_ROOT } else { $DefaultDataRoot }
$ConfigDir = Join-Path $DataRoot 'config'
$EnvFile = if ($env:PTC_RUNTIME_ENV) { $env:PTC_RUNTIME_ENV } else { Join-Path $ConfigDir 'runtime.env' }

function Write-Info([string]$Message) {
    Write-Host "[ptc-local] $Message"
}

function Fail([string]$Message) {
    throw $Message
}

function Invoke-External {
    param(
        [Parameter(Mandatory)] [string]$Executable,
        [Parameter(ValueFromRemainingArguments)] [string[]]$Arguments
    )
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        Fail "$Executable exited with code $LASTEXITCODE."
    }
}

function Test-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Fail 'Docker is required. Install and start Docker Desktop with the WSL2 backend.'
    }
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Fail 'Docker is not running. Start Docker Desktop.'
    }
    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        Fail 'Docker Compose v2 is required.'
    }
}

function Convert-ToDockerPath([string]$PathValue) {
    return $PathValue.Replace('\','/')
}

function Get-RandomHex([int]$Bytes = 32) {
    $buffer = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
    return ([Convert]::ToHexString($buffer)).ToLowerInvariant()
}

function Get-RepoCommit {
    $value = (& git -C $RepoRoot rev-parse HEAD 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not $value) { return 'unknown' }
    return $value.Trim()
}

function Ensure-Layout {
    $directories = @(
        $ConfigDir,
        (Join-Path $DataRoot 'postgres'),
        (Join-Path $DataRoot 'evidence'),
        (Join-Path $DataRoot 'spool'),
        (Join-Path $DataRoot 'backups'),
        (Join-Path $DataRoot 'logs\caddy')
    )
    foreach ($directory in $directories) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
}

function Write-RuntimeEnv {
    if (Test-Path $EnvFile) { return }
    Ensure-Layout
    $commit = Get-RepoCommit
    $shortCommit = if ($commit.Length -ge 12) { $commit.Substring(0,12) } else { $commit }
    $tag = "local-$shortCommit"
    $port = if ($env:LOCAL_HTTP_PORT) { $env:LOCAL_HTTP_PORT } else { '8080' }
    $dockerDataRoot = Convert-ToDockerPath $DataRoot
    $dbPassword = Get-RandomHex 24
    $viewerPassword = Get-RandomHex 16
    $supervisorPassword = Get-RandomHex 16
    $adminPassword = Get-RandomHex 16
    $ingestionToken = Get-RandomHex 32
    $lines = @(
        "PTC_DATA_ROOT=$dockerDataRoot",
        'LOCAL_UID=1000',
        'LOCAL_GID=1000',
        'LOCAL_BIND_ADDRESS=127.0.0.1',
        "LOCAL_HTTP_PORT=$port",
        "ALLOWED_ORIGINS=http://localhost:$port,http://127.0.0.1:$port",
        'PTC_RUNTIME_MODE=simulator',
        'POSTGRES_DB=ptc_bale',
        'POSTGRES_USER=ptc_app',
        "POSTGRES_PASSWORD=$dbPassword",
        "DATABASE_URL=postgresql://ptc_app:$dbPassword@postgres:5432/ptc_bale?schema=public",
        'SESSION_COOKIE_NAME=ptc_session',
        'SESSION_TTL_HOURS=8',
        "SEED_VIEWER_PASSWORD=$viewerPassword",
        "SEED_SUPERVISOR_PASSWORD=$supervisorPassword",
        "SEED_ADMIN_PASSWORD=$adminPassword",
        "INGESTION_SERVICE_TOKEN=$ingestionToken",
        'MAX_EVIDENCE_BYTES=26214400',
        'EDGE_FLUSH_INTERVAL_SECONDS=5',
        'EDGE_HTTP_TIMEOUT_SECONDS=15',
        'SIMULATOR_SEQUENCE_BASE=1000',
        'SIMULATOR_GENERATE_EVERY_SECONDS=300',
        "IMAGE_TAG=$tag",
        "BUILD_VERSION=$tag",
        "BUILD_COMMIT=$commit",
        'SCHEMA_VERSION=20260731-camera-contract-v1'
    )
    [System.IO.File]::WriteAllLines($EnvFile, $lines, [System.Text.UTF8Encoding]::new($false))
    Write-Info "Generated protected runtime configuration at $EnvFile"
    Write-Info 'Credentials were generated but not printed.'
}

function Get-EnvMap {
    if (-not (Test-Path $EnvFile)) { Fail 'Runtime configuration is missing. Run bootstrap first.' }
    $map = @{}
    foreach ($line in Get-Content $EnvFile) {
        if (-not $line -or $line.StartsWith('#')) { continue }
        $parts = $line.Split('=',2)
        if ($parts.Count -eq 2) { $map[$parts[0]] = $parts[1] }
    }
    return $map
}

function Set-EnvValue([string]$Key, [string]$Value) {
    $lines = [System.Collections.Generic.List[string]](Get-Content $EnvFile)
    $found = $false
    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index].StartsWith("$Key=")) {
            $lines[$index] = "$Key=$Value"
            $found = $true
            break
        }
    }
    if (-not $found) { $lines.Add("$Key=$Value") }
    [System.IO.File]::WriteAllLines($EnvFile, $lines, [System.Text.UTF8Encoding]::new($false))
}

function Get-ComposeArgs([string[]]$Additional) {
    return @('compose','--env-file',$EnvFile,'--project-directory',$LocalDir,'-f',$ComposeFile) + $Additional
}

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments)] [string[]]$Arguments)
    $all = Get-ComposeArgs $Arguments
    Invoke-External docker @all
}

function Get-ComposeOutput {
    param([Parameter(ValueFromRemainingArguments)] [string[]]$Arguments)
    $all = Get-ComposeArgs $Arguments
    $output = & docker @all
    if ($LASTEXITCODE -ne 0) { Fail "docker compose exited with code $LASTEXITCODE." }
    return ($output | Out-String).Trim()
}

function Wait-Ready {
    $settings = Get-EnvMap
    $url = "http://127.0.0.1:$($settings.LOCAL_HTTP_PORT)"
    for ($attempt = 1; $attempt -le 90; $attempt++) {
        try {
            Invoke-WebRequest -Uri "$url/healthz" -UseBasicParsing -TimeoutSec 3 | Out-Null
            return $url
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    Invoke-Compose ps
    Invoke-Compose logs --tail=200 api proxy postgres
    Fail "The local stack did not become ready at $url."
}

function Invoke-Smoke {
    $settings = Get-EnvMap
    $url = "http://127.0.0.1:$($settings.LOCAL_HTTP_PORT)"
    Invoke-WebRequest -Uri "$url/healthz" -UseBasicParsing -TimeoutSec 5 | Out-Null
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $loginBody = @{ username = 'viewer'; password = $settings.SEED_VIEWER_PASSWORD } | ConvertTo-Json -Compress
    Invoke-RestMethod -Method Post -Uri "$url/api/auth/login" -ContentType 'application/json' -Headers @{ Origin = $url } -Body $loginBody -WebSession $session | Out-Null
    $me = Invoke-RestMethod -Uri "$url/api/auth/me" -WebSession $session
    if ($me.user.username -ne 'viewer') { Fail 'Authenticated viewer smoke test failed.' }
    $cameras = Invoke-RestMethod -Uri "$url/api/cameras" -WebSession $session
    if (-not (($cameras | ConvertTo-Json -Depth 10) -match 'CAM-01')) { Fail 'Camera smoke test failed.' }
    $summary = Invoke-RestMethod -Uri "$url/api/reports/summary" -WebSession $session
    if (-not $summary.generatedAt) { Fail 'Report summary smoke test failed.' }
    Write-Info 'Authenticated local smoke test passed.'
}

function Invoke-Bootstrap {
    Test-Docker
    Ensure-Layout
    Write-RuntimeEnv
    Write-Info 'Building local release images.'
    Invoke-Compose build --pull
    Write-Info 'Starting PostgreSQL, migrations, seed, API, dashboard, edge spool, and proxy.'
    Invoke-Compose up -d --remove-orphans
    $url = Wait-Ready
    Invoke-Smoke
    Write-Info "PTC Bale local deployment is ready at $url"
}

function Invoke-Start {
    Test-Docker
    Invoke-Compose up -d --remove-orphans
    $url = Wait-Ready
    Write-Info "Local deployment is running at $url"
}

function Invoke-Backup {
    Test-Docker
    $settings = Get-EnvMap
    $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
    $dump = "ptc-bale-$stamp.dump"
    $evidence = "ptc-bale-evidence-$stamp.tar.gz"
    Invoke-Compose --profile tools run --rm backup-tools pg_dump --format=custom "--file=/backups/$dump"
    Invoke-Compose --profile tools run --rm archive-tools sh -c "tar -C /evidence -czf /backups/$evidence ."
    $backupDir = Join-Path $DataRoot 'backups'
    $dumpHash = (Get-FileHash (Join-Path $backupDir $dump) -Algorithm SHA256).Hash.ToLowerInvariant()
    $evidenceHash = (Get-FileHash (Join-Path $backupDir $evidence) -Algorithm SHA256).Hash.ToLowerInvariant()
    @("$dumpHash  $dump", "$evidenceHash  $evidence") | Set-Content -Path (Join-Path $backupDir "ptc-bale-$stamp.sha256") -Encoding utf8
    Write-Info "Backup completed in $backupDir"
}

function Invoke-Restore([string]$DumpPath) {
    if (-not $Confirm) { Fail 'Restore is destructive. Re-run with -Confirm.' }
    if (-not $DumpPath -or -not (Test-Path $DumpPath)) { Fail 'Provide a valid PostgreSQL custom-format dump.' }
    Test-Docker
    Invoke-Backup
    Invoke-Compose stop edge-spool api
    $container = Get-ComposeOutput ps -q postgres
    Invoke-External docker cp (Resolve-Path $DumpPath).Path "${container}:/tmp/restore.dump"
    Invoke-Compose exec -T postgres sh -c 'pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/restore.dump'
    Invoke-Compose exec -T postgres rm -f /tmp/restore.dump
    Invoke-Compose up -d api edge-spool proxy
    Wait-Ready | Out-Null
    Invoke-Smoke
    Write-Info 'Database restore completed and verified.'
}

function Invoke-RotateSecrets {
    Test-Docker
    Invoke-Backup
    Set-EnvValue 'SEED_VIEWER_PASSWORD' (Get-RandomHex 16)
    Set-EnvValue 'SEED_SUPERVISOR_PASSWORD' (Get-RandomHex 16)
    Set-EnvValue 'SEED_ADMIN_PASSWORD' (Get-RandomHex 16)
    Set-EnvValue 'INGESTION_SERVICE_TOKEN' (Get-RandomHex 32)
    Invoke-Compose run --rm seed
    Invoke-Compose up -d --force-recreate api edge-spool
    Wait-Ready | Out-Null
    Write-Info "Credentials and ingestion token rotated. New values remain only in $EnvFile"
}

function Set-Mode([string]$Mode) {
    if ($Mode -notin @('simulator','hardware-ready')) { Fail 'Mode must be simulator or hardware-ready.' }
    Set-EnvValue 'PTC_RUNTIME_MODE' $Mode
    Invoke-Compose up -d --force-recreate edge-spool
    Write-Info "Runtime mode changed to $Mode"
}

function Invoke-Upgrade {
    Test-Docker
    Invoke-Backup
    $commit = Get-RepoCommit
    $shortCommit = if ($commit.Length -ge 12) { $commit.Substring(0,12) } else { $commit }
    $tag = "local-$shortCommit"
    Set-EnvValue 'BUILD_COMMIT' $commit
    Set-EnvValue 'BUILD_VERSION' $tag
    Set-EnvValue 'IMAGE_TAG' $tag
    Invoke-Compose build
    Invoke-Compose up -d --remove-orphans
    Wait-Ready | Out-Null
    Invoke-Smoke
    Write-Info "Upgrade completed at commit $commit"
}

function Enable-Lan([string]$PrivateIp) {
    if (-not $PrivateIp -or $PrivateIp -notmatch '^[0-9a-fA-F:.]+$') { Fail 'Provide the workstation private IP.' }
    $settings = Get-EnvMap
    $port = $settings.LOCAL_HTTP_PORT
    Set-EnvValue 'LOCAL_BIND_ADDRESS' '0.0.0.0'
    Set-EnvValue 'ALLOWED_ORIGINS' "http://localhost:$port,http://127.0.0.1:$port,http://${PrivateIp}:$port"
    Invoke-Compose up -d --force-recreate api proxy
    Write-Info "LAN mode enabled at http://${PrivateIp}:$port. Restrict Windows Firewall to trusted clients."
}

function Disable-Lan {
    $settings = Get-EnvMap
    $port = $settings.LOCAL_HTTP_PORT
    Set-EnvValue 'LOCAL_BIND_ADDRESS' '127.0.0.1'
    Set-EnvValue 'ALLOWED_ORIGINS' "http://localhost:$port,http://127.0.0.1:$port"
    Invoke-Compose up -d --force-recreate api proxy
    Write-Info 'Workstation-only binding restored.'
}

function Invoke-Uninstall {
    Test-Docker
    Invoke-Compose down --remove-orphans
    if ($DeleteData) {
        if (-not $Confirm) { Fail 'Data deletion requires -DeleteData -Confirm.' }
        Remove-Item -Path $DataRoot -Recurse -Force
        Write-Info 'Application and local data removed.'
    } else {
        Write-Info "Application containers removed. Data retained at $DataRoot"
    }
}

switch ($Command) {
    'bootstrap' { Invoke-Bootstrap }
    'start' { Invoke-Start }
    'stop' { Test-Docker; Invoke-Compose stop }
    'restart' { Test-Docker; Invoke-Compose restart postgres api dashboard edge-spool proxy; Wait-Ready | Out-Null; Invoke-Smoke }
    'status' { Test-Docker; Invoke-Compose ps }
    'logs' { Test-Docker; if ($Argument) { Invoke-Compose logs --tail=250 -f $Argument } else { Invoke-Compose logs --tail=250 -f } }
    'smoke' { Invoke-Smoke }
    'backup' { Invoke-Backup }
    'restore' { Invoke-Restore $Argument }
    'rotate-secrets' { Invoke-RotateSecrets }
    'mode' { Set-Mode $Argument }
    'upgrade' { Invoke-Upgrade }
    'lan-enable' { Enable-Lan $Argument }
    'lan-disable' { Disable-Lan }
    'uninstall' { Invoke-Uninstall }
    default {
        Write-Host @'
Usage: .\scripts\local\ptc-local.ps1 <command> [argument]

Commands:
  bootstrap
  start | stop | restart | status
  logs [service] | smoke
  backup
  restore <dump> -Confirm
  rotate-secrets
  mode simulator|hardware-ready
  upgrade
  lan-enable <private-ip> | lan-disable
  uninstall [-DeleteData -Confirm]
'@
    }
}
