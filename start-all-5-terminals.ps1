# Start all 5 terminals for the pose video pipeline
# Terminal 1: WSL Pose Service
# Terminal 2: Backend API
# Terminal 3: Frontend Dev Server
# Terminal 4: ngrok tunnel
# Terminal 5: Docker services (Redis + MongoDB)

Write-Host "Starting 5 terminals for pose video pipeline..." -ForegroundColor Cyan

# Terminal 1: WSL Pose Service (Flask wrapper)
Write-Host "Terminal 1: Starting WSL Pose Service..." -ForegroundColor Green
Start-Process wsl -ArgumentList '-d Ubuntu bash -c "cd /home/ben/pose-service && source 4D-Humans/venv/bin/activate && python flask_wrapper_minimal_safe.py"'
Start-Sleep -Seconds 2

# Terminal 2: Backend API
Write-Host "Terminal 2: Starting Backend API..." -ForegroundColor Green
Start-Process powershell -ArgumentList '-NoExit -Command "cd C:\Users\benja\repos\SnowboardingExplained; .\start-backend.bat"'
Start-Sleep -Seconds 2

# Terminal 3: Frontend Dev Server
Write-Host "Terminal 3: Starting Frontend Dev Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList '-NoExit -Command "cd C:\Users\benja\repos\SnowboardingExplained\backend\web; npm run dev"'
Start-Sleep -Seconds 2

# Terminal 4: ngrok tunnel
Write-Host "Terminal 4: Starting ngrok tunnel..." -ForegroundColor Green
Start-Process powershell -ArgumentList '-NoExit -Command "cd C:\Program Files\; ngrok http 3001"'
Start-Sleep -Seconds 2

# Terminal 5: Docker services (Redis + MongoDB)
Write-Host "Terminal 5: Starting Docker services..." -ForegroundColor Green
Start-Process powershell -ArgumentList '-NoExit -Command "docker run -d -p 6379:6379 redis; docker run -d --name snowboard-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:latest; Write-Host \"Redis and MongoDB started\" -ForegroundColor Green"'

Write-Host "`n✓ All 5 terminals started!" -ForegroundColor Cyan
Write-Host "Check each terminal for logs and errors" -ForegroundColor Yellow
