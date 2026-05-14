Set-Location 'D:\jarivs sana'
Write-Host "Running TypeScript check..." -ForegroundColor Cyan
$tscBin = '.\node_modules\.bin\tsc.cmd'
$out = & $tscBin --noEmit 2>&1
$tsErrors = ($out | Where-Object { $_ -match 'error TS' }).Count
if ($tsErrors -eq 0) {
    Write-Host "  OK  TypeScript: 0 errors" -ForegroundColor Green
} else {
    Write-Host ("  XX  TypeScript: {0} error(s)" -f $tsErrors) -ForegroundColor Red
    $out | Where-Object { $_ -match 'error TS' } | ForEach-Object { Write-Host "      $_" -ForegroundColor Red }
}
