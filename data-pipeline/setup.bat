@echo off
echo Installing Playwright...
echo.

cd /d "%~dp0"

echo Step 1: Installing playwright package...
call npm install playwright
if %errorlevel% neq 0 (
    echo Failed to install playwright
    pause
    exit /b 1
)

echo.
echo Step 2: Installing Chromium browser...
call npx playwright install chromium
if %errorlevel% neq 0 (
    echo Failed to install chromium
    pause
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo Now run: run-scraper.bat
pause
