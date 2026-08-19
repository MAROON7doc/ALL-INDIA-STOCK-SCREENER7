$utf8 = New-Object System.Text.UTF8Encoding($false)

$htmlFiles = @("index.html", "mobile.html", "chart.html")
$jsPath = (Resolve-Path "js\screener.bundle.js").Path
$jsContent = [System.IO.File]::ReadAllText($jsPath, $utf8)

Write-Host "=== AUDIT OF ALL BUTTONS, SLIDERS, INPUTS ACROSS HTML FILES ===" -ForegroundColor Cyan

foreach ($hf in $htmlFiles) {
    if (-not (Test-Path $hf)) { continue }
    $hContent = [System.IO.File]::ReadAllText((Resolve-Path $hf).Path, $utf8)
    
    $matches = [System.Text.RegularExpressions.Regex]::Matches($hContent, 'id=["'']((btn|chk|rng|sel|txt|tab)[^"'']+)["'']')
    $ids = @{}
    foreach ($m in $matches) {
        $ids[$m.Groups[1].Value] = $true
    }
    
    Write-Host "`nFile: $hf ($($ids.Keys.Count) interactive control IDs found)" -ForegroundColor Yellow
    foreach ($id in ($ids.Keys | Sort-Object)) {
        $inJs = $jsContent.IndexOf("'$id'") -ge 0 -or $jsContent.IndexOf("""$id""") -ge 0 -or $jsContent.IndexOf("#$id") -ge 0
        if ($inJs) {
            Write-Host "  [BOUND] $id" -ForegroundColor Green
        } else {
            Write-Host "  [UNBOUND] $id" -ForegroundColor Red
        }
    }
}
