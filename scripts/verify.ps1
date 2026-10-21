. "$PSScriptRoot/common.ps1"
Confirm-Docker
$config = Get-LocalConfig
$base = "https://localhost:$($config.HTTPS_PORT)"
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Compose validation failed.' }
docker compose ps -a
& curl.exe -k -f -s "$base/health"
if ($LASTEXITCODE -ne 0) { throw 'Application health failed.' }
& curl.exe -k -I -s $base
Write-Host 'Expected headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.'
$targets = Invoke-RestMethod "http://localhost:$($config.PROMETHEUS_PORT)/api/v1/targets"
$bad = @($targets.data.activeTargets | Where-Object { $_.health -ne 'up' })
$targets.data.activeTargets | Select-Object @{n='Job';e={$_.labels.job}},health,lastError | Format-Table
if ($bad.Count -gt 0) { throw 'Some Prometheus targets are DOWN. See README troubleshooting.' }
Write-Host 'All scrape targets are UP. Also inspect pg_up, nginx_up and actual container series.'
