@echo off
title Mobile App
cd /d "%~dp0backend\mobile"

echo.
echo ========================================
echo Mobile App (React Native)
echo ========================================
echo.

if not exist node_modules (
    echo ERROR: node_modules not found!
    echo Run setup-dev.bat first to install dependencies
    echo.
    pause
    exit /b 1
)

echo Starting Mobile App with tunnel...
echo.
echo The app will open in your browser with a tunnel URL
echo You can use this URL on your phone to test the app
echo.
echo Press Ctrl+C to stop
echo.

npm start -- -c --tunnel
pause
