# CRITICAL: Flask Wrapper Must Be Restarted

## Problem
The Flask wrapper is still running **OLD CODE** despite the subprocess fixes being in place.

### Evidence
From the latest logs:
```
/bin/sh: 1: source: not found
```

This error proves the old code is running because:
- **Old code**: Uses `/bin/sh` by default (doesn't support `source` command)
- **New code**: Uses `'executable': '/bin/bash'` (supports `source` command)

## Root Cause
The Flask wrapper process was NOT restarted after code changes. Python processes keep the old code in memory until they're killed and restarted.

## Solution: Restart Flask Wrapper

### Option 1: Using PowerShell Script (Recommended)
```powershell
# Run from Windows PowerShell
.\restart-flask-wrapper.ps1
```

### Option 2: Manual Steps
```powershell
# 1. Kill the old Flask wrapper
wsl pkill -f flask_wrapper_minimal_safe.py

# 2. Wait a moment
Start-Sleep -Seconds 2

# 3. Start the new Flask wrapper
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

### Option 3: Using WSL Directly
```bash
# In WSL terminal
pkill -f flask_wrapper_minimal_safe.py
sleep 2
python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

## Verification After Restart

### 1. Check Flask wrapper is running
```powershell
wsl ps aux | grep flask_wrapper
```

### 2. Check it's listening on port 5000
```powershell
wsl netstat -tlnp | grep 5000
```

### 3. Test health endpoint
```powershell
curl http://172.24.183.130:5000/health
```

### 4. Test video upload
Upload a test video through the web UI and check logs for:
- `[TRACK.PY]` prefix in logs (proves track.py is executing)
- Subprocess completes in ~0.1s (not timing out)
- Exit code 0 (success)

## What Changed in the Code

### File: `backend/pose-service/flask_wrapper_minimal_safe.py`
**Lines 975-988**: Subprocess execution with fixes

```python
run_kwargs = {
    'timeout': timeout_seconds,
    'capture_output': True,
    'text': True,
    'shell': True,  # ✓ CRITICAL: Required for bash -c commands
    'executable': '/bin/bash'  # ✓ CRITICAL: Use bash, not /bin/sh
}

# ✓ CRITICAL: Pass bash script string with shell=True
result = subprocess.run(cmd[2], **run_kwargs)
```

### File: `backend/src/server.ts`
**Lines 542-549**: WSL path conversion fix

```typescript
// ✓ CRITICAL: Convert backslashes to forward slashes
const windowsPathFormatted = videoPath.replace(/\\/g, '/');
const wslSourcePath = execSync(`wsl wslpath "${windowsPathFormatted}"`, { 
  timeout: 10000,
  stdio: 'pipe',
  encoding: 'utf-8'
}).trim();
```

## Expected Behavior After Restart

### Before (Old Code)
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['bash', '-c', 'source ... && cd ... && python track.py ...']
[PROCESS] ✓ Subprocess completed in 0.1s
[PROCESS] Exit code: 127
[PROCESS] stderr: /bin/sh: 1: source: not found
```

### After (New Code)
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: 'source ... && cd ... && python track.py ...'
[PROCESS]   shell: True
[PROCESS]   executable: /bin/bash
[PROCESS] ✓ Subprocess completed in 0.1s
[PROCESS] Exit code: 0
[TRACK.PY] Starting track.py...
[TRACK.PY] Loading models...
```

## Next Steps

1. **Restart Flask wrapper** using one of the methods above
2. **Verify it's running** with the health check
3. **Test video upload** through the web UI
4. **Monitor logs** for successful execution
5. **Check for `[TRACK.PY]` logs** to confirm track.py is executing

## Troubleshooting

### Flask wrapper won't start
- Check if port 5000 is already in use: `wsl netstat -tlnp | grep 5000`
- Kill any existing process: `wsl pkill -9 -f flask_wrapper`
- Check for Python errors: `wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py 2>&1 | head -50`

### Still getting "source: not found" error
- Verify the code changes are in place: `grep -n "executable.*bash" /home/ben/pose-service/flask_wrapper_minimal_safe.py`
- Check if file was saved correctly: `wsl tail -20 /home/ben/pose-service/flask_wrapper_minimal_safe.py`
- Restart Flask wrapper again

### Video upload still failing
- Check WSL path conversion: `wsl wslpath "C:/Users/benja/repos/SnowboardingExplained/backend/uploads/test.mov"`
- Check if video file exists: `wsl ls -lh /tmp/pose-videos/`
- Check Flask wrapper logs for errors

## Summary

**The fixes are implemented and correct.** The Flask wrapper just needs to be restarted to load the new code. This is a common issue when modifying Python code - the running process keeps the old code in memory.

**Action**: Restart Flask wrapper now using the PowerShell script or manual steps above.
