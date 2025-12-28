# IMMEDIATE ACTION REQUIRED

## The Issue
Flask wrapper code was updated but changes didn't take effect because Python bytecode cache wasn't cleared.

## The Fix (2 minutes)

### Step 1: Clear Cache
```powershell
wsl bash -c "find /home/ben/pose-service -name '*.pyc' -delete"
wsl bash -c "find /home/ben/pose-service -name '__pycache__' -type d -delete"
```

### Step 2: Kill Flask
```powershell
wsl bash -c "pkill -9 python"
Start-Sleep -Seconds 2
```

### Step 3: Restart Flask
```powershell
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

### Step 4: Test
Upload a video and check logs for:
- ✅ `[TRACK.PY]` prefix (proves new code is running)
- ✅ `Exit code: 0` (success)
- ❌ NOT `/bin/sh: source: not found` (old code)

---

## Why This Works

Python caches compiled bytecode in `.pyc` files:
1. When you modify `flask_wrapper_minimal_safe.py`, the source changes
2. But the cached `.pyc` bytecode doesn't update
3. When Flask restarts, it loads the old `.pyc` file
4. Your code changes don't take effect

**Solution**: Delete the `.pyc` files so Python recompiles from the source

---

## What Changed in the Code

### File: `flask_wrapper_minimal_safe.py` (Lines 975-988)

**Before (Old Code - Using /bin/sh)**:
```python
result = subprocess.run(cmd, shell=False)  # ❌ Doesn't work
# Result: /bin/sh: 1: source: not found
```

**After (New Code - Using /bin/bash)**:
```python
run_kwargs = {
    'timeout': timeout_seconds,
    'capture_output': True,
    'text': True,
    'shell': True,  # ✅ Required for bash -c
    'executable': '/bin/bash'  # ✅ Use bash, not /bin/sh
}
result = subprocess.run(cmd[2], **run_kwargs)  # ✅ Pass string with shell=True
```

**Why it works:**
- `shell=True` tells Python to use a shell to interpret the command
- `executable='/bin/bash'` tells Python to use bash (not /bin/sh)
- Bash supports the `source` command
- `/bin/sh` doesn't support `source` (causes the error)

---

## Verification

After restarting, upload a test video and check the logs:

### ✅ Success (New Code Running)
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: 'source /home/ben/pose-service/venv/bin/activate && ...'
[PROCESS]   shell: True
[PROCESS]   executable: /bin/bash
[PROCESS] ✓ Subprocess completed in 0.1s
[PROCESS] Exit code: 0
[TRACK.PY] Starting track.py...
[TRACK.PY] Loading models...
[TRACK.PY] Processing video...
```

### ❌ Failure (Old Code Still Running)
```
[PROCESS] Exit code: 127
[PROCESS] stderr: /bin/sh: 1: source: not found
```

---

## Timeline

- Clear cache: 5 seconds
- Kill processes: 2 seconds
- Restart Flask: 30-60 seconds (models load on first request)
- **Total**: ~1 minute

---

## If It Still Doesn't Work

### Check 1: Verify cache was cleared
```powershell
wsl bash -c "find /home/ben/pose-service -name '*.pyc' | wc -l"
# Should output: 0
```

### Check 2: Verify process was killed
```powershell
wsl ps aux | wsl grep python
# Should be empty (no python processes)
```

### Check 3: Try with -B flag (don't write bytecode)
```powershell
wsl python -B /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

### Check 4: Restart WSL
```powershell
wsl --shutdown
# Wait 10 seconds
wsl python /home/ben/pose-service/flask_wrapper_minimal_safe.py
```

---

## Summary

1. **Code changes**: ✅ Already in place
2. **Problem**: ❌ Python bytecode cache not cleared
3. **Solution**: Clear cache and restart
4. **Time**: ~1 minute
5. **Result**: Flask wrapper will use new code with shell=True and executable=/bin/bash

**Action**: Run the 3 steps above NOW!

---

## Long-term Recommendation

Consider refactoring to direct Python execution (like 4D-Humans demo.py):
- No subprocess overhead
- No bytecode caching issues
- Models loaded once, reused
- Simpler code
- Better performance

See `4D_HUMANS_VS_OUR_FLOW.md` for details.

---

## Questions?

Check these documents:
- `FIX_BYTECODE_CACHE_ISSUE.md` - Detailed explanation
- `COMPARISON_4D_HUMANS_FLOW.md` - Flow comparison
- `4D_HUMANS_VS_OUR_FLOW.md` - Detailed comparison
- `CODE_VERIFICATION_CHECKLIST.md` - Verify code is in place
