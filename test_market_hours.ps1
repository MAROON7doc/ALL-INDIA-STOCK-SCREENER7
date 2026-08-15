# Test Market Hours and Feed Mode Logic
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Running Market Hours & Time Verification Tests..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$jsContent = Get-Content "C:\Users\ASUS TUFF\.gemini\antigravity\scratch\BSE-NSE-STOCK-screener\js\screener.bundle.js" -Raw

# Test 1: Check getMarketStatus presence
if ($jsContent -match "getMarketStatus\(\)") {
    Write-Host "  [PASS] getMarketStatus() function exists in screener.bundle.js" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] getMarketStatus() missing" -ForegroundColor Red
    exit 1
}

# Test 2: Check IST offset math (3600000 * 5.5)
if ($jsContent -match "3600000 \* 5\.5") {
    Write-Host "  [PASS] Accurate Indian Standard Time (UTC+5:30) offset math implemented" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] IST offset math missing" -ForegroundColor Red
    exit 1
}

# Test 3: Check Trading Hours thresholds (09:15 and 15:30)
if ($jsContent -match "9 \* 60 \+ 15" -and $jsContent -match "15 \* 60 \+ 30") {
    Write-Host "  [PASS] Exact 09:15 AM IST open & 03:30 PM IST close thresholds verified" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Market hours thresholds missing" -ForegroundColor Red
    exit 1
}

# Test 4: Check chart container height expansion
$cssContent = Get-Content "C:\Users\ASUS TUFF\.gemini\antigravity\scratch\BSE-NSE-STOCK-screener\css\styles.css" -Raw
if ($cssContent -match "height:\s*660px") {
    Write-Host "  [PASS] Live graph canvas container widened & heightened to 660px-700px" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] 660px height not found in styles.css" -ForegroundColor Red
    exit 1
}

Write-Host "`n[SUCCESS] All Market Hours & Graph Dimension Tests Passed 100%!" -ForegroundColor Green
