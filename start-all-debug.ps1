#!/usr/bin/env pwsh
# Start all services for debugging

Write-Host "🚀 Starting all services for debugging..." -ForegroundColor Cyan

# Terminal 1: Flask Pose Service (WSL)
Write-Host "`n📍 Terminal 1: Flask Pose Service (WSL)" -ForegroundColor Yellow
Start-Process wsl -ArgumentList '-d Ubuntu bash -c "cd /home/ben/pose-service && source 4D-Humans/venv/bin/activate && python flask_wrapper_minimal_safe.py"'
Start-Sleep -Seconds 2

# Terminal 2: Backend API
Write-Host "📍 Terminal 2: Backend API" -ForegroundColor Yellow
Start-Process cmd -ArgumentList '/k cd "C:\Users\benja\repos\SnowboardingExplained" && .\start-backend.bat'
Start-Sleep -Seconds 2

# Terminal 3: Frontend Dev Server
Write-Host "📍 Terminal 3: Frontend Dev Server" -ForegroundColor Yellow
Start-Process cmd -ArgumentList '/k cd "C:\Users\benja\repos\SnowboardingExplained\backend\web" && npm run dev'
Start-Sleep -Seconds 2

# Terminal 4: ngrok Tunnel
Write-Host "📍 Terminal 4: ngrok Tunnel" -ForegroundColor Yellow
Start-Process cmd -ArgumentList '/k cd "C:\Program Files\ngrok" && ngrok http 3001'
Start-Sleep -Seconds 2

# Terminal 5: Docker Services (Redis + MongoDB)
Write-Host "📍 Terminal 5: Docker Services" -ForegroundColor Yellow
Start-Process cmd -ArgumentList '/k docker run -d -p 6379:6379 redis && docker run -d --name snowboard-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:latest'

Write-Host "`n✅ All services started!" -ForegroundColor Green
Write-Host "`n📊 Service Status:" -ForegroundColor Cyan
Write-Host "  🔴 Flask Pose Service: http://172.24.183.130:5000 (WSL)" -ForegroundColor Red
Write-Host "  🔵 Backend API: http://localhost:3001" -ForegroundColor Blue
Write-Host "  🟢 Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  🟡 ngrok Tunnel: Check terminal 4 for public URL" -ForegroundColor Yellow
Write-Host "  🟣 Redis: localhost:6379" -ForegroundColor Magenta
Write-Host "  ⚫ MongoDB: localhost:27017 (admin/password)" -ForegroundColor Gray

Write-Host "`n💡 Tips:" -ForegroundColor Cyan
Write-Host "  - Check Flask logs for 🔴 RED logs (pose processing)"
Write-Host "  - Check Backend logs for 🔍 CYAN logs (HTTP wrapper)"
Write-Host "  - Check Frontend console for 🎬 MAGENTA logs (mesh rendering)"
Write-Host "  - Use diagnose-upload.js to check MongoDB: node diagnose-upload.js <videoId>"
Write-Host "  - Upload video: C:\Users\benja\OneDrive\Desktop\clips\not.mov"
