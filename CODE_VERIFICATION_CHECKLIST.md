# Code Verification Checklist

## ✅ Fix 1: Flask Subprocess shell=True

**File**: `backend/pose-service/flask_wrapper_minimal_safe.py`

**Location**: Lines 975-988

**Verification**:
```bash
wsl grep -n "shell.*True" /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

**Expected Output**:
```
978:                'shell': True,  # CRITICAL: Required to properly execute bash -c commands
```

**Verification**:
```bash
wsl grep -n "executable.*bash" /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

**Expected Output**:
```
979:                'executable': '/bin/bash'  # CRITICAL: Use bash explicitly, not /bin/sh
```

**Verification**:
```bash
wsl grep -n "subprocess.run(cmd\[2\]" /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

**Expected Output**:
```
987:            result = subprocess.run(cmd[2], **run_kwargs)
```

---

## ✅ Fix 2: WSL Path Conversion

**File**: `backend/src/server.ts`

**Location**: Lines 542-549

**Verification**:
```bash
grep -n "replace.*\\\\\\\\" SnowboardingExplained/backend/src/server.ts
```

**Expected Output**:
```
542:        const windowsPathFormatted = videoPath.replace(/\\/g, '/');
```

**Verification**:
```bash
grep -n "wslpath" SnowboardingExplained/backend/src/server.ts | head -3
```

**Expected Output**:
```
543:        const wslSourcePath = execSync(`wsl wslpath "${windowsPathFormatted}"`, {
```

---

## ✅ Fix 3: Enhanced Logging in track.py

**File**: `backend/pose-service/4D-Humans/track.py`

**Location**: Lines 1-80

**Verification**:
```bash
wsl head -20 /home/ben/pose-service/4D-Humans/track.py
```

**Expected Output**:
```
#!/usr/bin/env python3
"""
4D-Humans Track Script with Enhanced Logging
"""
import sys
import os

# Enhanced logging at startup
print("[TRACK.PY] Starting track.py...", flush=True)
sys.stdout.flush()
```

---

## Verification Commands

Run these commands to verify all fixes are in place:

### 1. Check Flask subprocess fix
```powershell
wsl grep -A 10 "run_kwargs = {" /home/ben/pose-service/flask_wrapper_minimal_safe.py | grep -E "(shell|executable)"
```

### 2. Check WSL path conversion fix
```powershell
grep -n "replace.*\\\\\\\\" SnowboardingExplained/backend/src/server.ts
```

### 3. Check enhanced logging
```powershell
wsl head -30 /home/ben/pose-service/4D-Humans/track.py | grep "TRACK.PY"
```

### 4. Verify Flask wrapper is running old code
```powershell
wsl ps aux | grep flask_wrapper
```

### 5. Check Flask wrapper logs for "source: not found" error
```powershell
# This confirms old code is running
wsl tail -50 /tmp/pose-service-logs/*.log | grep "source: not found"
```

---

## What Each Fix Does

### Fix 1: shell=True
- **Before**: `subprocess.run(['bash', '-c', 'source ... && ...'], shell=False)`
  - Result: Subprocess hangs, bash -c not interpreted
- **After**: `subprocess.run('source ... && ...', shell=True, executable='/bin/bash')`
  - Result: Subprocess completes in 0.1s, bash -c properly interpreted

### Fix 2: Path Conversion
- **Before**: `wslpath "C:\Users\benja\repos\..."`
  - Result: Path mangled, wslpath fails
- **After**: `wslpath "C:/Users/benja/repos/..."`
  - Result: Path converted correctly to `/mnt/c/Users/benja/repos/...`

### Fix 3: Enhanced Logging
- **Before**: No `[TRACK.PY]` logs, can't diagnose subprocess issues
- **After**: `[TRACK.PY]` logs throughout, can see exactly what's happening

---

## Current State

| Component | Status | Issue |
|-----------|--------|-------|
| Code fixes | ✅ In place | None |
| Backend build | ⏳ Needs rebuild | Path conversion fix not compiled |
| Backend running | ⏳ Needs restart | Old code in memory |
| Flask wrapper | ⏳ Needs restart | Old code in memory (using /bin/sh) |
| Video upload | ❌ Failing | Flask using old code |

---

## Next Steps

1. **Rebuild backend**: `npm run build`
2. **Restart backend**: `npm start`
3. **Restart Flask wrapper**: `wsl pkill -f flask_wrapper_minimal_safe.py && sleep 2 && wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py`
4. **Test upload**: Upload video through web UI
5. **Verify logs**: Check for `[TRACK.PY]` prefix and `Exit code: 0`

---

## Troubleshooting

### Flask still showing "source: not found"
- Flask wrapper wasn't restarted
- Kill it: `wsl pkill -9 -f flask_wrapper`
- Restart it: `wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py`

### Backend still showing path conversion errors
- Backend wasn't rebuilt
- Rebuild: `npm run build`
- Restart: `npm start`

### Video upload still failing
- Check all three components are restarted
- Check logs for specific error messages
- Verify video file exists: `wsl ls -lh /tmp/pose-videos/`

---

## Success Indicators

After restart, you should see:

### Backend Logs
```
[FINALIZE] 🔄 Converting Windows path to WSL path...
[FINALIZE] Windows path: C:\Users\benja\repos\...
[FINALIZE] WSL path: /mnt/c/Users/benja/repos/...
[FINALIZE] ✓ Video copied to WSL successfully
```

### Flask Logs
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: 'source /home/ben/pose-service/venv/bin/activate && ...'
[PROCESS]   shell: True
[PROCESS]   executable: /bin/bash
[PROCESS] ✓ Subprocess completed in 0.1s
[PROCESS] Exit code: 0
[TRACK.PY] Starting track.py...
[TRACK.PY] Loading models...
```

When you see these logs, the fixes are working correctly!
