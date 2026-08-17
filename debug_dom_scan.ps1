$html = Get-Content ".\index.html" -Raw
$js = Get-Content ".\js\screener.bundle.js" -Raw

Write-Host "=== SCANNING ALL getElementById IN JS ===" -ForegroundColor Cyan
$idMatches = [regex]::Matches($js, "document\.getElementById\(['`"]([^'`"]+)['`"]\)")
$uniqueIds = $idMatches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique | Sort-Object

$missingIds = @()
foreach ($id in $uniqueIds) {
    if ($html -notmatch "id=['`"]$id['`"]") {
        $missingIds += $id
    }
}

Write-Host "Total Unique IDs checked: $($uniqueIds.Count)"
Write-Host "Missing IDs in HTML ($($missingIds.Count)):" -ForegroundColor Yellow
$missingIds | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }

Write-Host "`n=== SCANNING ALL querySelector / querySelectorAll IN JS ===" -ForegroundColor Cyan
$qsMatches = [regex]::Matches($js, "document\.querySelectorAll\(['`"]([^'`"]+)['`"]\)")
$uniqueSelectors = $qsMatches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique | Sort-Object

$missingSelectors = @()
foreach ($sel in $uniqueSelectors) {
    # Check simple class selectors like .layer-toggle, .tv-btn
    if ($sel.StartsWith(".")) {
        $className = $sel.Substring(1).Split('[')[0].Split(' ')[0].Split(':')[0]
        if ($html -notmatch "class=['`"][^'`"]*$className") {
            $missingSelectors += $sel
        }
    }
}

Write-Host "Missing Selectors ($($missingSelectors.Count)):" -ForegroundColor Yellow
$missingSelectors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
