$utf8 = New-Object System.Text.UTF8Encoding($false)
$file = (Resolve-Path "js\screener.bundle.js").Path
$content = [System.IO.File]::ReadAllText($file, $utf8)

$terms = @(
    'heatmapSectorsGrid', 'heatmapTopGainersList', 'findeskPerfCanvas',
    'findeskDonutCanvas', 'findeskHoldingsBody', 'sectorMatrixCanvas',
    'sectorGaugeCanvas', 'sectorListSidebar'
)

foreach ($t in $terms) {
    $idx = $content.IndexOf($t)
    Write-Host "Term '$t': Index = $idx"
}
