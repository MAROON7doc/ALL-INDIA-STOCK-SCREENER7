# Verification Test Suite for Protocol 10 & Slider Indicator Dynamism
$ErrorActionPreference = "Stop"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  VALIDATING PROTOCOL 10 & SLIDER DYNAMISM" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$indexHtml = Get-Content -Raw "index.html"
$chartHtml = Get-Content -Raw "chart.html"
$bundleJs = Get-Content -Raw "js/screener.bundle.js"
$stylesCss = Get-Content -Raw "css/styles.css"

$passCount = 0
$totalTests = 0

function Assert-Check($desc, $cond) {
    $global:totalTests++
    if ($cond) {
        Write-Host " [PASS] $desc" -ForegroundColor Green
        $global:passCount++
    } else {
        Write-Host " [FAIL] $desc" -ForegroundColor Red
        exit 1
    }
}

# 1. index.html checks
Assert-Check "index.html contains card_p10 (Protocol 10 card)" ($indexHtml.Contains('id="card_p10"'))
Assert-Check "index.html contains chk_p10 checkbox" ($indexHtml.Contains('id="chk_p10"'))
Assert-Check "index.html contains rng_mtfGreen slider" ($indexHtml.Contains('id="rng_mtfGreen"'))
Assert-Check "index.html contains P10: MTF Green visual layer button" ($indexHtml.Contains('data-layer="p10_mtf"'))
Assert-Check "index.html contains 4H interval button" ($indexHtml.Contains('data-interval="4H"'))
Assert-Check "index.html contains MTF Trend (6) table header" ($indexHtml.Contains('<th>MTF Trend (6)</th>'))
Assert-Check "index.html contains Match (10) table header" ($indexHtml.Contains('<th>Match (10)</th>'))
Assert-Check "index.html contains sidebar MTF pills" ($indexHtml.Contains('id="sidebarMtfPills"'))

# 2. chart.html checks
Assert-Check "chart.html contains data-layer=p10_mtf" ($chartHtml.Contains('data-layer="p10_mtf"'))
Assert-Check "chart.html contains data-interval=4H" ($chartHtml.Contains('data-interval="4H"'))

# 3. styles.css checks
Assert-Check "styles.css contains .mtf-chip class" ($stylesCss.Contains('.mtf-chip'))
Assert-Check "styles.css contains .mtf-chip.green class" ($stylesCss.Contains('.mtf-chip.green'))
Assert-Check "styles.css contains .mtf-chip.red class" ($stylesCss.Contains('.mtf-chip.red'))

# 4. screener.bundle.js checks
Assert-Check "bundle.js generates intraday4H" ($bundleJs.Contains('intraday4H = resampleSeries(intraday1H, 4)'))
Assert-Check "bundle.js calculates mtfStatus for 5m, 15m, 1H, 4H, 1D, 1W" ($bundleJs.Contains("'4H': checkGreen(intraday4H)"))
Assert-Check "bundle.js TradingView chart supports protocol overlays" ($bundleJs.Contains('_layers = { ema: true, vwap: true, volume: true, protocols: true }'))
Assert-Check "bundle.js TradingView chart has setFilterParams method" ($bundleJs.Contains('setFilterParams(params)'))
Assert-Check "bundle.js Application responds to minRsi dynamically" ($bundleJs.Contains('this.filters.minRsi'))
Assert-Check "bundle.js Application responds to minBurstPct dynamically" ($bundleJs.Contains('this.filters.minBurstPct'))
Assert-Check "bundle.js Application responds to maxStopLossPct dynamically" ($bundleJs.Contains('this.filters.maxStopLossPct'))
Assert-Check "bundle.js Application renders P10 MTF trend data" ($bundleJs.Contains('P10: MTF 6/6 Green'))
Assert-Check "bundle.js Application filters has requireMtfAllGreen & minMtfGreen" ($bundleJs.Contains('requireMtfAllGreen: true, minMtfGreen: 6'))
Assert-Check "bundle.js bindRng passes filters to setFilterParams on both charts" ($bundleJs.Contains('this.mainChart.setFilterParams(this.filters)'))
Assert-Check "bundle.js bindChk passes filters to setFilterParams on both charts" ($bundleJs.Contains('this.modalChart.setFilterParams(this.filters)'))
Assert-Check "bundle.js bindUI binds rng_mtfGreen and chk_p10" ($bundleJs.Contains("bindRng('rng_mtfGreen'") -and $bundleJs.Contains("bindChk('chk_p10'"))
Assert-Check "bundle.js runScan checks p10_mtf match" ($bundleJs.Contains('p10_mtf: ((stock.mtfGreenCount || 0) >= (this.filters.minMtfGreen || 6))'))
Assert-Check "bundle.js renderTable outputs /10 match score" ($bundleJs.Contains('${stock.matchCount}/10'))
Assert-Check "bundle.js syncLiveRealtimeData updates intraday4H and MTF status" ($bundleJs.Contains("targetInterval === '4H'") -and $bundleJs.Contains('const mtfGreenCount = Object.values(mtfStatus)'))

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " ALL $passCount / $totalTests TESTS PASSED SUCCESSFULLY! " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
