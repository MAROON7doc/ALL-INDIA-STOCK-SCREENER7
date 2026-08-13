@echo off
title Push to GitHub
cd /d "%~dp0"
echo =======================================================
echo Pushing BSE-NSE-STOCK-screener to GitHub...
echo =======================================================
"C:\Users\ASUS TUFF\.gemini\antigravity\scratch\mingit\cmd\git.exe" push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Repository successfully pushed to GitHub!
) else (
    echo [NOTE] If prompted, please enter your GitHub username and Personal Access Token (PAT).
)
pause
