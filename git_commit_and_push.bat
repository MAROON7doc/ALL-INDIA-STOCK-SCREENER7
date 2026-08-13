@echo off
title Git Commit and Push Helper
cd /d "%~dp0"

echo ========================================================
echo   NSE/BSE Screener - Quick Git Commit & Push Helper
echo ========================================================
echo.

set GIT_EXE="C:\Users\ASUS TUFF\.gemini\antigravity\scratch\mingit\cmd\git.exe"

echo [1/4] Checking Git status...
%GIT_EXE% status
echo.

set /p MSG="Enter commit message (or press Enter for default): "
if "%MSG%"=="" set MSG=update: recent improvements and live data updates

echo.
echo [2/4] Adding all files...
%GIT_EXE% add -A

echo.
echo [3/4] Committing changes...
%GIT_EXE% commit -m "%MSG%"

echo.
echo [4/4] Pushing to GitHub (origin main)...
%GIT_EXE% push -u origin main --force

echo.
echo ========================================================
if %ERRORLEVEL% EQU 0 (
    echo   [SUCCESS] Changes committed and pushed to GitHub!
) else (
    echo   [NOTE] If push asks for login, provide your GitHub PAT.
)
echo ========================================================
echo.
pause
