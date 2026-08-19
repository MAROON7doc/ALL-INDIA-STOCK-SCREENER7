# ==============================================================================
# UNIVERSAL INDIAN STOCK SCREENER - CONVENIENCE ROOT LAUNCHER
# Calls backend/server.ps1 on port 8080
# ==============================================================================

param(
    [int]$Port = 8080
)

$backendScript = Join-Path $PSScriptRoot "backend\server.ps1"
if (Test-Path $backendScript) {
    & $backendScript -Port $Port
} else {
    Write-Host "[ERROR] backend/server.ps1 not found." -ForegroundColor Red
}