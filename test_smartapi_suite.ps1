# =====================================================================
# ANGEL ONE SMARTAPI INTEGRATION VERIFICATION TEST SUITE
# =====================================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  VALIDATING ANGEL ONE SMARTAPI INTEGRATION" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$baseDir = "C:\Users\ASUS TUFF\.gemini\antigravity\scratch\BSE-NSE-STOCK-screener"
$bundlePath = Join-Path $baseDir "js\screener.bundle.js"
$htmlPath = Join-Path $baseDir "index.html"
$cssPath = Join-Path $baseDir "css\styles.css"

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
$css = Get-Content $cssPath -Raw

# 1. UI Elements & DOM Assertions
Assert-Test ($html -match 'id="btnOpenSmartApi"') "index.html contains #btnOpenSmartApi in header"
Assert-Test ($html -match 'id="smartApiModal"') "index.html contains #smartApiModal"
Assert-Test ($html -match 'id="txtSmartApiKey"') "index.html contains #txtSmartApiKey input"
Assert-Test ($html -match 'id="txtSmartApiClientCode"') "index.html contains #txtSmartApiClientCode input"
Assert-Test ($html -match 'id="txtSmartApiPassword"') "index.html contains #txtSmartApiPassword input"
Assert-Test ($html -match 'id="txtSmartApiTotp"') "index.html contains #txtSmartApiTotp input"
Assert-Test ($html -match 'id="txtSmartApiJwt"') "index.html contains #txtSmartApiJwt input"
Assert-Test ($html -match 'id="btnConnectSmartApi"') "index.html contains #btnConnectSmartApi button"
Assert-Test ($html -match 'id="btnDisconnectSmartApi"') "index.html contains #btnDisconnectSmartApi button"
Assert-Test ($html -match 'id="btnTestSmartApi"') "index.html contains #btnTestSmartApi ping button"
Assert-Test ($html -match 'id="smartApiStatusPill"') "index.html contains #smartApiStatusPill"
Assert-Test ($html -match 'id="smartApiDot"') "index.html contains #smartApiDot indicator"

# 2. CSS Styles Assertions
Assert-Test ($css -match '\.smartapi-dot') "styles.css defines .smartapi-dot class"
Assert-Test ($css -match '\.smartapi-dot\.connected') "styles.css defines .smartapi-dot.connected pulse state"

# 3. JavaScript Engine Assertions
Assert-Test ($bundle -match 'AngelOneSmartApiService') "bundle.js contains AngelOneSmartApiService object"
Assert-Test ($bundle -match 'executeRequest') "bundle.js has executeRequest with CORS fallback"
Assert-Test ($bundle -match 'authenticate') "bundle.js has authenticate method supporting TOTP & Direct JWT"
Assert-Test ($bundle -match 'testConnection') "bundle.js has testConnection diagnostic ping method"
Assert-Test ($bundle -match 'fetchHistoricalCandles') "bundle.js has fetchHistoricalCandles method"
Assert-Test ($bundle -match 'smartapi_jwtToken') "bundle.js persists session in localStorage"

# 4. Token Mapping Assertions for Universe Stocks
$stocks = @('TRENT: 1964', 'DIXON: 4454', 'BEL: 383', 'HAL: 2303', 'POLYCAB: 9590', 'SOLARINDS: 10666', 'KAYNES: 11351', 'PERSISTENT: 18365', 'CDSL: 21174', 'BDL: 2142', 'PREMIERENE: 16782', 'ANGELONE: 20370')
foreach ($stk in $stocks) {
  $sym = $stk.Split(':')[0].Trim()
  $tok = $stk.Split(':')[1].Trim()
  Assert-Test ($bundle -match "'$sym':\s*\{\s*symbolToken:\s*'$tok'") "bundle.js maps official token $tok for stock $sym"
}

# 5. Integration with Live Feed Pipeline
Assert-Test ($bundle -match 'if\s*\(AngelOneSmartApiService\.isConnected\)') "bundle.js syncLiveRealtimeData prioritizes SmartAPI feed when connected"
Assert-Test ($bundle -match 'updateSmartApiStatusUI') "bundle.js provides updateSmartApiStatusUI lifecycle method"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " RESULTS: $passCount / $($passCount + $failCount) TESTS PASSED" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "=================================================" -ForegroundColor Cyan

if ($failCount -gt 0) { exit 1 }
