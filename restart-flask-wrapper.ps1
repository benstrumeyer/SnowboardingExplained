# Restart Flask wrapper with new fixes
Write-Host "🔄 Restarting Flask wrapper with subprocess fixes..." -ForegroundColor Cyan

# Kill existing Flask wrapper process
Write-Host "⏹️  Killing existing Flask wrapper process..." -ForegroundColor Yellow
wsl pkill -f flask_wrapper_minimal_safe.py
Start-Sleep -Seconds 2

# Verify it's dead
Write-Host "✓ Flask wrapper stopped" -ForegroundColor Green

# Start new Flask wrapper
Write-Host "🚀 Starting Flask wrapper with new code..." -ForegroundColor Cyan
$flaskPath = "/home/ben/pose-service/flask_wrapper_minimal_safe.py"
wsl python $flaskPath

Write-Host "✓ Flask wrapper started" -ForegroundColor Green
