#requires -Version 5.1
<#
.SYNOPSIS
Build and run CREASE from a fresh checkout.
.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\run.ps1
.EXAMPLE
.\run.ps1 -Test
#>
[CmdletBinding()]
param(
    [switch]$Test,
    [switch]$BuildOnly,
    [switch]$NoBrowser,
    [switch]$FreshDemo,
    [ValidateRange(1024, 65535)][int]$Port = 8087
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$appProcess = $null

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit code $LASTEXITCODE). See the output above." }
}

try {
    Write-Host "`n  CREASE.  Every ball has a story.`n" -ForegroundColor Blue
    foreach ($program in @('java', 'mvn', 'node', 'npm')) {
        if (-not (Get-Command $program -ErrorAction SilentlyContinue)) {
            throw "Missing prerequisite: $program. Install Java 21+, Maven 3.9+, and Node.js 22.12+ LTS, then rerun this script."
        }
    }
    $javaVersion = (& java --version | Select-Object -First 1)
    if ($javaVersion -notmatch '(\d+)\.' -or [int]$Matches[1] -lt 21) { throw 'Java 21 or newer is required.' }
    $nodeVersion = [version](& node -p 'process.versions.node')
    if ($nodeVersion -lt [version]'20.19.0' -or ($nodeVersion.Major -eq 22 -and $nodeVersion -lt [version]'22.12.0')) {
        throw 'Install Node.js 22.12+ LTS (or Node 20.19+).'
    }
    if (-not $Test -and -not $BuildOnly) {
        $listener = New-Object System.Net.Sockets.TcpClient
        try { $listener.Connect('127.0.0.1', $Port); throw "Port $Port is occupied. Stop that app or run .\run.ps1 -Port 8090." }
        catch [System.Net.Sockets.SocketException] { }
        finally { $listener.Dispose() }
    }

    Push-Location (Join-Path $projectRoot 'frontend')
    try {
        Write-Host '[1/3] Installing locked frontend dependencies...' -ForegroundColor Cyan
        Invoke-Checked 'npm.cmd' @('ci', '--no-fund', '--no-audit')
        Write-Host '[2/3] Building the React dashboard...' -ForegroundColor Cyan
        Invoke-Checked 'npm.cmd' @('run', 'build')
    } finally { Pop-Location }

    Push-Location (Join-Path $projectRoot 'backend')
    try {
        Write-Host '[3/3] Packaging Spring Boot with the dashboard...' -ForegroundColor Cyan
        if ($Test) { Invoke-Checked 'mvn.cmd' @('-q', 'package') }
        else { Invoke-Checked 'mvn.cmd' @('-q', '-DskipTests', 'package') }
    } finally { Pop-Location }

    if ($Test) {
        Push-Location (Join-Path $projectRoot 'frontend')
        try {
            Write-Host 'Installing the test browser (cached after the first run)...' -ForegroundColor Cyan
            Invoke-Checked 'npx.cmd' @('playwright', 'install', 'chromium')
            Write-Host 'Running desktop and mobile browser tests against an isolated database...' -ForegroundColor Cyan
            Invoke-Checked 'npm.cmd' @('test')
        } finally { Pop-Location }
        Write-Host "`nAll checks passed. Run .\run.ps1 to explore the app.`n" -ForegroundColor Green
        exit 0
    }
    if ($BuildOnly) { Write-Host 'Build complete: backend/target/crease-1.0.0.jar' -ForegroundColor Green; exit 0 }

    $logDirectory = Join-Path $projectRoot '.run'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $arguments = @('-jar', 'target/crease-1.0.0.jar', "--server.port=$Port")
    if ($FreshDemo) { $arguments += '--spring.datasource.url=jdbc:h2:mem:crease-session' }
    $appProcess = Start-Process -FilePath (Get-Command java).Source -ArgumentList $arguments `
        -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logDirectory 'server.log') -RedirectStandardError (Join-Path $logDirectory 'server-error.log')
    $url = "http://127.0.0.1:$Port"
    $ready = $false
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
        if ($appProcess.HasExited) { throw "Spring Boot exited. Check .run/server.log and .run/server-error.log." }
        try {
            $health = Invoke-RestMethod "$url/actuator/health" -TimeoutSec 2
            if ($health.status -eq 'UP') { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw 'The server did not become ready. Check .run/server.log.' }
    Write-Host "`nReady: $url" -ForegroundColor Green
    Write-Host 'Press Ctrl+C to stop. Server logs: .run/server.log'
    if (-not $NoBrowser) { Start-Process $url }
    while (-not $appProcess.HasExited) { Start-Sleep -Seconds 1 }
    if ($appProcess.ExitCode -ne 0) { throw 'The server stopped unexpectedly. Check .run/server.log.' }
} catch {
    Write-Host "`nERROR: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
} finally {
    if ($null -ne $appProcess -and -not $appProcess.HasExited) { Stop-Process -Id $appProcess.Id -ErrorAction SilentlyContinue }
}
