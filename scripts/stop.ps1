. "$PSScriptRoot/common.ps1"
Confirm-Docker
docker compose down
if ($LASTEXITCODE -ne 0) { throw 'Stop failed.' }
Write-Host 'Containers stopped. Named volumes and data have been kept.'
