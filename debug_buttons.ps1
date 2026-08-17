$html = Get-Content ".\index.html" -Raw
$matches = [regex]::Matches($html, "<button[^>]*>")
Write-Host "Total Buttons in index.html: $($matches.Count)" -ForegroundColor Cyan
foreach ($m in $matches) {
    Write-Host "  $($m.Value)"
}
