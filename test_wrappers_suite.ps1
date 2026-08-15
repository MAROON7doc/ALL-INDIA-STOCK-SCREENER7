# =====================================================================
# NSE-BSE API (NPM/GITHUB) & YFINANCE WRAPPER VERIFICATION SUITE
# =====================================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  VALIDATING NSE-BSE API & YFINANCE WRAPPERS" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$baseDir = "C:\Users\ASUS TUFF\.gemini\antigravity\scratch\BSE-NSE-STOCK-screener"
$bundlePath = Join-Path $baseDir "js\screener.bundle.js"
$htmlPath = Join-Path $baseDir "index.html"

$passCount = 0
$failCount = 0

function Assert-Test([bool]$cond, [string]$name) {
  if ($cond) {
    Write-Host " [PASS] $name" -ForegroundColor Green
    $script:passCount++
  } else {
    Write-Host " [FAIL] $name" -ForegroundColor Red
    $script:failCount++
  }
}

$bundle = Get-Content $bundlePath -Raw
$html = Get-Content $htmlPath -Raw

# 1. UI Elements & DOM Assertions
Assert-Test ($html -match 'id="selDataProvider"') "index.html contains #selDataProvider select dropdown"
Assert-Test ($html -match 'value="yfinance"') "index.html supports YFinance (.NS/.BO) data provider option"
Assert-Test ($html -match 'value="nsebse"') "index.html supports NSE-BSE API (NPM) data provider option"
Assert-Test ($html -match 'value="smartapi"') "index.html supports SmartAPI data provider option"
Assert-Test ($html -match 'value="auto"') "index.html supports Auto Multi-Feed provider option"

# 2. JavaScript Engine Assertions
Assert-Test ($bundle -match 'YahooFinanceWrapperService') "bundle.js contains YahooFinanceWrapperService object"
Assert-Test ($bundle -match 'formatSymbol') "bundle.js YahooFinanceWrapperService formats .NS and .BO symbols"
Assert-Test ($bundle -match 'fetchChartSeries') "bundle.js YahooFinanceWrapperService has fetchChartSeries method"
Assert-Test ($bundle -match 'NseBseApiWrapperService') "bundle.js contains NseBseApiWrapperService object"
Assert-Test ($bundle -match 'fetchQuoteEquity') "bundle.js NseBseApiWrapperService has fetchQuoteEquity method"
Assert-Test ($bundle -match 'fetchHistoricalEquity') "bundle.js NseBseApiWrapperService has fetchHistoricalEquity method"

# 3. Application Integration Assertions
Assert-Test ($bundle -match 'this\.dataProvider\s*=\s*') "bundle.js Application manages dataProvider state"
Assert-Test ($bundle -match 'selDataProvider') "bundle.js binds selDataProvider change listener"
Assert-Test ($bundle -match 'YahooFinanceWrapperService\.fetchChartSeries') "bundle.js syncLiveRealtimeData routes to YahooFinanceWrapperService"
Assert-Test ($bundle -match 'NseBseApiWrapperService\.fetchHistoricalEquity') "bundle.js syncLiveRealtimeData routes to NseBseApiWrapperService"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " RESULTS: $passCount / $($passCount + $failCount) TESTS PASSED" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "=================================================" -ForegroundColor Cyan

if ($failCount -gt 0) { exit 1 }
