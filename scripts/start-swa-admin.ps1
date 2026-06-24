<#
.SYNOPSIS
  Starts the Azure Static Web Apps CLI emulator on a Node 20 runtime (via nvm-windows)
  so the /admin app + mock auth can be tested locally.

.DESCRIPTION
  SWA CLI 2.0.9 (the latest) crashes on Node 24 on Windows with a libuv assertion
  ("!(handle->flags & UV_HANDLE_CLOSING) ... async.c"). This launches the CLI with the
  Node 20 binary that nvm-windows installed, without requiring an elevated `nvm use`.

  Prereqs (one-time):
    winget install -e --id CoreyButler.NVMforWindows
    nvm install 20
    npm i -g @azure/static-web-apps-cli

  Run the API first (separate terminal):
    cd api ; func start        # http://localhost:7071

  Then run this script and open http://localhost:4280/admin
  (click Sign in -> set Roles = admin in the mock login form).
#>
[CmdletBinding()]
param(
    [string]$ApiDevServerUrl = 'http://localhost:7071',
    [string]$AppLocation = 'build'
)

$ErrorActionPreference = 'Stop'

# Locate the nvm root (machine env var, then common fallbacks).
$nvmHome = [Environment]::GetEnvironmentVariable('NVM_HOME', 'Machine')
if (-not $nvmHome) { $nvmHome = $env:NVM_HOME }
if (-not $nvmHome) { $nvmHome = Join-Path $env:LOCALAPPDATA 'nvm' }
if (-not (Test-Path $nvmHome)) {
    throw "nvm-windows not found. Install it: winget install -e --id CoreyButler.NVMforWindows"
}

# Pick the highest installed Node 20.x.
$node20 = Get-ChildItem -Path $nvmHome -Directory -Filter 'v20.*' -ErrorAction SilentlyContinue |
    Sort-Object { [version]($_.Name.TrimStart('v')) } -Descending |
    Select-Object -First 1
if (-not $node20) { throw "No Node 20.x found under $nvmHome. Run: nvm install 20" }
$node20Exe = Join-Path $node20.FullName 'node.exe'

# Locate the globally-installed SWA CLI entry point.
$swaBin = Join-Path $env:APPDATA 'npm\node_modules\@azure\static-web-apps-cli\dist\cli\bin.js'
if (-not (Test-Path $swaBin)) {
    throw "SWA CLI not found at $swaBin. Install it: npm i -g @azure/static-web-apps-cli"
}

# The custom Entra provider in staticwebapp.config.json requires these to merely EXIST
# in the shell (presence check). Any value works locally; login is still mocked.
if (-not $env:AZURE_CLIENT_ID)     { $env:AZURE_CLIENT_ID = 'local-dev' }
if (-not $env:AZURE_CLIENT_SECRET) { $env:AZURE_CLIENT_SECRET = 'local-dev' }

# Prepend Node 20 so any internal `node` resolution also uses 20.
$env:Path = "$($node20.FullName);$env:Path"

Write-Host "Node:    $(& $node20Exe --version)  ($node20Exe)" -ForegroundColor Cyan
Write-Host "SWA CLI: $swaBin" -ForegroundColor Cyan
Write-Host "API:     $ApiDevServerUrl" -ForegroundColor Cyan
Write-Host "Open:    http://localhost:4280/admin  (Sign in -> Roles = admin)" -ForegroundColor Green
Write-Host ''

& $node20Exe $swaBin start $AppLocation --api-devserver-url $ApiDevServerUrl
