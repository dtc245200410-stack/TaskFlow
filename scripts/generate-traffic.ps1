param([int]$Count = 40)
. "$PSScriptRoot/common.ps1"
$config = Get-LocalConfig
$base = "https://localhost:$($config.HTTPS_PORT)"
for ($i=0; $i -lt $Count; $i++) {
  # No session or secrets required: unauthorized API requests generate real 401 logs.
  & curl.exe -k -s -o NUL "$base/api/tasks" | Out-Null
  & curl.exe -k -s -o NUL "$base/api/not-found" | Out-Null
  Start-Sleep -Milliseconds 200
}
Write-Host 'Traffic generated. Wait 30 seconds; Grafana > Explore > Loki > Last 15 minutes.'
