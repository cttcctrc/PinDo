@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm >nul 2>nul
if errorlevel 1 goto missing_node
node -p "'[PinDo] Version: ' + require('./package.json').version"

rem Use mirrors for the large Electron runtime and electron-builder helper
rem binaries. This avoids GitHub timeouts during the first Windows build.
set "npm_config_registry=https://registry.npmmirror.com"
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
set "ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/"
echo [PinDo] Using npmmirror for Electron, npm and builder binaries.

echo [PinDo] Checking desktop integration before downloading dependencies...
node scripts\check-desktop-ready.cjs
if errorlevel 1 goto blocked

echo [PinDo] Installing dependencies. Internet access is required on first build.
call npm install --no-audit --no-fund
if errorlevel 1 goto failed

echo [PinDo] Running tests and creating the Windows installer...
call npm run build:windows
if errorlevel 1 goto failed

echo [PinDo] Build finished. Installer is in the release folder.
explorer "%~dp0release"
pause
exit /b 0

:missing_node
echo Node.js and npm are required. Install the supported Node.js LTS release, then run this file again.
pause
exit /b 1

:blocked
echo This source checkpoint is not a complete desktop application yet. No installer has been produced.
pause
exit /b 1

:failed
echo Build failed. Please send me the error text shown above; no successful release is claimed.
pause
exit /b 1
