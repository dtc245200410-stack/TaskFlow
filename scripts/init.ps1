$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (Test-Path '.env') { Write-Host '.env already exists; nothing was overwritten.'; exit 0 }
function New-Secret {
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return ([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()
}
$content = Get-Content '.env.example' -Raw
$names = @('POSTGRES_PASSWORD','MIGRATE_DB_PASSWORD','APP_DB_PASSWORD','MONITOR_DB_PASSWORD','PGADMIN_PASSWORD','GRAFANA_ADMIN_PASSWORD','ADMIN_INITIAL_PASSWORD','DEMO_PASSWORD')
foreach ($name in $names) { $content = $content.Replace("$name=GENERATE_WITH_INIT_SCRIPT", "$name=$(New-Secret)") }
[IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $content, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Created .env with independent random local passwords. Open it privately in VS Code.'
Write-Host 'Next: docker compose config --quiet; docker compose up -d --build'
