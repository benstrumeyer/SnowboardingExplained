@echo off
REM Start Pose Service in WSL with proper background handling
REM This script keeps the service running even after the batch file exits

title Pose Service (WSL - Port 5000)

echo.
echo ========================================
echo Pose Detection Service (WSL)
echo ========================================
echo.

REM Kill any existing service on port 5000
echo Checking for existing service on port 5000...
wsl -d Ubuntu bash -c "lsof -ti:5000 | xargs kill -9 2>/dev/null || true"
timeout /t 1 /nobreak

REM Start service in background with nohup
echo Starting service in background...
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && nohup python app.py > /tmp/pose-service.log 2>&1 &"

REM Give it a moment to start
timeout /t 3 /nobreak

REM Check if it's running
echo.
echo Checking service status...
wsl -d Ubuntu bash -c "sleep 2 && curl -s http://localhost:5000/health | python -m json.tool 2>/dev/null || echo 'Service not responding yet'"

echo.
echo ========================================
echo Service Details
echo ========================================
echo.
echo Service URL: http://localhost:5000
echo WSL IP: 172.24.183.130:5000 (for mobile app)
echo.
echo Endpoints:
echo   GET  /health - Health check
echo   POST /api/video/process_async - Process video
echo.
echo View logs:
echo   wsl -d Ubuntu tail -f /tmp/pose-service.log
echo.
echo Stop service:
echo   wsl -d Ubuntu bash -c "lsof -ti:5000 | xargs kill -9"
echo.
pause
