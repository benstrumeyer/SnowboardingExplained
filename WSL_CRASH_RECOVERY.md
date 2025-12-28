# WSL Crash Recovery Guide

## Problem
```
Catastrophic failure Error code: Wsl/Service/E_UNEXPECTED
```

This error means the WSL service daemon crashed. It's not a Flask issue—it's a WSL infrastructure problem.

## Solution: Restart WSL

### Step 1: Shut Down WSL Completely
```powershell
wsl --shutdown
```

This terminates all WSL instances and the daemon. Wait 5 seconds.

### Step 2: Verify WSL is Down
```powershell
wsl --list --verbose
```

Should show nothing or error. If it hangs, wait 10 seconds and try again.

### Step 3: Restart WSL
```powershell
wsl -d Ubuntu bash -c "echo 'WSL restarted'"
```

This will restart the WSL daemon and Ubuntu instance.

### Step 4: Start Flask Again
```powershell
wsl bash -c "cd /home/ben/pose-service && source venv/bin/activate && python -B flask_wrapper_minimal_safe.py 2>&1"
```

## If That Doesn't Work

### Option A: Restart Your Computer
Sometimes WSL gets into a bad state that only a full restart fixes.

### Option B: Reinstall WSL (Nuclear Option)
```powershell
# WARNING: This will delete all WSL data
wsl --unregister Ubuntu
# Then reinstall from Microsoft Store or:
wsl --install -d Ubuntu
```

## Prevention

WSL crashes can happen due to:
- Memory pressure (models loading)
- GPU memory issues
- Corrupted WSL state
- Windows updates

To minimize crashes:
1. Close other heavy applications before running Flask
2. Monitor memory: `wsl free -h`
3. Monitor GPU: `wsl nvidia-smi` (if using NVIDIA)
4. Restart WSL periodically: `wsl --shutdown`

## Quick Recovery Script

Save this as `recover-wsl.ps1`:

```powershell
Write-Host "🔄 Recovering WSL..." -ForegroundColor Cyan
Write-Host "1. Shutting down WSL..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 5

Write-Host "2. Restarting WSL..." -ForegroundColor Yellow
wsl -d Ubuntu bash -c "echo 'WSL restarted successfully'"

Write-Host "3. Checking WSL status..." -ForegroundColor Yellow
wsl --list --verbose

Write-Host "✅ WSL recovered. Ready to start Flask." -ForegroundColor Green
```

Run it with:
```powershell
.\recover-wsl.ps1
```

## Next Steps

1. Run: `wsl --shutdown`
2. Wait 5 seconds
3. Try Flask again: `wsl bash -c "cd /home/ben/pose-service && source venv/bin/activate && python -B flask_wrapper_minimal_safe.py 2>&1"`
4. If it still crashes, restart your computer
5. If it persists, check Windows Event Viewer for WSL errors

## Monitoring During Startup

Watch for these signs of success:
```
[FLASK] Starting Flask wrapper...
[INIT] Initializing models...
[INIT] ✓ Models initialized
 * Running on http://127.0.0.1:5000
```

If you see these, Flask is running correctly.
