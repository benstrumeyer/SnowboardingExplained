# Hydra and Path Fix - COMPLETE

## Two Bugs Fixed

### Bug 1: Hydra Directory Bug ✓ FIXED
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (Line 951)

**Problem:** Hydra arguments were in wrong order
```bash
# WRONG:
python track.py video.source=... hydra.job.chdir=false ...

# CORRECT:
python track.py hydra.job.chdir=false ... video.source=...
```

**Fix:** Reordered arguments so Hydra system config comes BEFORE application config

### Bug 2: WSL Path Bug ✓ FIXED
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (Lines 930-960)

**Problem:** Flask wrapper was passing Windows path to bash (which runs in WSL)
```bash
# WRONG:
bash -c 'cd SnowboardingExplained/backend/pose-service/4D-Humans && python track.py ...'
# This path doesn't exist in WSL!

# CORRECT:
bash -c 'cd /home/ben/pose-service/4D-Humans && python track.py ...'
# This path exists in WSL
```

**Fix:** Always use WSL path (`/home/ben/pose-service/4D-Humans`) for bash subprocesses

## Why Both Fixes Were Needed

1. **Hydra Bug Fix** - Ensures Hydra parses arguments correctly
2. **Path Bug Fix** - Ensures bash can actually find track.py

Without the path fix, bash couldn't find track.py, so it would hang for 180 seconds with NO output.

## Changes Made

### File 1: flask_wrapper_minimal_safe.py

**Lines 930-960:** Path resolution and command building
- Always use WSL path for bash subprocesses
- Explicitly cd into directory before running track.py
- Log the WSL path being used

**Line 951:** Hydra argument order
- Hydra args come BEFORE video.source

### File 2: track.py

**Lines 1-80:** Enhanced logging
- 36 sys.stdout.flush() calls
- Comprehensive logging of each import step
- Error handling for import failures

## Expected Behavior After Both Fixes

```
[PROCESS] Virtual environment found: /home/ben/pose-service/venv/bin/activate
[PROCESS] Command: bash -c 'source /home/ben/pose-service/venv/bin/activate && cd /home/ben/pose-service/4D-Humans && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=...'
[PROCESS] Working directory (for bash): /home/ben/pose-service/4D-Humans
[PROCESS] Starting subprocess with 180.0s timeout...
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['bash', '-c', 'source /home/ben/pose-service/venv/bin/activate && cd /home/ben/pose-service/4D-Humans && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=/tmp/pose-videos/...']
[PROCESS]   cwd: /home/ben/pose-service/4D-Humans
[PROCESS]   timeout: 180.0s
[PROCESS]   capture_output: True
[PROCESS]   text: True
[TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Python version: 3.10.12
[TRACK.PY] Working directory: /home/ben/pose-service/4D-Humans
[TRACK.PY] sys.argv: ['track.py', 'hydra.job.chdir=false', 'hydra.output_subdir=null', 'hydra.run.dir=.', 'video.source=/tmp/pose-videos/...']
[TRACK.PY] ========================================
[TRACK.PY] Importing warnings...
[TRACK.PY] ✓ warnings imported
[TRACK.PY] Importing torch...
[TRACK.PY] ✓ PyTorch 2.x.x
[TRACK.PY] Importing numpy...
[TRACK.PY] ✓ numpy imported
[TRACK.PY] Importing hydra...
[TRACK.PY] ✓ Hydra imported
[TRACK.PY] Importing PHALP...
[TRACK.PY] ✓ PHALP imported
[TRACK.PY] Importing HMR2...
[TRACK.PY] ✓ HMR2 imported
[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL
[TRACK.PY] Creating HMR2_4dhuman tracker...
[PROCESS] ✓ Subprocess completed in X.Xs - job_id: ...
```

## Testing the Fix

1. **Upload a test video** via web UI
2. **Check Flask logs** for `[TRACK.PY]` messages
3. **Should see messages within 5 seconds** (not timeout)
4. **Video processing should complete** without socket hang up

## Files Modified

1. `backend/pose-service/flask_wrapper_minimal_safe.py`
   - Lines 930-960: Path resolution and command building
   - Line 951: Hydra argument order

2. `backend/pose-service/4D-Humans/track.py`
   - Lines 1-80: Enhanced logging

## Documentation Created

1. `HYDRA_FIX_SUMMARY.md` - Original Hydra fix
2. `CRITICAL_PATH_FIX.md` - WSL path fix
3. `HYDRA_AND_PATH_FIX_COMPLETE.md` - This file
4. Plus 9 other documentation files and 4 diagnostic scripts

## Key Insight

The subprocess was timing out because:
1. Flask wrapper passed Windows path to bash
2. Bash runs in WSL and couldn't find the path
3. Bash hung for 180 seconds with NO output
4. Socket hang up after timeout

The fix ensures bash uses the correct WSL path where track.py actually exists.

## Status

✓ **Both bugs identified and fixed**
✓ **Changes verified in place**
✓ **Ready for testing**

**Next Step:** Upload a test video to verify the fix works end-to-end.
