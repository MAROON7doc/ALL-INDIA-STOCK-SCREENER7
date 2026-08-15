# =====================================================================
# JS SCOPE DUPLICATE DECLARATION & BLOCK SCANNER
# =====================================================================

$bundle = Get-Content "C:\Users\ASUS TUFF\.gemini\antigravity\scratch\BSE-NSE-STOCK-screener\js\screener.bundle.js"

$errors = @()

# Check methods in InteractiveGPUChart
$inMethod = $false
$methodName = ""
$declaredVars = @{}
$braceDepth = 0

for ($i = 0; $i -lt $bundle.Length; $i++) {
  $line = $bundle[$i]
  $lineNum = $i + 1

  # Match method start
  if ($line -match '^\s*([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{') {
    $methodName = $matches[1]
    $declaredVars = @{}
    $braceDepth = 1
    $inMethod = $true
    continue
  }

  if ($inMethod) {
    # Count braces in line
    $openB = ([regex]::Matches($line, '\{')).Count
    $closeB = ([regex]::Matches($line, '\}')).Count
    $braceDepth += ($openB - $closeB)

    # Find const and let declarations
    $declarations = [regex]::Matches($line, '\b(const|let)\s+([a-zA-Z0-9_]+)\b')
    foreach ($d in $declarations) {
      $varName = $d.Groups[2].Value
      if ($declaredVars.ContainsKey($varName)) {
        $prevLine = $declaredVars[$varName]
        $errors += "Method [$methodName] line $lineNum : duplicate declaration of '$varName' (previously declared on line $prevLine)"
      } else {
        $declaredVars[$varName] = $lineNum
      }
    }

    if ($braceDepth -le 0) {
      $inMethod = $false
    }
  }
}

if ($errors.Count -eq 0) {
  Write-Host "[SUCCESS] Zero duplicate variable declarations across all methods in bundle.js!" -ForegroundColor Green
} else {
  Write-Host "[ERROR] Found duplicate variable declarations:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}
