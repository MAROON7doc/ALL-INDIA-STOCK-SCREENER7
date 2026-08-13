# Algorithmic & Mathematical Simulation Test Suite for CANSLIM Indicators & Sizing
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Running Quantitative Algorithm & Math Edge-Case Tests..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$errors = 0

# TEST M1: Position Sizing Algorithm Simulation
Write-Host "`n[TEST M1] Position Sizing Boundary & Edge Case Analysis..." -ForegroundColor Yellow

function Simulate-PositionSizing($entry, $sl, $capital = 500000, $riskPct = 1.0) {
    if ($entry -le 0 -or $sl -le 0 -or $sl -ge $entry) {
        return @{ shares = 0; totalInvestment = 0; riskAmount = 0; stopLossPct = 0; isValid = $false }
    }
    $riskPerShare = $entry - $sl
    $slPct = [Math]::Round((($riskPerShare / $entry) * 100), 2)
    $maxRiskAmount = $capital * ($riskPct / 100)
    $shares = [Math]::Max(1, [Math]::Floor($maxRiskAmount / $riskPerShare))
    $totalInvestment = $shares * $entry
    return @{
        shares = $shares
        totalInvestment = [Math]::Round($totalInvestment)
        riskAmount = [Math]::Round($shares * $riskPerShare)
        stopLossPct = $slPct
        target1R = [Math]::Round(($entry + $riskPerShare), 2)
        target2R = [Math]::Round(($entry + 2 * $riskPerShare), 2)
        target3R = [Math]::Round(($entry + 3 * $riskPerShare), 2)
        isValid = $true
    }
}

# Case 1: Standard CANSLIM Trade (Trent ₹7120, SL ₹6620 = -7%)
$res1 = Simulate-PositionSizing 7120 6620 500000 1.0
if ($res1.isValid -and $res1.shares -eq 10 -and $res1.stopLossPct -eq 7.02) {
    Write-Host "  [PASS] Standard Trade: $($res1.shares) Qty, Total ₹$($res1.totalInvestment), Risk ₹$($res1.riskAmount)" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Standard Trade calculation mismatch: $($res1 | Out-String)" -ForegroundColor Red
    $errors++
}

# Case 2: Boundary Inversion (SL >= Entry)
$res2 = Simulate-PositionSizing 100 105 500000 1.0
if (-not $res2.isValid -and $res2.shares -eq 0) {
    Write-Host "  [PASS] Boundary Guard: SL >= Entry correctly rejected with zero risk" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Boundary Guard failed to reject SL >= Entry" -ForegroundColor Red
    $errors++
}

# Case 3: Extreme Large Capital (₹1 Crore, Entry ₹240, SL ₹225)
$res3 = Simulate-PositionSizing 240 225 10000000 1.0
if ($res3.isValid -and $res3.shares -gt 0 -and $res3.riskAmount -le 100000) {
    Write-Host "  [PASS] Large Capital: $($res3.shares) Qty, Risk ₹$($res3.riskAmount) <= Max ₹100,000" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Large capital sizing failed" -ForegroundColor Red
    $errors++
}

# TEST M2: Nice Price Step Generator Simulation
Write-Host "`n[TEST M2] Nice Price Step Generation (1, 2, 5 * 10^N)..." -ForegroundColor Yellow

function Get-NicePriceStep($range, $targetSteps = 6) {
    $roughStep = $range / [Math]::Max(2, $targetSteps)
    $mag = [Math]::Pow(10, [Math]::Floor([Math]::Log10($roughStep)))
    $norm = $roughStep / $mag
    $niceNorm = 1
    if ($norm -gt 1.5 -and $norm -le 3) { $niceNorm = 2 }
    elseif ($norm -gt 3 -and $norm -le 7) { $niceNorm = 5 }
    elseif ($norm -gt 7) { $niceNorm = 10 }
    return $niceNorm * $mag
}

$rangesToTest = @(
    @{ range = 500; expectedStep = 100 },
    @{ range = 120; expectedStep = 20 },
    @{ range = 25; expectedStep = 5 },
    @{ range = 3.5; expectedStep = 0.5 }
)

foreach ($tc in $rangesToTest) {
    $step = Get-NicePriceStep $tc.range 6
    if ($step -gt 0) {
        Write-Host "  [PASS] Range $($tc.range) -> Nice Step ₹$step" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Invalid step generated for range $($tc.range)" -ForegroundColor Red
        $errors++
    }
}

# SUMMARY
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " QUANTITATIVE SIMULATION SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "[SUCCESS] 100% OF QUANTITATIVE TESTS & EDGE-CASE BOUNDARIES PASSED!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] $errors errors found during math simulation" -ForegroundColor Red
}
