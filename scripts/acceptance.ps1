. "$PSScriptRoot/common.ps1"
Confirm-Docker
# Runs against the actual backend through its Compose network. Creates a disposable QA project/task.
# The real test file is mounted into a one-off backend container; no public backend port is needed.
docker compose run --rm --no-deps -v "${PWD}/tests/stack-acceptance.mjs:/tmp/stack-acceptance.mjs:ro" backend node /tmp/stack-acceptance.mjs
if ($LASTEXITCODE -ne 0) { throw 'Real stack API acceptance failed.' }
