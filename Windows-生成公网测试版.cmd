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
set "PINDO_RELEASE_VERSION=1.1.0-beta.6.10"
call npm run build:public
if errorlevel 1 goto failed
echo [PinDo] Public beta is ready in release-public.
echo [PinDo] Upload latest.yml, the installer EXE and its blockmap to GitHub Release v1.1.0-beta.6.10.
explorer "%~dp0release-public"
pause
exit /b 0
:missing_node
echo Please install the supported Node.js LTS release first.
pause
exit /b 1
:failed
echo Build failed. No public release is claimed.
pause
exit /b 1
