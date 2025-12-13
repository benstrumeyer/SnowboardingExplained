@echo off
REM Start development environment with backend and mobile app
REM This script starts both the backend API and mobile app in separate terminals

echo Starting Snowboarding Explained development environment...
echo.

REM Start backend in a new terminal
echo Starting backend API on port 3001...
start "Backend API" cmd /c "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 2 /nobreak

REM Start mobile app in a new terminal
echo Starting mobile app with tunnel...
start "Mobile App" cmd /c "cd backend\mobile && npm start -- -c --tunnel"

echo.
echo Development environment started!
echo - Backend API: http://localhost:3001
echo - Mobile App: Check terminal for tunnel URL
echo.
pause
