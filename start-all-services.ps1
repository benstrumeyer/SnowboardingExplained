#!/usr/bin/env pwsh
# Start all services for SnowboardingExplained

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Kill any existing processes
Write-Host "`n[CLEANUP] Killing existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*python*" -or $_.ProcessName -like "*node*" -or $_.ProcessName -like "*ngrok*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Terminal 1: Flask Wrapper (Pose Service)
Write-Host "`n[TERMINAL 1] Starting Flask Wrapper (Pose Service)..." -ForegroundColor Green
$terminal1 = Start-Process wsl -ArgumentList '-d Ubuntu bash -c "cd /home/ben/pose-service && source 4D-Humans/venv/bin/activate && python flask_wrapper.py"' -PassThru
Write-Host "Flask Wrapper PID: $($terminal1.Id)" -ForegroundColor Green

# Terminal 2: Node.js Backend
Write-Host "`n[TERMINAL 2] Starting Node.js Backend..." -ForegroundColor Green
$terminal2 = Start-Process cmd -ArgumentList '/k cd "C:\Users\benja\repos\SnowboardingExplained" && .\start-backend.bat' -PassThru
Write-Host "Backend PID: $($terminal2.Id)" -ForegroundColor Green

# Terminal 3: React Frontend
Write-Host "`n[TERMINAL 3] Starting React Frontend..." -ForegroundColor Green
$terminal3 = Start-Process cmd -ArgumentList '/k cd "C:\Users\benja\repos\SnowboardingExplained\backend\web" && npm run dev' -PassThru
Write-Host "Frontend PID: $($terminal3.Id)" -ForegroundColor Green

# Terminal 4: ngrok
Write-Host "`n[TERMINAL 4] Starting ngrok..." -ForegroundColor Green
$terminal4 = Start-Process cmd -ArgumentList '/k cd "C:\Program Files\ngrok" && ngrok http 3001' -PassThru
Write-Host "ngrok PID: $($terminal4.Id)" -ForegroundColor Green

# Terminal 5: Docker services
Write-Host "`n[TERMINAL 5] Starting Docker services (Redis + MongoDB)..." -ForegroundColor Green
$terminal5 = Start-Process cmd -ArgumentList '/k docker run -d -p 6379:6379 redis; docker run -d --name snowboard-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:latest' -PassThru
Write-Host "Docker PID: $($terminal5.Id)" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "All Services Started!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nService Status:" -ForegroundColor Yellow
Write-Host "  Terminal 1 (Flask):    PID $($terminal1.Id)" -ForegroundColor Green
Write-Host "  Terminal 2 (Backend):  PID $($terminal2.Id)" -ForegroundColor Green
Write-Host "  Terminal 3 (Frontend): PID $($terminal3.Id)" -ForegroundColor Green
Write-Host "  Terminal 4 (ngrok):    PID $($terminal4.Id)" -ForegroundColor Green
Write-Host "  Terminal 5 (Docker):   PID $($terminal5.Id)" -ForegroundColor Green

Write-Host "`nAccess Points:" -ForegroundColor Yellow
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:5001" -ForegroundColor Cyan
Write-Host "  Flask:     http://localhost:5000" -ForegroundColor Cyan
Write-Host "  MongoDB:   localhost:27017" -ForegroundColor Cyan
Write-Host "  Redis:     localhost:6379" -ForegroundColor Cyan

Write-Host "`nWaiting for services to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`nServices should now be running. Check each terminal for status." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop this script (services will continue running)." -ForegroundColor Yellow

# Keep script running
while ($true) {
    Start-Sleep -Seconds 10
}
