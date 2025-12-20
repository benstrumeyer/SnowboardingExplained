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

REM Check if ViTDet model is cached
set VITDET_MODEL=%USERPROFILE%\.cache\4d-humans\model_final_f05665.pkl
if not exist "%VITDET_MODEL%" (
    echo.
    echo ========================================
    echo ViTDet Model Cache Setup
    echo ========================================
    echo.
    echo ViTDet model not found in cache.
    echo Downloading model (~2.7GB)...
    echo This may take 5-15 minutes on first run.
    echo.
    
    call venv\Scripts\activate.bat
    python download_vitdet_cache.py
    call venv\Scripts\deactivate.bat
    
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to download ViTDet model!
        echo.
        pause
        exit /b 1
    )
    echo.
) else (
    for %%A in ("%VITDET_MODEL%") do set SIZE=%%~zA
    set /a SIZE_MB=SIZE / 1048576
    echo ✓ ViTDet model cached: %SIZE_MB% MB
    echo.
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
