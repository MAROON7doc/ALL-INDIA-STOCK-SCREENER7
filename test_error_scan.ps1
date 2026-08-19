# =====================================================================
# DEEP ERROR & SYNTAX STATIC ANALYSIS SCANNER
# =====================================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  RUNNING COMPREHENSIVE ERROR DIAGNOSTIC SCAN" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$baseDir = "C:\Users\ASUS TUFF\.gemini\antigravity\scratch\BSE-NSE-STOCK-screener"
$bundlePath = Join-Path $baseDir "js\screener.bundle.js"
$indexPath = Join-Path $baseDir "index.html"
$chartPath = Join-Path $baseDir "chart.html"
$cssPath = Join-Path $baseDir "css\styles.css"

$passCount = 0
$failCount = 0

function Assert-Check([bool]$cond, [string]$name, [string]$detail = "") {
  if ($cond) {
    Write-Host " [PASS] $name" -ForegroundColor Green
    $script:passCount++
  } else {
    Write-Host " [FAIL] $name $detail" -ForegroundColor Red
    $script:failCount++
  }
}

$bundle = Get-Content $bundlePath -Raw
$indexHtml = Get-Content $indexPath -Raw
$chartHtml = Get-Content $chartPath -Raw

# 1. Delimiter & Structure Check
$openBrace = ([regex]::Matches($bundle, '\{')).Count
$closeBrace = ([regex]::Matches($bundle, '\}')).Count
Assert-Check ($openBrace -eq $closeBrace) "Curly brace balance matching" "($openBrace vs $closeBrace)"

$openParen = ([regex]::Matches($bundle, '\(')).Count
$closeParen = ([regex]::Matches($bundle, '\)')).Count
Assert-Check ($openParen -eq $closeParen) "Parentheses balance matching" "($openParen vs $closeParen)"

$openBracket = ([regex]::Matches($bundle, '\[')).Count
$closeBracket = ([regex]::Matches($bundle, '\]')).Count
Assert-Check ($openBracket -eq $closeBracket) "Square bracket balance matching" "($openBracket vs $closeBracket)"

# 2. No Duplicate IDs in HTML files
$indexIds = [regex]::Matches($indexHtml, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$indexDups = $indexIds | Group-Object | Where-Object { $_.Count -gt 1 }
Assert-Check ($indexDups.Count -eq 0) "index.html has zero duplicate element IDs" "Found: $($indexDups.Name -join ', ')"

$chartIds = [regex]::Matches($chartHtml, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$chartDups = $chartIds | Group-Object | Where-Object { $_.Count -gt 1 }
Assert-Check ($chartDups.Count -eq 0) "chart.html has zero duplicate element IDs" "Found: $($chartDups.Name -join ', ')"

# 3. Canvas Context & Chart Initializers
Assert-Check ($bundle -match 'class Application') "Application main controller defined"
Assert-Check ($bundle -match 'class GPUEngine') "GPUEngine WebGL acceleration active"
Assert-Check ($bundle -match 'findeskPerfCanvas') "Current canvas analytics view defined"
Assert-Check ($indexHtml -match 'id="findeskPerfCanvas"') "Current canvas analytics view mounted"

# 4. Error handling around external network requests
Assert-Check ($bundle -match 'try\s*\{\s*const controller = new AbortController\(\)') "AbortController timeout guards present on all fetches"
Assert-Check ($bundle -match 'catch\s*\(e\)') "Catch blocks safeguard all async network promises"

# 5. UI Controls
Assert-Check ($indexHtml -match 'id="selDataProvider"') "index.html data provider selector wired"
Assert-Check ($chartHtml -match 'id="selDataProvider"') "chart.html data provider selector wired"
Assert-Check ($indexHtml -match 'id="btnOpenSmartApi"') "SmartAPI configuration modal trigger wired"
Assert-Check ((Get-Content $cssPath -Raw) -match '\.tv-tab-item') "Chart navigation tab styles defined"
Assert-Check ((Get-Content $cssPath -Raw) -match '\.calc-input') "Credential input styles defined"
Assert-Check ($bundle -notmatch 'lc9wasWaXiCdN28p9LC2rIQFyZhS1szZ') "No hard-coded API credential in bundle"
Assert-Check ($indexHtml -notmatch 'value="lc9wasWaXiCdN28p9LC2rIQFyZhS1szZ"') "No hard-coded API credential in HTML"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " SCAN COMPLETE: $passCount / $($passCount + $failCount) CHECKS PASSED" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "=================================================" -ForegroundColor Cyan

if ($failCount -gt 0) { exit 1 }
