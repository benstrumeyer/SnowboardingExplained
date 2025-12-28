# Action Items - Do This Now

## Status
✅ All code fixes are implemented and verified
⏳ Services need to be restarted to load the new code

## The Problem
Flask wrapper is running OLD code that uses `/bin/sh` instead of `/bin/bash`, causing:
```
/bin/sh: 1: source: not found
```

## The Solution
Restart the services to load the new code.

---

## Action 1: Rebuild Backend (5 minutes)

```powershell
cd SnowboardingExplained/backend
npm run build
```

**What this does**: Compiles the TypeScript code with the WSL path conversion fix.

**Expected output**:
```
> build
> tsc
✓ Build successful
```

**If it fails**:
```powershell
rm -r dist node_modules
npm install
npm run build
```

---

## Action 2: Restart Backend (2 minutes)

```powershell
# Kill existing backend
Get-Process node | Where-Object {$_.CommandLine -like "*server*"} | Stop-Process -Force

# Start new backend
npm start
```

**What this does**: Loads the new compiled code with path conversion fix.

**Expected output**:
```
[INFO] Server running on http://localhost:3000
[INFO] Connected to MongoDB
```

**Verify it's running**:
```powershell
curl http://localhost:3000/health
```

---

## Action 3: Restart Flask Wrapper (2 minutes)

```powershell
# Kill old Flask wrapper
wsl pkill -f flask_wrapper_minimal_safe.py

# Wait for it to die
Start-Sleep -Seconds 2

# Start new Flask wrapper
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

**What this does**: Loads the new code with shell=True and executable=/bin/bash fixes.

**Expected output**:
```
[2025-12-28 ...] [INFO] [STARTUP] Starting Flask wrapper...
[2025-12-28 ...] [INFO] [STARTUP] Listening on 0.0.0.0:5000
[2025-12-28 ...] [INFO] [STARTUP] Starting HTTP server...
```

**Verify it's running**:
```powershell
curl http://172.24.183.130:5000/health
```

---

## Action 4: Test Video Upload (5 minutes)

1. Open web UI: http://localhost:3000
2. Upload a test video (small file, ~1MB)
3. Monitor logs for success:

**Backend logs should show**:
```
[FINALIZE] ✓ Video copied to WSL successfully
[FINALIZE] Calling Flask wrapper /pose/video endpoint
```

**Flask logs should show**:
```
[PROCESS] ✓ Subprocess completed in 0.1s
[PROCESS] Exit code: 0
[TRACK.PY] Starting track.py...
[TRACK.PY] Loading models...
```

**If you see these logs, the fixes are working!** ✅

---

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

# Kill the process
taskkill /PID <PID> /F

# Try again
npm start
```

### Flask wrapper won't start
```powershell
# Check if port 5000 is in use
wsl netstat -tlnp | grep 5000

# Kill any existing process
wsl pkill -9 -f flask_wrapper

# Check for errors
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py 2>&1 | head -50
```

### Still seeing "source: not found" error
This means Flask wrapper wasn't restarted. Do this:
```powershell
# Verify old process is dead
wsl ps aux | grep flask_wrapper

# Kill it harder
wsl pkill -9 -f flask_wrapper

# Wait
Start-Sleep -Seconds 3

# Start new one
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

### Video upload still failing
1. Check backend logs for path conversion errors
2. Check Flask logs for subprocess errors
3. Verify video file exists: `wsl ls -lh /tmp/pose-videos/`
4. Check if track.py is executable: `wsl ls -la /home/ben/pose-service/4D-Humans/track.py`

---

## Quick Reference

| Step | Command | Time |
|------|---------|------|
| 1. Rebuild backend | `npm run build` | 5 min |
| 2. Restart backend | `npm start` | 2 min |
| 3. Restart Flask | `wsl pkill -f flask_wrapper_minimal_safe.py && sleep 2 && wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py` | 2 min |
| 4. Test upload | Upload video through web UI | 5 min |
| **Total** | | **14 min** |

---

## What Changed

### Flask Wrapper
- Now uses `shell=True` for bash -c commands
- Now uses `executable='/bin/bash'` instead of `/bin/sh`
- Now passes bash script as string instead of list

### Backend
- Now converts Windows backslashes to forward slashes before wslpath
- Now properly handles mkdir failures (continues anyway)

### Track.py
- Now has enhanced logging with `[TRACK.PY]` prefix
- Now flushes output after each log statement

---

## Expected Results

### Before Restart
```
Exit code: 127
stderr: /bin/sh: 1: source: not found
```

### After Restart
```
Exit code: 0
[TRACK.PY] Starting track.py...
[TRACK.PY] Loading models...
[TRACK.PY] Processing video...
```

---

## Summary

1. **Rebuild backend** - Compiles path conversion fix
2. **Restart backend** - Loads new code
3. **Restart Flask** - Loads subprocess fixes
4. **Test upload** - Verify everything works

**Estimated time**: 14 minutes

**Expected outcome**: Video uploads work, track.py executes successfully, pose data is extracted

**Next**: Follow the actions above in order!
