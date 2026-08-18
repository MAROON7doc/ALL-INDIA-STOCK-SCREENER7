$utf8 = New-Object System.Text.UTF8Encoding($false)
$file = (Resolve-Path "js\screener.bundle.js").Path
$content = [System.IO.File]::ReadAllText($file, $utf8)

Write-Host ("File length: " + $content.Length + " chars")

# 1. Remove scalperChart init block in App.init (9 lines)
$content = [regex]::Replace($content,
    '(?s)\r?\n\s*try \{\r?\n\s*if \(document\.getElementById\(''scalperChartContainer''\)\) \{\r?\n\s*this\.scalperChart = new InteractiveGPUChart.*?\r?\n\s*this\.scalperChart\.setChartType.*?\r?\n\s*this\.scalperChart\.setInterval.*?\r?\n\s*\}\r?\n\s*\} catch \(e\) \{\r?\n\s*console\.warn\(''scalperChartContainer chart init error:'', e\);\r?\n\s*\}',
    '')

# 2. Remove bindScalperControls() call
$content = $content.Replace("      try { this.bindScalperControls(); } catch (e) {}", "")

# 3. Remove scalperChart live tick from stream loop
$content = [regex]::Replace($content,
    '\r?\n\s*if \(this\.scalperChart\) this\.scalperChart\.updateRealtimeTick\([^;]+;',
    '')

# 4. Remove startAnimationLoop from constructor
$content = [regex]::Replace($content,
    '\r?\n      this\.startAnimationLoop\(\);(\r?\n      \})',
    '$1')

# 5. Remove runScan from live stream (replace with comment so stream still works)
$content = $content.Replace(
    "        this.runScan();",
    "        // runScan() NOT called from live stream (causes DOM rebuild scroll)")

# 6. Remove viewScalperTerminal nav references
$content = [regex]::Replace($content,
    '\r?\n\s*else if \(targetView === ''viewScalperTerminal''\) this\.renderScalperTerminal\(\);',
    '')

# 7. Neutralize isScalperMode block
$content = $content.Replace(
    "if (this.isScalperMode) {",
    "if (false) { // Scalper mode removed")

# 8. Stub out getScalperInstrumentData
$content = [regex]::Replace($content,
    '(?s)getScalperInstrumentData\(instrumentKey\) \{.*?return \{ stock, candles \};\r?\n    \}',
    "getScalperInstrumentData(instrumentKey) { return null; }")

# 9. Stub out renderScalperTerminal
$content = [regex]::Replace($content,
    '(?s)renderScalperTerminal\(\) \{.*?(?=\r?\n    renderSectorDeepDive\(\))',
    "renderScalperTerminal() { /* Scalper removed */ }" + "`r`n`r`n    ")

# 10. Fix bindScalperControls - remove scalper-specific code, keep non-scalper
$scalperStart = '    bindScalperControls() {'
$keepFrom = '      // fx Indicators Menu toggle'
$idx1 = $content.IndexOf($scalperStart)
$idx2 = $content.IndexOf($keepFrom, $idx1)
if ($idx1 -ge 0 -and $idx2 -gt $idx1) {
    $content = $content.Substring(0, $idx1 + $scalperStart.Length) +
               "`r`n" +
               $content.Substring($idx2)
    Write-Host "bindScalperControls trimmed successfully"
}

[System.IO.File]::WriteAllText($file, $content, $utf8)
Write-Host "Scalper removal complete. UTF-8 encoding preserved."
Write-Host ("scalperChart remaining refs: " + ([regex]::Matches($content, 'this\.scalperChart(?!\s*=\s*null)').Count))
