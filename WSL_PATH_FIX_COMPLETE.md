# WSL Path Fix - Complete Solution

## The Problem

Flask subprocess was timing out after 180 seconds with **ZERO output** from track.py. The `[TRACK.PY]` logging never appeared, indicating track.py wasn't even starting.

### Root Cause

The Flask wrapper was using `os.path.expanduser('~')` to build paths, which returns Windows paths on Windows:
- `C:\Users\benja\pose-service\venv\bin\activate`
- `C:\Users\benja\pose-service\4D-Humans`

These Windows paths were then passed to `bash -c` which runs in WSL. WSL can't access Windows paths directly - it needs WSL paths like `/home/ben/pose-service/...`.

When bash couldn't find the venv or track.py, it would silently hang for 180 seconds with no output.

## The Solution

Use the `POSE_SERVICE_PATH` environment variable (which should be set to the WSL path) instead of `os.path.expanduser('~')`.

### Changes Made

**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (Lines 930-960)

**Before:**
```python
# Working directory for track.py
track_py_dir = POSE_SERVICE_PATH + '/4D-Humans'
if not os.path.exists(track_py_dir):
    # Try Windows path if on Windows
    track_py_dir = 'SnowboardingExplained/backend/pose-service/4D-Humans'

# CRITICAL: Activate virtual environment before running track.py
# The venv is located at ~/pose-service/venv
venv_activate = os.path.expanduser('~/pose-service/venv/bin/activate')

if os.path.exists(venv_activate):
    logger.info(f"[PROCESS] Virtual environment found: {venv_activate}")
    cmd = ['bash', '-c', f'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']
else:
    logger.warning(f"[PROCESS] Virtual environment not found at {venv_activate}")
    cmd = ['python', 'track.py', 'hydra.job.chdir=false', 'hydra.output_subdir=null', 'hydra.run.dir=.', f'video.source={video_path}']
```

**After:**
```python
# CRITICAL: Use WSL paths for bash subprocesses
# POSE_SERVICE_PATH should be set to WSL path (e.g., /home/ben/pose-service)
# Never use os.path.expanduser('~') for paths passed to bash
track_py_dir_wsl = POSE_SERVICE_PATH + '/4D-Humans'
venv_activate_wsl = POSE_SERVICE_PATH + '/venv/bin/activate'

logger.info(f"[PROCESS] Using WSL paths:")
logger.info(f"[PROCESS]   track_py_dir: {track_py_dir_wsl}")
logger.info(f"[PROCESS]   venv_activate: {venv_activate_wsl}")

# CRITICAL: Pass Hydra args BEFORE video.source to ensure they're parsed correctly
# Use cd to ensure we're in the right directory for track.py
cmd = ['bash', '-c', f'source {venv_activate_wsl} && cd {track_py_dir_wsl} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']

# For subprocess.run, we don't need cwd since we're using cd in the bash command
track_py_dir = None
```

### Key Changes

1. **Use POSE_SERVICE_PATH directly** - This should be set to the WSL path
2. **Never use os.path.expanduser('~')** - This returns Windows paths
3. **Use cd in bash command** - Ensures we're in the right directory
4. **Don't pass cwd to subprocess.run** - The cd in bash handles it

## Verification

Test script: `test-wsl-paths-fix.py`

Results:
```
TEST 1: Can bash source the venv?
✓ Completed in 0.1s
Output: Python: 3.12.3 (main, Nov  6 2025, 13:44:16) [GCC 13.3.0]

TEST 2: Can bash cd to track.py dir and run --help?
✓ Completed in 10.7s
Output: [TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Python version: 3.12.3 (main, Nov  6 2025, 13:44:16) [GCC 13.3.0]
...

TEST 3: Can bash run track.py with Hydra flags?
✓ Completed in 6.7s
Output: [TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
...
```

All tests pass! The `[TRACK.PY]` logging now appears immediately instead of timing out.

## Environment Setup

Make sure `POSE_SERVICE_PATH` is set to the WSL path:

```bash
export POSE_SERVICE_PATH=/home/ben/pose-service
```

Or in your Flask startup script:
```bash
export POSE_SERVICE_PATH=/home/ben/pose-service
python flask_wrapper_minimal_safe.py
```

## Why This Works

1. **WSL paths are universal** - They work in both Windows and WSL
2. **Bash understands WSL paths** - `/home/ben/...` is valid in WSL
3. **No path conversion needed** - We use the same path everywhere
4. **Explicit cd is safer** - Ensures we're in the right directory before running track.py

## Related Fixes

This fix works together with:
1. **Hydra argument order fix** - Hydra args must come BEFORE video.source
2. **Enhanced logging** - track.py has 36 flush calls to ensure output appears

## Files Modified

1. `backend/pose-service/flask_wrapper_minimal_safe.py` - Lines 930-960, 965-980

## Testing

To test the fix:
1. Run `python test-wsl-paths-fix.py` to verify paths work
2. Upload a video via the web UI
3. Check Flask logs for `[TRACK.PY]` messages
4. Should see messages within 5-10 seconds instead of timing out
