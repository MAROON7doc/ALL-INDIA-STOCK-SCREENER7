$js = Get-Content ".\js\screener.bundle.js" -Raw

# Test parsing the bundle with JScript or Edge headless
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}

$testHtml = @"
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<div id="mainCanvasContainer"></div>
<div id="modalCanvasContainer"></div>
<script src="js/screener.bundle.js"></script>
</body>
</html>
"@

Set-Content -Path "test_syntax.html" -Value $testHtml

$pinfo = New-Object System.Diagnostics.ProcessStartInfo
$pinfo.FileName = $edgePath
$pinfo.Arguments = "--headless --allow-file-access-from-files --dump-dom `"file:///$PSScriptRoot/test_syntax.html`""
$pinfo.RedirectStandardOutput = $true
$pinfo.RedirectStandardError = $true
$pinfo.UseShellExecute = $false
$pinfo.CreateNoWindow = $true

$p = New-Object System.Diagnostics.Process
$p.StartInfo = $pinfo
$p.Start() | Out-Null
$stdout = $p.StandardOutput.ReadToEnd()
$stderr = $p.StandardError.ReadToEnd()
$p.WaitForExit(8000)

Write-Host "Edge Stderr: $stderr"
if ($stderr -match "SyntaxError") {
    Write-Host "[FAIL] Syntax error found in bundle!" -ForegroundColor Red
} else {
    Write-Host "[PASS] No fatal syntax error found in bundle!" -ForegroundColor Green
}
