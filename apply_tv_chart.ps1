$utf8 = New-Object System.Text.UTF8Encoding($false)

# --- STEP 1: Add LightweightCharts CDN to index.html ---
$htmlPath = (Resolve-Path "index.html").Path
$html = [System.IO.File]::ReadAllText($htmlPath, $utf8)

$lwCdn = '<script src="https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js"></script>'
if (-not $html.Contains('lightweight-charts')) {
    $html = $html.Replace('</head>', "  $lwCdn`r`n</head>")
    [System.IO.File]::WriteAllText($htmlPath, $html, $utf8)
    Write-Host "Step 1: LW CDN added to index.html"
} else {
    Write-Host "Step 1: LW CDN already in index.html"
}

# --- STEP 2: Add LightweightCharts CDN to chart.html ---
$chartHtmlPath = (Resolve-Path "chart.html").Path
$chartHtml = [System.IO.File]::ReadAllText($chartHtmlPath, $utf8)
if (-not $chartHtml.Contains('lightweight-charts')) {
    $chartHtml = $chartHtml.Replace('</head>', "  $lwCdn`r`n</head>")
    [System.IO.File]::WriteAllText($chartHtmlPath, $chartHtml, $utf8)
    Write-Host "Step 2: LW CDN added to chart.html"
} else {
    Write-Host "Step 2: LW CDN already in chart.html"
}

# --- STEP 3: Read the JS bundle and TradingViewLWChart wrapper ---
$jsPath = (Resolve-Path "js\screener.bundle.js").Path
$js = [System.IO.File]::ReadAllText($jsPath, $utf8)
$wrapperCode = [System.IO.File]::ReadAllText((Resolve-Path "js\tv_chart_wrapper.js").Path, $utf8)

Write-Host "Step 3: JS bundle loaded ($($js.Length) chars)"

# Find line 2234 (class InteractiveGPUChart) and line 4003 (end of class) in the string
# We'll use the known class boundary markers
$classStart = '  class InteractiveGPUChart {'
$classEndMarker = '  /* ==========================================================================' + [Environment]::NewLine + '     7. MAIN APPLICATION CONTROLLER'

$startIdx = $js.IndexOf($classStart)
$endIdx = $js.IndexOf($classEndMarker)

Write-Host "InteractiveGPUChart starts at char: $startIdx"
Write-Host "Next section starts at char: $endIdx"

if ($startIdx -lt 0 -or $endIdx -lt 0) {
    Write-Host "ERROR: Could not find class boundaries! Trying alternate markers..."
    # Try alternative
    $classEndMarker2 = '  /* =========================================================================='
    $endIdx = $js.IndexOf($classEndMarker2, $startIdx + 1000)
    Write-Host "Alternate end found at: $endIdx"
}

if ($startIdx -ge 0 -and $endIdx -gt $startIdx) {
    # Replace InteractiveGPUChart class with TradingViewLWChart
    $before = $js.Substring(0, $startIdx)
    $after = $js.Substring($endIdx)
    $newJs = $before + $wrapperCode + "`r`n`r`n  " + $after
    
    # Also replace the 2 instantiation calls
    $newJs = $newJs.Replace(
        "this.mainChart = new InteractiveGPUChart('mainCanvasContainer');",
        "this.mainChart = new TradingViewLWChart('mainCanvasContainer');"
    )
    $newJs = $newJs.Replace(
        "this.modalChart = new InteractiveGPUChart('modalCanvasContainer');",
        "this.modalChart = new TradingViewLWChart('modalCanvasContainer');"
    )
    
    [System.IO.File]::WriteAllText($jsPath, $newJs, $utf8)
    Write-Host "Step 3: InteractiveGPUChart replaced with TradingViewLWChart"
    Write-Host "New JS size: $($newJs.Length) chars"
    
    # Verify no InteractiveGPUChart references remain
    $remaining = ([regex]::Matches($newJs, 'InteractiveGPUChart')).Count
    Write-Host "Remaining InteractiveGPUChart refs: $remaining"
    
    $lwRefs = ([regex]::Matches($newJs, 'TradingViewLWChart')).Count
    Write-Host "TradingViewLWChart refs: $lwRefs"
} else {
    Write-Host "ERROR: Could not replace class. startIdx=$startIdx endIdx=$endIdx"
}
