# Complete Restart Procedure for All Services

This guide walks through restarting all services with the latest fixes.

## Step 1: Rebuild Backend (for WSL path conversion fix)

```powershell
cd SnowboardingExplained/backend
npm run build
```

Expected output:
```
> build
> tsc
✓ Build successful
```

## Step 2: Restart Backend Server

```powershell
# Kill existing backend
Get-Process node | Where-Object {$_.CommandLine -like "*server*"} | Stop-Process -Force

# Start new backend
npm start
```

Expected output:
```
[INFO] Server running on http://localhost:3000
[INFO] Connected to MongoDB
```

## Step 3: Restart Flask Wrapper

```powershell
# Kill existing Flask wrapper
wsl pkill -f flask_wrapper_minimal_safe.py
Start-Sleep -Seconds 2

# Start new Flask wrapper
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

Expected output:
```
[2025-12-28 ...] [INFO] [STARTUP] Starting Flask wrapper...
[2025-12-28 ...] [INFO] [STARTUP] Listening on 0.0.0.0:5000
[2025-12-28 ...] [INFO] [STARTUP] Starting HTTP server...
```

## Step 4: Verify All Services

### Check Backend
```powershell
curl http://localhost:3000/health
```

### Check Flask Wrapper
```powershell
curl http://172.24.183.130:5000/health
```

### Check MongoDB
```powershell
# From backend directory
npm run test:db
```

## Step 5: Test Video Upload

1. Open web UI: http://localhost:3000
2. Upload a test video
3. Monitor logs for:
   - Backend: `[FINALIZE] ✓ Video copied to WSL successfully`
   - Flask: `[TRACK.PY]` logs appearing
   - Flask: `Exit code: 0` (success)

## Troubleshooting

### Backend won't build
```powershell
cd SnowboardingExplained/backend
rm -r dist node_modules
npm install
npm run build
```

### Backend won't start
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process using port 3000
taskkill /PID <PID> /F

# Try starting again
npm start
```

### Flask wrapper won't start
```powershell
# Check if port 5000 is in use
wsl netstat -tlnp | grep 5000

# Kill any existing process
wsl pkill -9 -f flask_wrapper

# Check for Python errors
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py 2>&1 | head -50
```

### Video upload fails
1. Check backend logs for path conversion errors
2. Check Flask logs for subprocess errors
3. Verify video file exists: `wsl ls -lh /tmp/pose-videos/`
4. Check if track.py is executable: `wsl ls -la /home/ben/pose-service/4D-Humans/track.py`

## Expected Behavior

### Successful Video Upload Flow
```
[Backend] Received video upload
[Backend] Converting Windows path to WSL path
[Backend] ✓ Video copied to WSL successfully
[Backend] Calling Flask wrapper /pose/video endpoint
[Flask] Received request for video
[Flask] Starting subprocess with 180.0s timeout
[Flask] About to call subprocess.run with:
[Flask]   cmd: 'source ... && cd ... && python track.py ...'
[Flask]   shell: True
[Flask]   executable: /bin/bash
[Flask] ✓ Subprocess completed in 0.1s
[Flask] Exit code: 0
[TRACK.PY] Starting track.py...
[TRACK.PY] Loading models...
[TRACK.PY] Processing video...
[TRACK.PY] ✓ Complete
```

## Summary

1. **Rebuild backend** - Ensures WSL path conversion fix is compiled
2. **Restart backend** - Loads new code
3. **Restart Flask wrapper** - Loads subprocess fixes
4. **Verify services** - Health checks
5. **Test upload** - End-to-end verification

All three fixes work together:
- Backend: WSL path conversion (backslash → forward slash)
- Flask: shell=True for bash -c commands
- Flask: executable=/bin/bash for source command support
