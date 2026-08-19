# Root convenience entry point - calls backend/server.ps1
param([int]$Port = 8080)
& "$PSScriptRoot\backend\server.ps1" -Port $Port