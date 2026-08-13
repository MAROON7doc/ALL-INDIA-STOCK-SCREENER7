@echo off
title Launch NSE-BSE Live Stock Screener
cd /d "%~dp0"
echo ========================================================
echo   Launching NSE/BSE Quantitative Stock Screener...
echo ========================================================
start "" "%~dp0index.html"
echo [SUCCESS] Screener opened in default browser!
exit
