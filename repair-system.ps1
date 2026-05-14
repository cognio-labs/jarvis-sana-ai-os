# ============================================================
#  REPAIR-SYSTEM.PS1 - Jarvis Sana Full Dependency Repair
#  Compatible: Windows PowerShell 5.1+
# ============================================================

$ErrorActionPreference = "Continue"

$ProjectRoot = $PSScriptRoot
$DepLog      = Join-Path $ProjectRoot "dependency-report.log"

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

function Get-StatusText {
    param([bool]$ok, [string]$goodText, [string]$badText)
    if ($ok) { return $goodText } else { return $badText }
}

function Get-StatusColor {
    param([bool]$ok)
    if ($ok) { return "Green" } else { return "Red" }
}

# ---- Banner --------------------------------------------------
Write-Host ""
Write-Host "  +================================================+" -ForegroundColor Magenta
Write-Host "  |      JARVIS SANA - DEPENDENCY REPAIR          |" -ForegroundColor Magenta
Write-Host "  +================================================+" -ForegroundColor Magenta
Write-Host ""

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Set-Content -Path $DepLog -Value "# [$ts] Dependency Repair Report"
Log $DepLog "Repair started from: $ProjectRoot"
Set-Location $ProjectRoot

# ---- 1. Verify Node and npm ----------------------------------
Write-Step "Verifying Node.js and npm installation..."
$nodeVer = node --version 2>&1
$npmVer  = npm  --version 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Fail "Node.js not found! Install from https://nodejs.org"
    Log $DepLog "ERROR: Node.js not found"
    exit 1
}
Write-OK "Node: $nodeVer  |  npm: $npmVer"
Log $DepLog "Node: $nodeVer | npm: $npmVer"

# ---- 2. Check package.json -----------------------------------
Write-Step "Validating package.json..."
$pkgPath = Join-Path $ProjectRoot "package.json"
if (-not (Test-Path $pkgPath)) {
    Write-Fail "package.json missing!"
    Log $DepLog "ERROR: package.json missing"
    exit 1
}
try {
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    Write-OK "package.json valid - project: $($pkg.name) v$($pkg.version)"
    Log $DepLog "package.json OK: $($pkg.name) v$($pkg.version)"
} catch {
    Write-Fail "package.json is malformed: $_"
    Log $DepLog "ERROR: package.json parse failure: $_"
    exit 1
}

# ---- 3. Check tsconfig.json ----------------------------------
Write-Step "Validating tsconfig.json..."
$tsPath = Join-Path $ProjectRoot "tsconfig.json"
if (-not (Test-Path $tsPath)) {
    Write-Warn "tsconfig.json missing - creating minimal config..."
    $minimalTs = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
'@
    Set-Content -Path $tsPath -Value $minimalTs
    Write-OK "tsconfig.json created"
    Log $DepLog "tsconfig.json was missing - created default"
} else {
    Write-OK "tsconfig.json found"
    Log $DepLog "tsconfig.json OK"
}

# ---- 4. Check .env -------------------------------------------
Write-Step "Checking environment file..."
$envPath    = Join-Path $ProjectRoot ".env"
$envExample = Join-Path $ProjectRoot ".env.example"
if (-not (Test-Path $envPath)) {
    if (Test-Path $envExample) {
        Copy-Item $envExample $envPath
        Write-Warn ".env missing - copied from .env.example (fill in real values!)"
        Log $DepLog "WARNING: .env missing - copied from .env.example"
    } else {
        Write-Warn ".env and .env.example both missing - proceeding without them"
        Log $DepLog "WARNING: no .env file found"
    }
} else {
    Write-OK ".env file present"
    Log $DepLog ".env OK"
}

# ---- 5. node_modules integrity -------------------------------
Write-Step "Checking node_modules integrity..."
$nmPath   = Join-Path $ProjectRoot "node_modules"
$nextBin  = Join-Path $nmPath ".bin\next.cmd"
$needsInstall = $false

if (-not (Test-Path $nmPath)) {
    Write-Warn "node_modules directory missing"
    Log $DepLog "node_modules missing - will install"
    $needsInstall = $true
} elseif (-not (Test-Path $nextBin)) {
    Write-Warn "next binary missing from node_modules - likely corrupted"
    Log $DepLog "next binary missing - will clean-reinstall"
    $needsInstall = $true
} else {
    Write-OK "node_modules appears intact"
    Log $DepLog "node_modules OK"
}

# ---- 6. npm install (first attempt) --------------------------
if (-not $needsInstall) {
    Write-Step "Running npm install to sync dependencies..."
    $out = npm install 2>&1
    $installExit = $LASTEXITCODE
    $out | ForEach-Object { Log $DepLog "$_" }
    if ($installExit -eq 0) {
        Write-OK "npm install succeeded"
        Log $DepLog "npm install OK"
    } else {
        Write-Warn "npm install returned non-zero - flagging for clean reinstall"
        Log $DepLog "npm install FAILED (exit $installExit) - escalating to clean"
        $needsInstall = $true
    }
}

# ---- 7. Clean reinstall if needed ----------------------------
if ($needsInstall) {
    Write-Step "Performing clean reinstall..."
    Log $DepLog "Starting clean reinstall"

    Write-Step "Clearing npm cache..."
    npm cache clean --force 2>&1 | ForEach-Object { Log $DepLog "$_" }
    Write-OK "npm cache cleared"

    if (Test-Path $nmPath) {
        Write-Step "Removing node_modules..."
        Remove-Item -Recurse -Force $nmPath -ErrorAction SilentlyContinue
        if (Test-Path $nmPath) {
            Write-Warn "Could not fully delete node_modules - trying cmd rd..."
            cmd /c "rd /s /q `"$nmPath`"" 2>&1 | Out-Null
        }
        Write-OK "node_modules removed"
        Log $DepLog "node_modules deleted"
    }

    $lockPath = Join-Path $ProjectRoot "package-lock.json"
    if (Test-Path $lockPath) {
        Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
        Write-OK "package-lock.json removed for fresh resolution"
        Log $DepLog "package-lock.json removed"
    }

    Write-Step "Running npm install (fresh)..."
    $out = npm install 2>&1
    $installExit = $LASTEXITCODE
    $out | ForEach-Object { Log $DepLog "$_" }

    if ($installExit -eq 0) {
        Write-OK "Fresh npm install succeeded"
        Log $DepLog "Fresh npm install OK"
    } else {
        Write-Fail "npm install failed even after clean! Exit: $installExit"
        Log $DepLog "CRITICAL: npm install failed after clean (exit $installExit)"
        Write-Info "Attempting legacy-peer-deps fallback..."
        $out2 = npm install --legacy-peer-deps 2>&1
        $out2 | ForEach-Object { Log $DepLog "$_" }
        if ($LASTEXITCODE -eq 0) {
            Write-OK "Installed with --legacy-peer-deps"
            Log $DepLog "npm install --legacy-peer-deps OK"
        } else {
            Write-Fail "All install strategies failed. Manual intervention required."
            Log $DepLog "CRITICAL: all install strategies failed"
        }
    }
}

# ---- 8. npm audit fix ----------------------------------------
Write-Host ""
Write-Step "Running npm audit..."
$auditOut = npm audit 2>&1
$auditOut | ForEach-Object { Log $DepLog "$_" }

$critCount = 0
$highCount = 0
$auditOut | ForEach-Object {
    if ($_ -match "critical") { $critCount++ }
    if ($_ -match " high")    { $highCount++ }
}
Log $DepLog "Audit: $critCount critical, $highCount high"

if ($critCount -gt 0 -or $highCount -gt 0) {
    Write-Warn "$critCount critical / $highCount high vulnerabilities found. Fixing..."

    Write-Step "npm audit fix..."
    npm audit fix 2>&1 | ForEach-Object { Log $DepLog "$_" }

    $auditOut2 = npm audit 2>&1
    $critAfter = 0
    $auditOut2 | ForEach-Object { if ($_ -match "critical") { $critAfter++ } }

    if ($critAfter -gt 0) {
        Write-Warn "Critical vulns remain - running npm audit fix --force..."
        npm audit fix --force 2>&1 | ForEach-Object { Log $DepLog "$_" }
        Write-OK "npm audit fix --force completed"
        Log $DepLog "npm audit fix --force completed"
    } else {
        Write-OK "Vulnerabilities resolved with npm audit fix"
        Log $DepLog "Vulnerabilities resolved"
    }
} else {
    Write-OK "No critical/high vulnerabilities found"
    Log $DepLog "No critical vulnerabilities"
}

# ---- 9. TypeScript diagnostic (non-blocking) -----------------
Write-Host ""
Write-Step "Running TypeScript type-check (non-blocking)..."
$tscBin = Join-Path $ProjectRoot "node_modules\.bin\tsc.cmd"
if (Test-Path $tscBin) {
    $tscOut = & $tscBin --noEmit 2>&1
    $tsErrors = 0
    $tscOut | ForEach-Object {
        Log $DepLog "$_"
        if ($_ -match "error TS") { $tsErrors++ }
    }
    if ($tsErrors -eq 0) {
        Write-OK "TypeScript: No errors"
        Log $DepLog "TypeScript: 0 errors"
    } else {
        Write-Warn "TypeScript: $tsErrors error(s) found (non-blocking - Next.js will still run)"
        Log $DepLog "TypeScript: $tsErrors error(s)"
    }
} else {
    Write-Warn "tsc not found in node_modules - skipping TS check"
    Log $DepLog "TypeScript check skipped - tsc not available"
}

# ---- 10. ESLint check (non-blocking) -------------------------
Write-Step "Running ESLint check (non-blocking)..."
$eslintBin = Join-Path $ProjectRoot "node_modules\.bin\eslint.cmd"
if (Test-Path $eslintBin) {
    $eslintOut = npm run lint 2>&1
    $lintErrors = 0
    $eslintOut | ForEach-Object {
        Log $DepLog "$_"
        if ($_ -match "error") { $lintErrors++ }
    }
    Write-OK "ESLint check complete ($lintErrors error lines)"
    Log $DepLog "ESLint: $lintErrors error lines"
} else {
    Write-Warn "ESLint not found - skipping"
    Log $DepLog "ESLint check skipped"
}

# ---- 11. Dependency Summary ----------------------------------
Write-Host ""
Write-Host "  +================================================+" -ForegroundColor Magenta
Write-Host "  |        DEPENDENCY REPAIR SUMMARY              |" -ForegroundColor Magenta
Write-Host "  +================================================+" -ForegroundColor Magenta
Write-Host ""

$nmOK  = Test-Path (Join-Path $ProjectRoot "node_modules\.bin\next.cmd")
$pkgOK = Test-Path $pkgPath
$envOK = Test-Path $envPath

$nmText  = Get-StatusText -ok $nmOK  -goodText "OK" -badText "BROKEN"
$pkgText = Get-StatusText -ok $pkgOK -goodText "OK" -badText "MISSING"
$envText = Get-StatusText -ok $envOK -goodText "OK" -badText "MISSING"

Write-Host "  package.json   : $pkgText" -ForegroundColor (Get-StatusColor -ok $pkgOK)
Write-Host "  node_modules   : $nmText"  -ForegroundColor (Get-StatusColor -ok $nmOK)
Write-Host "  .env file      : $envText" -ForegroundColor (Get-StatusColor -ok $envOK)
Write-Host "  Audit Vulns    : Critical=$critCount  High=$highCount"
Write-Host ""
Write-Host "  Full report    : $DepLog" -ForegroundColor DarkGray
Write-Host ""

Log $DepLog "Repair complete. node_modules:$nmOK pkg:$pkgOK env:$envOK"
Write-OK "repair-system.ps1 completed."
