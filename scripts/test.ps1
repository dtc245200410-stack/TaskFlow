. "$PSScriptRoot/common.ps1"
Confirm-Docker
# Tests use an isolated, temporary PGlite database inside the test container, never your real data.
docker compose --profile test run --build --rm tests
if ($LASTEXITCODE -ne 0) { throw 'Automated tests failed.' }
Write-Host 'Automated API tests passed. PGlite tests do not certify the PostgreSQL service.'
Write-Host 'For the real stack acceptance test, run scripts/acceptance.ps1 next.'
