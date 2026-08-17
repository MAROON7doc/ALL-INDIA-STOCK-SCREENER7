# Test stock filtering math
$js = Get-Content ".\js\screener.bundle.js" -Raw

# Extract stocks JSON from bundle
$pattern = "const UNIVERSE_SEEDS = \[(.*?)\];\s*const MEDIAN_MEDIAN"
if ($js -match "(?s)const UNIVERSE_SEEDS = \[(.*?)\];\s*function") {
    Write-Host "Found UNIVERSE_SEEDS in bundle" -ForegroundColor Green
}
