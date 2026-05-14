# ============================================================
#  START-JARVIS.PS1 - Jarvis Sana Primary Launcher
#  Compatible: Windows PowerShell 5.1+
# ============================================================

$ErrorActionPreference = "Continue"

$ProjectRoot  = $PSScriptRoot
$LogDir       = $ProjectRoot
$StartupLog   = Join-Path $LogDir "startup-report.log"
$HealthLog    = Join-Path $LogDir "runtime-health.log"
$DepLog       = Join-Path $LogDir "dependency-report.log"
$MaxRetries   = 3
$StartTimeout = 90
$DevPort      = 3000

# -- Helpers ---------------------------------------------------
function Write-Step { param([string]$m) Write-Host "  >> $m" -ForegroundColor Yellow }
function Write-OK   { param([string]$m) Write-Host "  OK  $m" -ForegroundColor Green  }
function Write-Fail { param([string]$m) Write-Host "  XX  $m" -ForegroundColor Red    }
function Write-Info { param([string]$m) Write-Host "  i   $m" -ForegroundColor Cyan   }
function Write-Warn { param([string]$m) Write-Host "  !!  $m" -ForegroundColor DarkYellow }

function Log {
    param([string]$file, [string]$msg)
    $ts = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    Add-Content -Path $file -Value "[$ts] $msg"
}

function Get-ColorForBool {
    param([bool]$val)
    if ($val) { return "Green" } else { return "Red" }
}

function Get-TextForBool {
    param([bool]$val, [string]$good, [string]$bad)
    if ($val) { return $good } else { return $bad }
}

# -- Banner ----------------------------------------------------
function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  +================================================+" -ForegroundColor Cyan
    Write-Host "  |        JARVIS SANA  -  AUTO LAUNCHER           |" -ForegroundColor Cyan
    Write-Host "  |         Next.js 14 + TypeScript Core           |" -ForegroundColor DarkCyan
    Write-Host "  +================================================+" -ForegroundColor Cyan
    Write-Host ""
}

# -- Init logs -------------------------------------------------
function Init-Logs {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    foreach ($f in @($StartupLog, $HealthLog, $DepLog)) {
        Set-Content -Path $f -Value "# [$ts] Jarvis Sana - $(Split-Path $f -Leaf)"
    }
}

# -- Port check ------------------------------------------------
function Test-Port {
    param([int]$port)
    $result = netstat -ano 2>$null | Select-String ":$port\s"
    return ($null -ne $result)
}

function Get-ActivePort {
    foreach ($p in @(3000, 3001, 3002, 8080)) {
        if (Test-Port $p) { return $p }
    }
    return $null
}

# -- Wait for server -------------------------------------------
function Wait-ForServer {
    param([int]$port, [int]$timeoutSec)
    Write-Step "Waiting for server on port $port (timeout: ${timeoutSec}s)..."
    $elapsed = 0
    $interval = 3
    while ($elapsed -lt $timeoutSec) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 4 -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -lt 500) { return $true }
        } catch {}
        Start-Sleep -Seconds $interval
        $elapsed += $interval
        Write-Host "    ... $elapsed / $timeoutSec s" -ForegroundColor DarkGray
    }
    return $false
}

# -- Run repair ------------------------------------------------
function Invoke-Repair {
    $repairScript = Join-Path $ProjectRoot "repair-system.ps1"
    if (Test-Path $repairScript) {
        Write-Step "Invoking repair-system.ps1..."
        & $repairScript
    } else {
        Write-Warn "repair-system.ps1 not found - running basic npm install..."
        Set-Location $ProjectRoot
        npm install 2>&1 | Tee-Object -Append $StartupLog
    }
}

# ================================================================
#  MAIN
# ================================================================
Write-Banner
Init-Logs
Set-Location $ProjectRoot
Log $StartupLog "Launcher started from: $ProjectRoot"

# -- Pre-flight: node_modules check ----------------------------
Write-Step "Checking node_modules integrity..."
$nmPath  = Join-Path $ProjectRoot "node_modules"
$nextBin = Join-Path $nmPath ".bin\next.cmd"

if ((-not (Test-Path $nmPath)) -or (-not (Test-Path $nextBin))) {
    Write-Warn "node_modules missing or corrupted. Running repair..."
    Log $StartupLog "node_modules missing - invoking repair"
    Invoke-Repair
}

# -- Dev server startup loop -----------------------------------
$attempt = 0
$started = $false

while (($attempt -lt $MaxRetries) -and (-not $started)) {
    $attempt++
    Write-Host ""
    Write-Info "--- Startup Attempt $attempt / $MaxRetries ---"
    Log $StartupLog "Startup attempt $attempt"

    # Kill stale process on dev port
    $stale = netstat -ano 2>$null | Select-String ":$DevPort\s.*LISTENING"
    if ($stale) {
        $parts = ($stale.ToString().Trim()) -split "\s+"
        $pid2kill = $parts[-1]
        Write-Warn "Killing stale process on :$DevPort (PID $pid2kill)"
        try { Stop-Process -Id ([int]$pid2kill) -Force -ErrorAction SilentlyContinue } catch {}
        Start-Sleep -Seconds 2
    }

    # Launch next dev in background
    Write-Step "Launching:  npm run dev"
    $devJob = Start-Job -ScriptBlock {
        param($dir, $logPath)
        Set-Location $dir
        npm run dev 2>&1 | ForEach-Object {
            $line = $_.ToString()
            Add-Content -Path $logPath -Value $line
            Write-Output $line
        }
    } -ArgumentList $ProjectRoot, $StartupLog

    Log $StartupLog "npm run dev job started (JobId: $($devJob.Id))"

    # Wait for readiness
    $ready = Wait-ForServer -port $DevPort -timeoutSec $StartTimeout

    if ($ready) {
        $started = $true
        $activePort = Get-ActivePort
        if (-not $activePort) { $activePort = $DevPort }
        Write-Host ""
        Write-OK "Server is UP on port $activePort"
        Log $HealthLog  "Server started successfully on port $activePort"
        Log $StartupLog "SUCCESS - server ready after attempt $attempt"
    } else {
        Write-Fail "Server did not respond within ${StartTimeout}s"
        Log $StartupLog "Attempt $attempt FAILED - server timeout"

        # Collect job output for diagnostics
        $jobOut = Receive-Job -Job $devJob -ErrorAction SilentlyContinue
        if ($jobOut) {
            Log $StartupLog "--- Job output ---"
            $jobOut | ForEach-Object { Log $StartupLog "$_" }
            Log $StartupLog "--- End output ---"
        }
        Stop-Job   -Job $devJob -ErrorAction SilentlyContinue
        Remove-Job -Job $devJob -ErrorAction SilentlyContinue

        if ($attempt -lt $MaxRetries) {
            Write-Warn "Attempt $attempt failed. Running repair before retry..."
            Invoke-Repair
            Start-Sleep -Seconds 3
        }
    }
}

# -- Final Status Report ---------------------------------------
Write-Host ""
Write-Host "  +================================================+" -ForegroundColor Cyan
Write-Host "  |            FINAL HEALTH REPORT                 |" -ForegroundColor Cyan
Write-Host "  +================================================+" -ForegroundColor Cyan

$nmOk  = Test-Path (Join-Path $ProjectRoot "node_modules\.bin\next.cmd")
$pkgOk = Test-Path (Join-Path $ProjectRoot "package.json")
$tsOk  = Test-Path (Join-Path $ProjectRoot "tsconfig.json")

if ($started) {
    $statusText  = "RUNNING"
    $statusColor = "Green"
} else {
    $statusText  = "FAILED"
    $statusColor = "Red"
}

if ($started) {
    $ap = Get-ActivePort
    if (-not $ap) { $ap = $DevPort }
    $localhostUrl = "http://localhost:$ap"
} else {
    $localhostUrl = "N/A"
}

$nmText  = Get-TextForBool -val $nmOk  -good "OK" -bad "BROKEN"
$pkgText = Get-TextForBool -val $pkgOk -good "OK" -bad "MISSING"
$tsText  = Get-TextForBool -val $tsOk  -good "OK" -bad "MISSING"

Write-Host ""
Write-Host "  Project Root   : $ProjectRoot"    -ForegroundColor White
Write-Host "  Runtime Status : $statusText"      -ForegroundColor $statusColor
Write-Host "  Localhost URL  : $localhostUrl"    -ForegroundColor (Get-ColorForBool -val $started)
Write-Host "  package.json   : $pkgText"         -ForegroundColor (Get-ColorForBool -val $pkgOk)
Write-Host "  node_modules   : $nmText"          -ForegroundColor (Get-ColorForBool -val $nmOk)
Write-Host "  tsconfig.json  : $tsText"          -ForegroundColor (Get-ColorForBool -val $tsOk)
Write-Host ""
Write-Host "  Logs:"
Write-Host "    $StartupLog" -ForegroundColor DarkGray
Write-Host "    $HealthLog"  -ForegroundColor DarkGray
Write-Host "    $DepLog"     -ForegroundColor DarkGray
Write-Host ""

Log $HealthLog "Final status: $statusText | URL: $localhostUrl"

if ($started) {
    Write-OK "Jarvis Sana is live at $localhostUrl"
    Write-Info "Press Ctrl+C to stop the server."
    # Keep alive
    try { Wait-Job -Job (Get-Job) -ErrorAction SilentlyContinue | Out-Null } catch {}
} else {
    Write-Fail "All $MaxRetries startup attempts failed."
    Write-Info "Check $StartupLog for details, then run repair-system.ps1 manually."
    exit 1
}
