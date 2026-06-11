@echo off
chcp 65001 >nul
title REDNOTE DOWNLOADER
echo ================================
echo   REDNOTE DOWNLOADER
echo ================================
echo.
echo Starting...
echo Please visit http://localhost:3000
echo.
node "%~dp0standalone-server.js"
pause
