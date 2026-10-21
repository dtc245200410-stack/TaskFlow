. "$PSScriptRoot/common.ps1"
Confirm-Docker
New-Item -ItemType Directory -Force 'backups' | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = "backups/taskflow-$stamp.dump"
docker compose exec -T postgres sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/taskflow-backup.dump'
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
docker compose cp postgres:/tmp/taskflow-backup.dump $target
if ($LASTEXITCODE -ne 0) { throw 'Copy backup failed.' }
docker compose exec -T postgres rm /tmp/taskflow-backup.dump
Write-Host "Backup saved: $target. Treat backup as sensitive data."
