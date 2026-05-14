# ============================================================
#  AUTO-RUNTIME-CHECK.PS1 - Jarvis Sana Runtime Health Monitor
#  Compatible: Windows PowerShell 5.1+
# ============================================================

$ErrorActionPreference = "Continue"

$ProjectRoot = $PSScriptRoot
$HealthLog   = Join-Path $ProjectRoot "runtime-health.log"
$DepLog      = Join-Path $ProjectRoot "dependency-report.log"
$StartupLog  = Join-Path $ProjectRoot "startup-report.log"

$CheckPorts  = @(3000, 3001, 3002, 8080)
$MaxRepairs  = 2

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

function Test-Port {
    param([int]$port)
    $r = netstat -ano 2>$null | Select-String ":$port\s"
    return ($null -ne $r)
}

function Get-ServerStatus {
    param([int[]]$ports)
    foreach ($p in $ports) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$p" -TimeoutSec 4 -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -lt 500) {
                return @{ Port = $p; Status = "UP"; Code = $r.StatusCode }
            }
        } catch {}
    }
    return @{ Port = $null; Status = "DOWN"; Code = $null }
}

# -- Banner ----------------------------------------------------
Write-Host ""
Write-Host "  +================================================+" -ForegroundColor Blue
Write-Host "  |     JARVIS SANA - RUNTIME HEALTH MONITOR       |" -ForegroundColor Blue
Write-Host "  +================================================+" -ForegroundColor Blue
Write-Host ""

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Set-Content -Path $HealthLog -Value "# [$ts] Runtime Health Check"
Log $HealthLog "Health check started"
Set-Location $ProjectRoot

# ================================================================
#  SECTION 1 - SYSTEM PREREQUISITES
# ================================================================
Write-Host "  [ SYSTEM PREREQUISITES ]" -ForegroundColor White
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray

$nodeVer = (node --version 2>&1).ToString()
if ($nodeVer -match "v\d+") {
    $nodeMajor = [int]($nodeVer -replace "v(\d+).*",'$1')
    if ($nodeMajor -ge 18) {
        Write-OK "Node.js $nodeVer (compatible)"
        Log $HealthLog "Node.js: $nodeVer OK"
    } else {
        Write-Warn "Node.js $nodeVer - Next.js 14 recommends >=18"
        Log $HealthLog "WARNING: Node.js $nodeVer < 18"
    }
} else {
    Write-Fail "Node.js not found"
    Log $HealthLog "ERROR: Node.js missing"
}

$npmVer = (npm --version 2>&1).ToString()
Write-OK "npm $npmVer"
Log $HealthLog "npm: $npmVer"

$psVer = $PSVersionTable.PSVersion.ToString()
Write-OK "PowerShell $psVer"
Log $HealthLog "PowerShell: $psVer"

# ================================================================
#  SECTION 2 - PROJECT FILES
# ================================================================
Write-Host ""
Write-Host "  [ PROJECT FILE INTEGRITY ]" -ForegroundColor White
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray

$checks = @(
    @{ Path = "package.json";      Critical = $true  },
    @{ Path = "tsconfig.json";     Critical = $true  },
    @{ Path = "next.config.js";    Critical = $true  },
    @{ Path = ".env";              Critical = $false },
    @{ Path = ".eslintrc.json";    Critical = $false },
    @{ Path = "postcss.config.js"; Critical = $false },
    @{ Path = "tailwind.config.js";Critical = $false },
    @{ Path = "src";               Critical = $true  },
    @{ Path = "components";        Critical = $false },
    @{ Path = "agents";            Critical = $false },
    @{ Path = "services";          Critical = $false }
)

$missingCritical = 0
foreach ($c in $checks) {
    $full = Join-Path $ProjectRoot $c.Path
    if (Test-Path $full) {
        Write-OK "$($c.Path)"
        Log $HealthLog "FILE OK: $($c.Path)"
    } elseif ($c.Critical) {
        Write-Fail "$($c.Path) - MISSING (critical)"
        Log $HealthLog "FILE MISSING (critical): $($c.Path)"
        $missingCritical++
    } else {
        Write-Warn "$($c.Path) - missing (non-critical)"
        Log $HealthLog "FILE MISSING (non-critical): $($c.Path)"
    }
}

# ================================================================
#  SECTION 3 - NODE_MODULES HEALTH
# ================================================================
Write-Host ""
Write-Host "  [ NODE_MODULES HEALTH ]" -ForegroundColor White
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray

$nmPath      = Join-Path $ProjectRoot "node_modules"
$needsRepair = $false

$criticalBins = @(
    "node_modules\.bin\next.cmd",
    "node_modules\.bin\tsc.cmd",
    "node_modules\.bin\eslint.cmd",
    "node_modules\react\index.js",
    "node_modules\react-dom\index.js"
)

foreach ($bin in $criticalBins) {
    $full = Join-Path $ProjectRoot $bin
    if (Test-Path $full) {
        Write-OK $bin
        Log $HealthLog "BIN OK: $bin"
    } else {
        Write-Fail "$bin - MISSING"
        Log $HealthLog "BIN MISSING: $bin"
        $needsRepair = $true
    }
}

# -- AI / Voice Assistant Dependencies --------------------------
$langchainDeps = @(
    "node_modules\langchain",
    "node_modules\@langchain\core",
    "node_modules\@langchain\openai",
    "node_modules\socket.io",
    "node_modules\axios",
    "node_modules\bottleneck"
)

Write-Host ""
Write-Host "  [ AI / VOICE ASSISTANT DEPENDENCIES ]" -ForegroundColor White
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray

foreach ($dep in $langchainDeps) {
    $full = Join-Path $ProjectRoot $dep
    if (Test-Path $full) {
        Write-OK ($dep -replace "node_modules\\","")
        Log $HealthLog "DEP OK: $dep"
    } else {
        Write-Warn "$dep - MISSING (voice/AI features may break)"
        Log $HealthLog "DEP MISSING: $dep"
        $needsRepair = $true
    }
}

# ================================================================
#  SECTION 4 - REACT / NEXT.JS COMPATIBILITY
# ================================================================
Write-Host ""
Write-Host "  [ REACT / NEXT.JS COMPATIBILITY ]" -ForegroundColor White
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray

try {
    $pkg = Get-Content (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json
    $nextVer  = $pkg.dependencies.next
    $reactVer = $pkg.dependencies.react
    Write-Info "Next.js  declared: $nextVer"
    Write-Info "React    declared: $reactVer"
    Log $HealthLog "Next.js: $nextVer | React: $reactVer"

    $nextPkg  = Join-Path $ProjectRoot "node_modules\next\package.json"
    $reactPkg = Join-Path $ProjectRoot "node_modules\react\package.json"

    if (Test-Path $nextPkg) {
        $nv = (Get-Content $nextPkg -Raw | ConvertFrom-Json).version
        Write-OK "Next.js  installed: $nv"
        Log $HealthLog "Next.js installed: $nv"
    }
    if (Test-Path $reactPkg) {
        $rv = (Get-Content $reactPkg -Raw | ConvertFrom-Json).version
        Write-OK "React    installed: $rv"
        Log $HealthLog "React installed: $rv"
    }
} catch {
    Write-Warn "Could not read installed versions: $_"
    Log $HealthLog "WARNING: version check failed: $_"
}

# ================================================================
#  SECTION 5 - SERVER STATUS
# ================================================================
Write-Host ""
Write-Host "  [ RUNTIME SERVER STATUS ]" -ForegroundColor White
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray

$serverStatus = Get-ServerStatus -ports $CheckPorts

if ($serverStatus.Status -eq "UP") {
    $activePort   = $serverStatus.Port
    $localhostUrl = "http://localhost:$activePort"
    Write-OK "Server is RUNNING on port $activePort"
    Write-OK "Localhost URL: $localhostUrl"
    Log $HealthLog "Server UP - port $activePort | $localhostUrl"
} else {
    Write-Warn "Server is NOT running on any checked port"
    Log $HealthLog "Server DOWN - not responding on ports: $($CheckPorts -join ', ')"
    $localhostUrl = "N/A"
}

foreach ($p in $CheckPorts) {
    if (Test-Port $p) {
        Write-Info "Port $p - LISTENING (process active)"
        Log $HealthLog "Port $p: LISTENING"
    }
}

# ================================================================
#  SECTION 6 - AUTO REPAIR (if needed)
# ================================================================
if ($needsRepair -or ($missingCritical -gt 0)) {
    Write-Host ""
    Write-Host "  [ AUTO REPAIR TRIGGERED ]" -ForegroundColor Red
    Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray
    Log $HealthLog "Auto repair triggered: needsRepair=$needsRepair missingCritical=$missingCritical"

    $repairScript = Join-Path $ProjectRoot "repair-system.ps1"
    if (Test-Path $repairScript) {
        $repairAttempt = 0
        $repaired = $false

        while (($repairAttempt -lt $MaxRepairs) -and (-not $repaired)) {
            $repairAttempt++
            Write-Step "Repair attempt $repairAttempt / $MaxRepairs..."
            & $repairScript

            $stillBroken = $false
            foreach ($bin in $criticalBins) {
                if (-not (Test-Path (Join-Path $ProjectRoot $bin))) {
                    $stillBroken = $true
                    break
                }
            }

            if (-not $stillBroken) {
                Write-OK "Repair attempt $repairAttempt succeeded"
                Log $HealthLog "Repair succeeded on attempt $repairAttempt"
                $repaired = $true
            } else {
                Write-Warn "Repair attempt $repairAttempt did not fix all issues"
                Log $HealthLog "Repair attempt $repairAttempt incomplete"
            }
        }

        if (-not $repaired) {
            Write-Fail "All repair attempts exhausted - manual intervention may be needed"
            Log $HealthLog "CRITICAL: Repair exhausted after $MaxRepairs attempts"
        }
    } else {
        Write-Warn "repair-system.ps1 not found"
        Log $HealthLog "WARNING: repair-system.ps1 not found"
    }
}

# ================================================================
#  SECTION 7 - AUTO-START (if server is down and files OK)
# ================================================================
if (($serverStatus.Status -ne "UP") -and ($missingCritical -eq 0) -and (-not $needsRepair)) {
    Write-Host ""
    Write-Host "  [ AUTO-START ATTEMPT ]" -ForegroundColor Cyan
    Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray
    Write-Step "Server is down but project looks healthy - launching start-jarvis.ps1..."
    Log $HealthLog "Auto-start: launching start-jarvis.ps1"

    $startScript = Join-Path $ProjectRoot "start-jarvis.ps1"
    if (Test-Path $startScript) {
        & $startScript
    } else {
        Write-Warn "start-jarvis.ps1 not found - running npm run dev directly"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot'; npm run dev" -WorkingDirectory $ProjectRoot
        Write-OK "npm run dev launched in new window"
        Log $HealthLog "npm run dev launched in new PowerShell window"
    }
}

# ================================================================
#  FINAL REPORT
# ================================================================
Write-Host ""
Write-Host "  +================================================+" -ForegroundColor Blue
Write-Host "  |         JARVIS SANA HEALTH SUMMARY             |" -ForegroundColor Blue
Write-Host "  +================================================+" -ForegroundColor Blue
Write-Host ""

$nmOK      = Test-Path (Join-Path $ProjectRoot "node_modules\.bin\next.cmd")
$envOK     = Test-Path (Join-Path $ProjectRoot ".env")
$srcOK     = Test-Path (Join-Path $ProjectRoot "src")
$serverUp  = ($serverStatus.Status -eq "UP")

if ($nmOK -and $srcOK -and ($missingCritical -eq 0)) {
    $overallHealth = "HEALTHY"
    $healthColor   = "Green"
} else {
    $overallHealth = "DEGRADED"
    $healthColor   = "Red"
}

$serverColor = "Yellow"
if ($serverUp) { $serverColor = "Green" }

Write-Host "  Project Health    : $overallHealth"          -ForegroundColor $healthColor
Write-Host "  Runtime Status    : $($serverStatus.Status)" -ForegroundColor $serverColor
Write-Host "  Localhost URL     : $localhostUrl"           -ForegroundColor (Get-ColorForBool -val $serverUp)
Write-Host "  node_modules      : $(Get-TextForBool -val $nmOK  -good 'OK' -bad 'BROKEN')"  -ForegroundColor (Get-ColorForBool -val $nmOK)
Write-Host "  Source Files      : $(Get-TextForBool -val $srcOK -good 'OK' -bad 'MISSING')" -ForegroundColor (Get-ColorForBool -val $srcOK)
Write-Host "  .env              : $(Get-TextForBool -val $envOK -good 'OK' -bad 'Missing')" -ForegroundColor (Get-ColorForBool -val $envOK)
Write-Host "  Missing Critical  : $missingCritical"        -ForegroundColor (Get-ColorForBool -val ($missingCritical -eq 0))
Write-Host ""
Write-Host "  Log Files:"
Write-Host "    -> $HealthLog"  -ForegroundColor DarkGray
Write-Host "    -> $DepLog"     -ForegroundColor DarkGray
Write-Host "    -> $StartupLog" -ForegroundColor DarkGray
Write-Host ""

Log $HealthLog "=== SUMMARY === Health:$overallHealth | Server:$($serverStatus.Status) | URL:$localhostUrl | NM:$nmOK | Critical missing:$missingCritical"

if ($overallHealth -eq "HEALTHY" -and $serverUp) {
    Write-OK "Jarvis Sana is FULLY OPERATIONAL at $localhostUrl"
} elseif ($overallHealth -eq "HEALTHY" -and (-not $serverUp)) {
    Write-Warn "Project is healthy but server is not running. Run start-jarvis.ps1"
} else {
    Write-Fail "Project has issues. Run repair-system.ps1 for a full repair."
}
Write-Host ""
