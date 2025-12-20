# PowerShell script to start Pose Service in WSL with proper background handling
# Usage: .\start-pose-service.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pose Detection Service (WSL)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing service on port 5000
Write-Host "Checking for existing service on port 5000..." -ForegroundColor Yellow
wsl -d Ubuntu bash -c "lsof -ti:5000 | xargs kill -9 2>/dev/null || true" | Out-Null
Start-Sleep -Seconds 1

# Start service in background with nohup
Write-Host "Starting service in background..." -ForegroundColor Yellow
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && nohup python app.py > /tmp/pose-service.log 2>&1 &" | Out-Null

# Give it a moment to start
Start-Sleep -Seconds 3

# Check if it's running
Write-Host "Checking service status..." -ForegroundColor Yellow
$health = wsl -d Ubuntu bash -c "curl -s http://localhost:5000/health 2>/dev/null" | ConvertFrom-Json -ErrorAction SilentlyContinue

if ($health -and $health.ready) {
    Write-Host "✓ Service is running and ready!" -ForegroundColor Green
} else {
    Write-Host "⚠ Service may still be warming up. Check logs:" -ForegroundColor Yellow
    Write-Host "  wsl -d Ubuntu tail -f /tmp/pose-service.log" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Service Details" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URL: http://localhost:5000" -ForegroundColor Green
Write-Host "WSL IP: 172.24.183.130:5000 (for mobile app)" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Cyan
Write-Host "  GET  /health - Health check" -ForegroundColor Gray
Write-Host "  POST /api/video/process_async - Process video" -ForegroundColor Gray
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  View logs:" -ForegroundColor Gray
Write-Host "    wsl -d Ubuntu tail -f /tmp/pose-service.log" -ForegroundColor Gray
Write-Host ""
Write-Host "  Stop service:" -ForegroundColor Gray
Write-Host "    wsl -d Ubuntu bash -c ""lsof -ti:5000 | xargs kill -9""" -ForegroundColor Gray
Write-Host ""
Write-Host "  Check status:" -ForegroundColor Gray
Write-Host "    curl -s http://localhost:5000/health | python -m json.tool" -ForegroundColor Gray
Write-Host ""
