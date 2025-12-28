# Start Flask wrapper with clean bytecode and proper signal handling
# This script:
# 1. Clears Python bytecode cache
# 2. Kills any existing Flask processes
# 3. Starts Flask with -B flag (no bytecode caching)
# 4. Shows all logs in real-time
# 5. Allows Ctrl+C to properly kill the process

Write-Host "🧹 Clearing Python bytecode cache..." -ForegroundColor Cyan
wsl bash -c "find /home/ben/pose-service -name '*.pyc' -delete 2>/dev/null; find /home/ben/pose-service -name '__pycache__' -type d -delete 2>/dev/null"

Write-Host "⚔️  Killing any existing Flask processes..." -ForegroundColor Cyan
wsl bash -c "pkill -9 -f flask_wrapper_minimal_safe.py 2>/dev/null; sleep 1"

Write-Host "🚀 Starting Flask wrapper (Ctrl+C to stop)..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

# Run Flask with:
# -B flag: Don't write bytecode files
# 2>&1: Redirect stderr to stdout so all logs appear
# This allows Ctrl+C to properly terminate the process
wsl bash -c "cd /home/ben/pose-service && source venv/bin/activate && python -B flask_wrapper_minimal_safe.py 2>&1"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "Flask wrapper stopped." -ForegroundColor Yellow
