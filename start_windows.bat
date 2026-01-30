@echo off
title Vesperia SMP Web Launcher
color 0b
echo ==========================================
echo       VESPERIA SMP - LOCAL LAUNCHER
echo ==========================================
echo.
echo [1/2] Checking and installing libraries (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Could not install dependencies. 
    echo Please make sure you have Node.js installed! (https://nodejs.org/)
    pause
    exit /b
)

echo.
echo [2/2] Starting local server...
echo.
echo Access the site at: http://localhost:5173
echo Press Ctrl+C to stop the server.
echo.
call npm run dev
pause