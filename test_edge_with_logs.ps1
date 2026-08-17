$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}

$url = "file:///C:/Users/ASUS%20TUFF/.gemini/antigravity/scratch/BSE-NSE-STOCK-screener/index.html"
$tempLog = "$PSScriptRoot\edge_debug.log"

$pinfo = New-Object System.Diagnostics.ProcessStartInfo
$pinfo.FileName = $edgePath
$pinfo.Arguments = "--headless --allow-file-access-from-files --disable-gpu --dump-dom `"$url`""
$pinfo.RedirectStandardOutput = $true
$pinfo.RedirectStandardError = $true
$pinfo.UseShellExecute = $false
$pinfo.CreateNoWindow = $true

$p = New-Object System.Diagnostics.Process
$p.StartInfo = $pinfo
$p.Start() | Out-Null

$stdout = $p.StandardOutput.ReadToEnd()
$stderr = $p.StandardError.ReadToEnd()
$p.WaitForExit(10000)

Write-Host "STDOUT Length: $($stdout.Length)"
Write-Host "STDERR: $stderr"

if ($stdout -match "screenerTableBody" -and $stdout -match "<tr") {
    Write-Host "[SUCCESS] screenerTableBody contains tr elements!" -ForegroundColor Green
} else {
    Write-Host "[FAIL] screenerTableBody empty in output DOM" -ForegroundColor Red
}

Set-Content -Path "$PSScriptRoot\dumped_dom.html" -Value $stdout
Write-Host "Dumped DOM saved to dumped_dom.html"
