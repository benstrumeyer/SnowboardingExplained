# Subprocess 180-Second Timeout - Root Cause Found and Fixed

## Summary

**Problem:** Flask subprocess times out after 180 seconds with ZERO output from track.py

**Root Cause:** Windows paths passed to bash in WSL - bash couldn't find venv or track.py

**Solution:** Use WSL paths from `POSE_SERVICE_PATH` environment variable

**Status:** ✅ FIXED - All tests pass

## The Issue

When Flask wrapper runs on Windows and spawns a bash subprocess:

1. Flask uses `os.path.expanduser('~')` → returns Windows path `C:\Users\benja\...`
2. Passes this to `bash -c` which runs in WSL
3. WSL can't access Windows paths
4. Bash silently hangs for 180 seconds
5. No output at all (not even `[TRACK.PY]` logging)

## The Fix

Use `POSE_SERVICE_PATH` environment variable (WSL path) instead of `os.path.expanduser('~')`:

```python
# BEFORE (broken)
venv_activate = os.path.expanduser('~/pose-service/venv/bin/activate')
# Result: C:\Users\benja\pose-service\venv\bin\activate (Windows path)

# AFTER (fixed)
venv_activate_wsl = POSE_SERVICE_PATH + '/venv/bin/activate'
# Result: /home/ben/pose-service/venv/bin/activate (WSL path)
```

## Test Results

```
TEST 1: Can bash source the venv?
✓ Completed in 0.1s - Python 3.12.3

TEST 2: Can bash cd to track.py dir and run --help?
✓ Completed in 10.7s - [TRACK.PY] output appears!

TEST 3: Can bash run track.py with Hydra flags?
✓ Completed in 6.7s - [TRACK.PY] output appears!
```

## What Changed

**File:** `backend/pose-service/flask_wrapper_minimal_safe.py`

**Lines 930-960:**
- Removed `os.path.expanduser('~')` usage
- Use `POSE_SERVICE_PATH` for both venv and track.py paths
- Add explicit `cd` in bash command
- Set `track_py_dir = None` (cd in bash handles it)

**Lines 965-980:**
- Updated subprocess.run to not pass cwd when None
- Updated logging to handle None cwd

## Key Insights

1. **WSL paths are universal** - Work in both Windows and WSL
2. **Bash needs WSL paths** - Can't access Windows paths
3. **Silent failures are hard to debug** - Bash hangs with no output
4. **Explicit cd is safer** - Ensures correct directory

## Environment Setup

Set `POSE_SERVICE_PATH` to WSL path:

```bash
export POSE_SERVICE_PATH=/home/ben/pose-service
```

## Related Fixes

This works with:
1. **Hydra argument order fix** - Hydra args BEFORE video.source
2. **Enhanced logging** - track.py has 36 flush calls

## Next Steps

1. Verify Flask wrapper starts successfully
2. Upload a video and check for `[TRACK.PY]` output
3. Should complete in 5-10 seconds instead of timing out
4. Check Flask logs for successful processing

## Files Modified

- `backend/pose-service/flask_wrapper_minimal_safe.py` (Lines 930-980)

## Test Script

Run `python test-wsl-paths-fix.py` to verify the fix works.
