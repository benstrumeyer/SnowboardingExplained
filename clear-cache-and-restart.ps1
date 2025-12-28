# Clear Python bytecode cache and restart Flask wrapper

Write-Host "🧹 Clearing Python bytecode cache..." -ForegroundColor Cyan

# Clear .pyc files
Write-Host "  Deleting .pyc files..." -ForegroundColor Yellow
wsl bash -c "find /home/ben/pose-service -name '*.pyc' -delete"
Write-Host "  ✓ .pyc files deleted" -ForegroundColor Green

# Clear __pycache__ directories
Write-Host "  Deleting __pycache__ directories..." -ForegroundColor Yellow
wsl bash -c "find /home/ben/pose-service -name '__pycache__' -type d -delete"
Write-Host "  ✓ __pycache__ directories deleted" -ForegroundColor Green

# Kill all Python processes
Write-Host "⏹️  Killing all Python processes..." -ForegroundColor Yellow
wsl bash -c "pkill -9 python"
Start-Sleep -Seconds 2
Write-Host "  ✓ Python processes killed" -ForegroundColor Green

# Restart Flask wrapper
Write-Host "🚀 Starting Flask wrapper..." -ForegroundColor Cyan
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py

Write-Host "✓ Flask wrapper started" -ForegroundColor Green
