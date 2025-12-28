# WSL Recovery Script
# Fixes "Catastrophic failure Error code: Wsl/Service/E_UNEXPECTED"

Write-Host "🔄 WSL Recovery Started" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "Step 1: Shutting down WSL daemon..." -ForegroundColor Yellow
wsl --shutdown
Write-Host "✓ WSL shutdown complete" -ForegroundColor Green

Write-Host "Step 2: Waiting for daemon to fully stop..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "✓ Wait complete" -ForegroundColor Green

Write-Host "Step 3: Restarting WSL..." -ForegroundColor Yellow
$result = wsl -d Ubuntu bash -c "echo 'WSL restarted successfully'" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ WSL restarted successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  WSL restart had issues, but continuing..." -ForegroundColor Yellow
}

Write-Host "Step 4: Checking WSL status..." -ForegroundColor Yellow
wsl --list --verbose

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ WSL Recovery Complete" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Start Flask with:" -ForegroundColor Cyan
Write-Host "  wsl bash -c `"cd /home/ben/pose-service && source venv/bin/activate && python -B flask_wrapper_minimal_safe.py 2>&1`"" -ForegroundColor White
