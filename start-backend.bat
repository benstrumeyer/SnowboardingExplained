@echo off
title Backend API (Port 3001)
REM Add Node.js to PATH
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0backend"

echo.
echo ========================================
echo Backend API Server
echo ========================================
echo.

if not exist node_modules (
    echo ERROR: node_modules not found!
    echo Run setup-dev.bat first to install dependencies
    echo.
    pause
    exit /b 1
)

echo Starting Backend API on http://localhost:3001
echo.
echo Endpoints:
echo   POST /api/video/upload - Upload video for analysis
echo   POST /api/video/analyze-pose - Analyze pose from video
echo   GET  /health - Health check
echo.
echo Press Ctrl+C to stop
echo.

npm run dev
pause
