[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$BackendDirectory,

    [Parameter(Mandatory)]
    [string]$Image,

    [switch]$SkipPull
)

$ErrorActionPreference = 'Stop'
$backendPath = (Resolve-Path -LiteralPath $BackendDirectory).Path
$composeOptions = @(
    '--env-file', (Join-Path $backendPath '.env.docker'),
    '-f', (Join-Path (Split-Path -Parent $PSScriptRoot) 'compose.yaml'),
    '-f', (Join-Path $PSScriptRoot 'compose.frontend.yaml')
)
$previousImage = $env:RESTAURANT_FRONTEND_IMAGE
$env:RESTAURANT_FRONTEND_IMAGE = $Image

try {
    $backendOptions = @('--env-file', (Join-Path $backendPath '.env.docker'), '-f', (Join-Path $backendPath 'compose.yaml'))
    $runningBackend = docker compose @backendOptions ps --status running --services backend
    if ($LASTEXITCODE -ne 0 -or $runningBackend -notcontains 'backend') {
        throw 'Start the backend in restaurant-service before deploying restaurant-client.'
    }

    if (-not $SkipPull) {
        docker compose @composeOptions pull --policy always frontend
        if ($LASTEXITCODE -ne 0) { throw "Could not pull $Image." }
    }

    docker compose @composeOptions up -d --no-deps --no-build --pull never --wait --wait-timeout 120 frontend
    if ($LASTEXITCODE -ne 0) {
        docker compose @composeOptions logs --tail 30 frontend
        throw "Frontend did not start successfully with $Image."
    }
} finally {
    $env:RESTAURANT_FRONTEND_IMAGE = $previousImage
}
