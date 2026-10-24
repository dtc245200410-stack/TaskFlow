[CmdletBinding()]
param(
  [switch]$NoBrowser,
  [ValidateRange(1, 1800)][int]$WaitTimeoutSeconds = 180
)
. "$PSScriptRoot/common.ps1"
. "$PSScriptRoot/websites.ps1"
Confirm-Docker
if (!(Test-Path '.env')) { & "$PSScriptRoot/init.ps1" }
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Invalid Compose configuration.' }
$config = Get-LocalConfig
$websites = @(Get-LocalWebsites -Config $config)
$null = Get-Command curl.exe -ErrorAction Stop
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
  docker compose ps -a
  throw 'Startup failed. Inspect docker compose logs --tail=100 migrate backend nginx. For initial P3018/P3009 see docs/FIX_MIGRATION.md.'
}
docker compose ps -a
Wait-LocalWebsites -Websites $websites -TimeoutSeconds $WaitTimeoutSeconds
$websites | Select-Object Name, Url | Format-Table -AutoSize
if (!$NoBrowser) {
  Write-Host 'All four websites are ready. Opening your default browser...'
  Open-LocalWebsites -Websites $websites
}
