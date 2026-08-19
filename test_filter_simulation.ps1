# Test stock filtering math
$js = Get-Content ".\js\screener.bundle.js" -Raw

# Extract stocks JSON from bundle
$pattern = "(?s)const UNIVERSE_SEEDS = \[(.*?)\];\s*function"
if ($js -match $pattern) {
    Write-Host "Found UNIVERSE_SEEDS in bundle" -ForegroundColor Green
}
