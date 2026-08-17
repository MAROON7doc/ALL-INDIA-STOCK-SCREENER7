$js = Get-Content ".\js\screener.bundle.js" -Raw

# Test stock matches for user_master preset
# Let's inspect getStockUniverse in bundle
Write-Host "Analyzing stock universe criteria..." -ForegroundColor Cyan
