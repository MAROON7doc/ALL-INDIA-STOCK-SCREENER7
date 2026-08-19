@echo off
title Universal Indian Stock Screener - Backend Server
echo ===================================================================
echo   UNIVERSAL INDIAN STOCK SCREENER - REST API ^& CLIENT SERVER
echo ===================================================================
echo Starting Native Backend Server at http://localhost:8080/ ...
start "" "http://localhost:8080/"
powershell -ExecutionPolicy Bypass -File "%~dp0backend\server.ps1" -Port 8080
pause
