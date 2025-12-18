@echo off
title Pose Service (Port 5000)
cd /d "%~dp0backend\pose-service"

echo.
echo ========================================
echo Pose Detection Service
echo ========================================
echo.

if not exist venv (
    echo ERROR: Virtual environment not found!
    echo Run setup-dev.bat first to install dependencies
    echo.
    pause
    exit /b 1
)

echo Starting Pose Service on http://localhost:5000
echo.
echo Endpoints:
echo   GET  /health - Health check
echo   POST /pose   - Detect pose from single image
echo   POST /batch  - Detect pose from multiple images
echo.
echo Press Ctrl+C to stop
echo.

venv\Scripts\python app.py
pause
