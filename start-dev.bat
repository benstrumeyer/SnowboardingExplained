@echo off
REM Start development environment with backend, mobile app, and pose service
REM This script starts all services in separate terminals
REM Run setup-dev.bat FIRST if this is your first time!

echo.
echo ========================================
echo Starting Development Environment
echo ========================================
echo.

REM Check if setup has been run
if not exist "%~dp0backend\pose-service\venv" (
    echo ERROR: Python virtual environment not found!
    echo Please run setup-dev.bat first to install dependencies
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0backend\node_modules" (
    echo ERROR: Backend node_modules not found!
    echo Please run setup-dev.bat first to install dependencies
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0backend\mobile\node_modules" (
    echo ERROR: Mobile app node_modules not found!
    echo Please run setup-dev.bat first to install dependencies
    echo.
    pause
    exit /b 1
)

echo All dependencies found. Starting services...
echo.

REM Start Python pose service in a new terminal
echo [1/3] Starting Python Pose Service on port 5000...
start "Pose Service" cmd /k "cd /d %~dp0backend\pose-service & venv\Scripts\python app.py"

REM Wait for pose service to start
timeout /t 4 /nobreak

REM Start backend in a new terminal
echo [2/3] Starting backend API on port 3001...
start "Backend API" cmd /k "cd /d %~dp0backend & npm run dev"

REM Wait for backend to start
timeout /t 3 /nobreak

REM Start mobile app in a new terminal
echo [3/3] Starting mobile app with tunnel...
start "Mobile App" cmd /k "cd /d %~dp0backend\mobile & npm start -- -c --tunnel"

echo.
echo ========================================
echo Development Environment Started!
echo ========================================
echo.
echo Services running on:
echo   - Pose Service: http://localhost:5000
echo   - Backend API: http://localhost:3001
echo   - Mobile App: Check terminal for tunnel URL
echo.
echo To stop services, close the terminal windows.
echo.
pause
