$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
function Get-LocalConfig {
  if (!(Test-Path '.env')) { throw 'Run scripts/init.ps1 first.' }
  $values = @{}
  foreach ($line in Get-Content '.env') {
    if ($line -match '^([A-Z_]+)=(.*)$') { $values[$matches[1]] = $matches[2].Trim() }
  }
  return $values
}
function Confirm-Docker {
  docker info --format '{{.ServerVersion}}' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Docker Engine is unavailable. Start Docker Desktop (Linux containers).' }
}
