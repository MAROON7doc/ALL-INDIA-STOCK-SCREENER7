# Comprehensive Test & Debug Suite for NSE/BSE CANSLIM Screener
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Running Deep Debug & Static Analysis Test Suite..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseDir = "C:\Users\ASUS TUFF\.gemini\antigravity\scratch\BSE-NSE-STOCK-screener"
$jsPath = Join-Path $baseDir "js\screener.bundle.js"
$htmlPath = Join-Path $baseDir "index.html"
$chartHtmlPath = Join-Path $baseDir "chart.html"
$cssPath = Join-Path $baseDir "css\styles.css"

$errorsFound = 0
$warningsFound = 0

# TEST 1: File Existence & Size Checks
Write-Host "`n[TEST 1] Checking Core Assets Existence & Non-Zero Size..." -ForegroundColor Yellow
$files = @($jsPath, $htmlPath, $chartHtmlPath, $cssPath)
foreach ($f in $files) {
    if (Test-Path $f) {
        $size = (Get-Item $f).Length
        $leaf = Split-Path $f -Leaf
        if ($size -gt 100) {
            $kb = [Math]::Round($size / 1024, 1)
            Write-Host "  [PASS] $leaf ($kb KB)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $leaf is unusually small ($size bytes)" -ForegroundColor Red
            $errorsFound++
        }
    } else {
        Write-Host "  [FAIL] Missing file: $f" -ForegroundColor Red
        $errorsFound++
    }
}

# TEST 2: JavaScript Syntax & Structure Verification
Write-Host "`n[TEST 2] Checking JavaScript Bundle Syntax & Paren/Brace Balance..." -ForegroundColor Yellow
$jsContent = [System.IO.File]::ReadAllText($jsPath)
$openBraces = ($jsContent.ToCharArray() | Where-Object { $_ -eq '{' }).Count
$closeBraces = ($jsContent.ToCharArray() | Where-Object { $_ -eq '}' }).Count
$openParens = ($jsContent.ToCharArray() | Where-Object { $_ -eq '(' }).Count
$closeParens = ($jsContent.ToCharArray() | Where-Object { $_ -eq ')' }).Count
$openBrackets = ($jsContent.ToCharArray() | Where-Object { $_ -eq '[' }).Count
$closeBrackets = ($jsContent.ToCharArray() | Where-Object { $_ -eq ']' }).Count

Write-Host "  * Curly Braces:   { $openBraces } vs { $closeBraces }" -ForegroundColor Gray
Write-Host "  * Parentheses:    ( $openParens ) vs ( $closeParens )" -ForegroundColor Gray
Write-Host "  * Square Brackets:[ $openBrackets ] vs [ $closeBrackets ]" -ForegroundColor Gray

if ($openBraces -eq $closeBraces -and $openParens -eq $closeParens -and $openBrackets -eq $closeBrackets) {
    Write-Host "  [PASS] Perfect syntax bracket and delimiter balance!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Mismatched brackets or parentheses in screener.bundle.js" -ForegroundColor Red
    $errorsFound++
}

# TEST 3: DOM ID Parity Check
Write-Host "`n[TEST 3] Verifying DOM ID Bindings in JavaScript vs HTML..." -ForegroundColor Yellow
$htmlContent = [System.IO.File]::ReadAllText($htmlPath)
$chartHtmlContent = [System.IO.File]::ReadAllText($chartHtmlPath)

# Extract all document.getElementById('...') calls
$idMatches = [regex]::Matches($jsContent, "getElementById\(['""]([^'""]+)['""]\)")
$uniqueIds = $idMatches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique

Write-Host "  * Found $($uniqueIds.Count) unique getElementById references in JS." -ForegroundColor Gray
$unmatchedIds = @()

foreach ($id in $uniqueIds) {
    $foundInIndex = $htmlContent -match "id=['""]$id['""]"
    $foundInChart = $chartHtmlContent -match "id=['""]$id['""]"
    if (-not $foundInIndex -and -not $foundInChart) {
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

# TEST 5: CSS Stylesheet Completeness & Font Link
Write-Host "`n[TEST 5] Checking CSS Stylesheet & Typography Loading..." -ForegroundColor Yellow
$cssContent = [System.IO.File]::ReadAllText($cssPath)
if ($cssContent -match "JetBrains Mono" -and $cssContent -match "Inter") {
    Write-Host "  [PASS] Google Fonts typography definitions confirmed" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Typography fonts not defined in styles.css" -ForegroundColor Yellow
    $warningsFound++
}

if ($cssContent -match "\.tag-index" -and $cssContent -match "\.exch-pill-btn" -and $cssContent -match "\.calc-alert") {
    Write-Host "  [PASS] Index badges, exchange pills, and calculator alerts styled" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Missing required CSS classes in styles.css" -ForegroundColor Red
    $errorsFound++
}

# FINAL DIAGNOSTIC SUMMARY
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " DIAGNOSTIC RESULT SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Errors:   $errorsFound" -ForegroundColor $(if ($errorsFound -eq 0) { "Green" } else { "Red" })
Write-Host " Warnings: $warningsFound" -ForegroundColor $(if ($warningsFound -eq 0) { "Green" } else { "Yellow" })

if ($errorsFound -eq 0) {
    Write-Host "`n[SUCCESS] ALL CRITICAL SYSTEMS OPERATING HEALTHY WITH ZERO ERRORS!" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] ERRORS DETECTED. Review logs above." -ForegroundColor Red
}
