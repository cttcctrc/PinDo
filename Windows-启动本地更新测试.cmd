@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing_node
node scripts\local-update-server.cjs release-update 8787
pause
exit /b %errorlevel%
:missing_node
echo Please install the supported Node.js LTS release first.
pause
exit /b 1
