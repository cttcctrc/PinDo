@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm >nul 2>nul
if errorlevel 1 goto missing_node
set "npm_config_registry=https://registry.npmmirror.com"
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
set "ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/"
if not exist "node_modules\.bin\electron-builder.cmd" call npm install --no-audit --no-fund
if errorlevel 1 goto failed
call npm run build:update-test
if errorlevel 1 goto failed
echo [PinDo] Beta 6.9 update test package is ready in release-update.
explorer "%~dp0release-update"
pause
exit /b 0
:missing_node
echo Please install the supported Node.js LTS release first.
pause
exit /b 1
:failed
echo Build failed. No update package is claimed.
pause
exit /b 1
