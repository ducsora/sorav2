@echo off
title SoraVer2 - Local Server
cd /d "%~dp0"
echo.
echo  ==========================================
echo   SoraVer2 - Local Development Server
echo   SharedArrayBuffer = ENABLED (FFmpeg.wasm)
echo  ==========================================
echo.
echo  Server: http://localhost:3001
echo  Mashup: http://localhost:3001/mashup
echo.
echo  Nhan Ctrl+C de dung.
echo.
start "" "http://localhost:3001/mashup"
node server.js
pause
