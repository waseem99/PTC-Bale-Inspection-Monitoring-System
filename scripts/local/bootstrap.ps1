[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'ptc-local.ps1') bootstrap
exit $LASTEXITCODE
