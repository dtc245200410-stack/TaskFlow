param([Parameter(Mandatory=$true)][string]$BackupFile,[switch]$ConfirmReplaceTaskFlow)
. "$PSScriptRoot/common.ps1"
if (!$ConfirmReplaceTaskFlow) { throw 'Restore replaces TaskFlow data. Back up first, then pass -ConfirmReplaceTaskFlow.' }
if (!(Test-Path $BackupFile -PathType Leaf)) { throw 'Backup file not found.' }
Confirm-Docker
docker compose cp $BackupFile postgres:/tmp/taskflow-restore.dump
if ($LASTEXITCODE -ne 0) { throw 'Copy restore file failed.' }
docker compose stop backend
try {
  docker compose exec -T postgres sh -ec 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --single-transaction /tmp/taskflow-restore.dump'
  if ($LASTEXITCODE -ne 0) { throw 'Restore failed. Inspect errors before continuing.' }
} finally { docker compose start backend }
docker compose exec -T postgres rm /tmp/taskflow-restore.dump
Write-Host 'Restore completed. Sign in again and verify your data.'
