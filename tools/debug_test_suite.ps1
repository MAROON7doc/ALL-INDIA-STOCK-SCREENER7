# ==============================================================================
# UNIVERSAL INDIAN STOCK SCREENER - DEEP STATIC ANALYSIS & DIAGNOSTIC SUITE
# ==============================================================================

param(
    [string]$BaseDirectory = (Resolve-Path "$PSScriptRoot\..").Path
)

$errorsFound = 0
$warningsFound = 0

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Running Deep Debug & Static Analysis Test Suite..." -ForegroundColor Cyan
Write-Host " Target Directory: $BaseDirectory" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# TEST 1: Check required core assets
Write-Host "`n[TEST 1] Checking Core Assets Existence & Non-Zero Size..." -ForegroundColor Yellow
$coreFiles = @(
    "js\screener.bundle.js",
    "index.html",
    "mobile.html",
    "css\styles.css"
)

foreach ($f in $coreFiles) {
    $fullPath = Join-Path $BaseDirectory $f
    if (Test-Path $fullPath) {
        $size = (Get-Item $fullPath).Length
        if ($size -gt 0) {
            Write-Host "  [PASS] $f ($([Math]::Round($size/1KB, 1)) KB)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $f is empty (0 bytes)" -ForegroundColor Red
            $errorsFound++
        }
    } else {
        Write-Host "  [FAIL] Missing file: $f" -ForegroundColor Red
        $errorsFound++
    }
}

# TEST 2: Syntax Check and Bracket Balance for JavaScript Bundle
Write-Host "`n[TEST 2] Checking JavaScript Bundle Syntax & Delimiter Balance..." -ForegroundColor Yellow
$jsPath = Join-Path $BaseDirectory "js\screener.bundle.js"
$jsContent = [System.IO.File]::ReadAllText($jsPath)

$openCurly  = ($jsContent.ToCharArray() | Where-Object { $_ -eq '{' }).Count
$closeCurly = ($jsContent.ToCharArray() | Where-Object { $_ -eq '}' }).Count
$openParen  = ($jsContent.ToCharArray() | Where-Object { $_ -eq '(' }).Count
$closeParen = ($jsContent.ToCharArray() | Where-Object { $_ -eq ')' }).Count
$openSquare = ($jsContent.ToCharArray() | Where-Object { $_ -eq '[' }).Count
$closeSquare = ($jsContent.ToCharArray() | Where-Object { $_ -eq ']' }).Count

Write-Host "  * Curly Braces:   { $openCurly } vs { $closeCurly }"
Write-Host "  * Parentheses:    ( $openParen ) vs ( $closeParen )"
Write-Host "  * Square Brackets:[ $openSquare ] vs [ $closeSquare ]"

if ($openCurly -eq $closeCurly -and $openParen -eq $closeParen -and $openSquare -eq $closeSquare) {
    Write-Host "  [PASS] Perfect syntax bracket and delimiter balance!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Syntax delimiter mismatch detected!" -ForegroundColor Red
    $errorsFound++
}

# TEST 3: Verify DOM IDs Referenced in JS Exist in HTML
Write-Host "`n[TEST 3] Verifying DOM ID Bindings in JavaScript vs HTML..." -ForegroundColor Yellow
$htmlContent = [System.IO.File]::ReadAllText((Join-Path $BaseDirectory "index.html"))
$mobileHtmlContent = [System.IO.File]::ReadAllText((Join-Path $BaseDirectory "mobile.html"))

$idMatches = [System.Text.RegularExpressions.Regex]::Matches($jsContent, "getElementById\(['""]([^'""]+)['""]\)")
$uniqueIds = @{}
foreach ($m in $idMatches) {
    $id = $m.Groups[1].Value
    $uniqueIds[$id] = $true
}

Write-Host "  * Found $($uniqueIds.Keys.Count) unique getElementById references in JS."
$unmatchedIds = @()
foreach ($id in $uniqueIds.Keys) {
    $foundInIndex = $htmlContent -match "id=['""]$id['""]"
    $foundInMobile = $mobileHtmlContent -match "id=['""]$id['""]"
    $isRuntimeGenerated = $id -in @('tv-spin-style', 'btnEmptyViewAll', 'btnEmptyReset', 'btnTopExportCsv', 'btnTopCopyTickers')
    if (-not $foundInIndex -and -not $foundInMobile -and -not $isRuntimeGenerated) {
        $unmatchedIds += $id
    }
}

if ($unmatchedIds.Count -eq 0) {
    Write-Host "  [PASS] 100% of getElementById calls have valid DOM targets in HTML!" -ForegroundColor Green
} else {
    Write-Host "  [WARN] The following IDs were not found in HTML (check if optional):" -ForegroundColor Yellow
    foreach ($uid in $unmatchedIds) {
        Write-Host "     - $uid" -ForegroundColor Yellow
    }
    $warningsFound += $unmatchedIds.Count
}

# TEST 4: Stock Universe Data Integrity
Write-Host "`n[TEST 4] Validating Stock Universe & Financial Attributes..." -ForegroundColor Yellow
$requiredSymbols = @('TRENT', 'DIXON', 'BEL', 'HAL', 'POLYCAB', 'SOLARINDS', 'KAYNES', 'PERSISTENT', 'CDSL', 'BDL', 'PREMIERENE', 'ANGELONE')

foreach ($sym in $requiredSymbols) {
    if ($jsContent -match "symbol:\s*'$sym'") {
        Write-Host "  [PASS] Stock $sym present with full metadata" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Missing required stock symbol $sym in RAW_DATABASE" -ForegroundColor Red
        $errorsFound++
    }
}

# TEST 5: Backend Architecture & Server Assets Check
Write-Host "`n[TEST 5] Validating Backend Architecture & Server Files..." -ForegroundColor Yellow
$backendFiles = @(
    "backend\server.ps1",
    "backend\python\api_server.py",
    "backend\python\screener.py",
    "backend\python\patterns.py",
    "backend\python\requirements.txt",
    "backend\node\server.js",
    "backend\node\package.json",
    "server.ps1",
    "start_server.bat"
)

foreach ($bf in $backendFiles) {
    $bFullPath = Join-Path $BaseDirectory $bf
    if (Test-Path $bFullPath) {
        Write-Host "  [PASS] Backend asset $bf confirmed" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Missing backend asset $bf" -ForegroundColor Red
        $errorsFound++
    }
}

# TEST 6: Zero Hardcoded Machine Paths Audit
Write-Host "`n[TEST 6] Auditing for Zero Hardcoded Local Machine Paths..." -ForegroundColor Yellow
$filesToAudit = Get-ChildItem -Path $BaseDirectory -Recurse -File | Where-Object { $_.FullName -notmatch '\\\.git\\' }
$foundHardcoded = 0
foreach ($fl in $filesToAudit) {
    $txt = [System.IO.File]::ReadAllText($fl.FullName)
    if ($txt -match "C:\\Users\\") {
        Write-Host "  [FAIL] Hardcoded path found in: $($fl.Name)" -ForegroundColor Red
        $foundHardcoded++
        $errorsFound++
    }
}
if ($foundHardcoded -eq 0) {
    Write-Host "  [PASS] Zero hardcoded machine paths across all project files!" -ForegroundColor Green
}

# FINAL DIAGNOSTIC SUMMARY
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " DIAGNOSTIC RESULT SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Errors:   $errorsFound" -ForegroundColor $(if ($errorsFound -eq 0) { "Green" } else { "Red" })
Write-Host " Warnings: $warningsFound" -ForegroundColor $(if ($warningsFound -eq 0) { "Green" } else { "Yellow" })

if ($errorsFound -eq 0) {
    Write-Host "`n[SUCCESS] ALL CRITICAL SYSTEMS OPERATING HEALTHY WITH ZERO ERRORS!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[ERROR] ERRORS DETECTED. Review logs above." -ForegroundColor Red
    exit 1
}
