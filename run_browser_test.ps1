$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}
Write-Host "Using Edge binary at: $edgePath"

$url = "file:///C:/Users/ASUS%20TUFF/.gemini/antigravity/scratch/BSE-NSE-STOCK-screener/index.html"
$output = & $edgePath --headless --dump-dom $url

Write-Host "Output DOM length: $($output.Length)"

# Check if dynamically rendered items appear in DOM
if ($output -match "selected-stock-row" -or $output -match "btn-analyze") {
    Write-Host "[SUCCESS] JavaScript executed and populated table rows!" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Table rows not found in dumped DOM - JS initialization failed!" -ForegroundColor Red
}

if ($output -match "news-card") {
    Write-Host "[SUCCESS] News feed rendered!" -ForegroundColor Green
} else {
    Write-Host "[FAIL] News feed not rendered!" -ForegroundColor Red
}
