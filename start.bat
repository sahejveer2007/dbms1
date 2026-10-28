@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download it from https://nodejs.org , install it, then run this file again.
  pause
  exit /b 1
)
echo Installing packages, please wait...
call npm install
if errorlevel 1 (
  echo npm install failed. Check your internet connection and try again.
  pause
  exit /b 1
)
call npm start
pause
