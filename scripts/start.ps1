. "$PSScriptRoot/common.ps1"
Confirm-Docker
if (!(Test-Path '.env')) { & "$PSScriptRoot/init.ps1" }
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Invalid Compose configuration.' }
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Inspect docker compose logs --tail=100.' }
docker compose ps -a
$config = Get-LocalConfig
Write-Host "Website: https://localhost:$($config.HTTPS_PORT)"
