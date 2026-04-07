@echo off
title SoraVer2 - Local Server
cd /d "%~dp0"
echo.
echo  ==========================================
echo   SoraVer2 - Local Development Server
echo  ==========================================
echo.
echo  Server: http://localhost:3001
echo  Shuffler: http://localhost:3001/shuffler.html
echo.
echo  Can Ctrl+C de dung.
echo.
start "" "http://localhost:3001/shuffler.html"
npx -y serve . -p 3001 --no-request-logging
pause
