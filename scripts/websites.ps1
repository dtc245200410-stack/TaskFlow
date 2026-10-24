# Windows PowerShell 5.1 compatible. No global certificate or browser settings change.
function Get-LocalWebsites {
  param([hashtable]$Config)
  $definitions = @(
    @{Name='TaskFlow'; Service='nginx'; Key='HTTPS_PORT'; Default=8448; Scheme='https'; Page='/'; Probe='/health'},
    @{Name='pgAdmin'; Service='pgadmin'; Key='PGADMIN_PORT'; Default=5058; Scheme='http'; Page='/'; Probe='/misc/ping'},
    @{Name='Grafana'; Service='grafana'; Key='GRAFANA_PORT'; Default=3008; Scheme='http'; Page='/'; Probe='/api/health'},
    @{Name='Prometheus'; Service='prometheus'; Key='PROMETHEUS_PORT'; Default=9098; Scheme='http'; Page='/targets'; Probe='/-/ready'}
  )
  foreach ($site in $definitions) {
    # Compose gives process environment variables precedence over .env.
    $value = [Environment]::GetEnvironmentVariable($site.Key)
    if ([string]::IsNullOrWhiteSpace($value)) { $value = $Config[$site.Key] }
    if ([string]::IsNullOrWhiteSpace($value)) { $value = [string]$site.Default }
    $value = ([string]$value).Trim().Trim([char[]]@('"', "'"))
    $localPort = 0
    if (![int]::TryParse($value, [ref]$localPort) -or $localPort -lt 1 -or $localPort -gt 65535) {
      throw "Invalid port in $($site.Key). Use a number from 1 to 65535."
    }
    $baseUrl = '{0}://localhost:{1}' -f $site.Scheme, $localPort
    [pscustomobject]@{
      Name = $site.Name
      Service = $site.Service
      Url = $baseUrl + $site.Page
      ProbeUrl = $baseUrl + $site.Probe
    }
  }
}

function Wait-LocalWebsites {
  param([object[]]$Websites, [int]$TimeoutSeconds = 180)
  $null = Get-Command curl.exe -ErrorAction Stop
  $pending = @($Websites)
  $timer = [Diagnostics.Stopwatch]::StartNew()
  Write-Host "Waiting for all four websites (up to $TimeoutSeconds seconds)..."
  while ($pending.Count -gt 0) {
    $retry = @()
    foreach ($site in $pending) {
      $remaining = $TimeoutSeconds - $timer.Elapsed.TotalSeconds
      if ($remaining -le 0) { $retry += $site; continue }
      $requestTimeout = [int][Math]::Min(3, [Math]::Max(1, [Math]::Ceiling($remaining)))
      $curlArgs = @('--disable', '--silent', '--output', 'NUL', '--write-out', '%{http_code}',
                    '--noproxy', 'localhost,127.0.0.1,::1', '--connect-timeout', '2', '--max-time', "$requestTimeout")
      # Only this localhost readiness probe accepts the demo's self-signed TLS.
      if ($site.ProbeUrl -like 'https://localhost:*') { $curlArgs += '--insecure' }
      $status = & curl.exe @curlArgs $site.ProbeUrl 2>$null
      if ($LASTEXITCODE -eq 0 -and "$status" -match '^2[0-9]{2}$') {
        Write-Host "Ready: $($site.Name)"
      } else {
        $retry += $site
      }
    }
    $pending = @($retry)
    if ($pending.Count -eq 0) { break }
    if ($timer.Elapsed.TotalSeconds -ge $TimeoutSeconds) {
      $names = ($pending | ForEach-Object { "$($_.Name) ($($_.Url))" }) -join ', '
      $services = ($pending | Select-Object -ExpandProperty Service -Unique) -join ' '
      throw "Websites did not become ready: $names. Inspect: docker compose logs --tail=100 $services"
    }
    Start-Sleep -Milliseconds 1000
  }
  $timer.Stop()
}

function Open-LocalWebsites {
  param([object[]]$Websites)
  foreach ($site in $Websites) {
    try {
      Start-Process -FilePath $site.Url -ErrorAction Stop
    } catch {
      Write-Warning "Could not open $($site.Name) in the browser. Open manually: $($site.Url)"
    }
  }
}
