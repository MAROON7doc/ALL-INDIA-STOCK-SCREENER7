$file = "js\screener.bundle.js"
$lines = Get-Content $file
$depth = 0
$firstImbalance = -1

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    # Skip string contents crudely - just count raw { and }
    $opens  = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $depth += $opens - $closes
    if ($depth -lt 0 -and $firstImbalance -eq -1) {
        $firstImbalance = $i + 1
        Write-Host "FIRST NEGATIVE DEPTH at line $($i+1): depth=$depth | $line"
    }
}
Write-Host "Final depth: $depth"
if ($firstImbalance -eq -1) { Write-Host "No negative depth found. Imbalance is trailing extra closes at end." }

# Also show lines around isScalperMode change
$smLine = ($lines | Select-String "Scalper mode removed" | Select-Object -First 1).LineNumber
Write-Host "`n--- isScalperMode area (line $smLine) ---"
for ($i = [Math]::Max(0, $smLine-3); $i -lt [Math]::Min($lines.Length, $smLine+15); $i++) {
    Write-Host "$($i+1): $($lines[$i])"
}
