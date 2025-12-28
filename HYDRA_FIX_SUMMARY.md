# Hydra Fix Summary - What Changed

## The Problem
Subprocess times out after 180 seconds with NO output. The `[TRACK.PY]` logging never appears, meaning track.py isn't even starting.

## Root Cause
The Hydra arguments were being passed AFTER `video.source=`, which means Hydra was parsing them as part of the video config instead of as Hydra system config.

## The Fix

### Change 1: Reorder Hydra Arguments (flask_wrapper_minimal_safe.py)
**BEFORE:**
```python
cmd = ['bash', '-c', f'source {venv_activate} && python track.py video.source={video_path} hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.']
```

**AFTER:**
```python
cmd = ['bash', '-c', f'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']
```

**Why:** Hydra parses arguments left-to-right. System config args must come BEFORE application args.

### Change 2: Enhanced Import Logging (track.py)
Added `sys.stdout.flush()` after EVERY import statement to ensure logging appears immediately, even if the process hangs later.

**Before:**
```python
print("[TRACK.PY] Importing torch...", flush=True)
import torch
print(f"[TRACK.PY] ✓ PyTorch {torch.__version__}", flush=True)
```

**After:**
```python
print("[TRACK.PY] Importing torch...", flush=True)
sys.stdout.flush()
import torch
print(f"[TRACK.PY] ✓ PyTorch {torch.__version__}", flush=True)
sys.stdout.flush()
```

## How to Test

### Quick Test
Run the diagnostic script:
```bash
cd SnowboardingExplained
python test-hydra-only.py
```

This will test:
1. Python in venv
2. Hydra import
3. track.py --help
4. track.py with Hydra flags
5. track.py with video.source (actual command)

### Full Test
1. Upload a video via the web UI
2. Check Flask logs for `[TRACK.PY]` messages
3. Should see messages within 5 seconds instead of timing out

## Expected Behavior

### Before Fix
```
[PROCESS] Starting subprocess with 180.0s timeout...
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['bash', '-c', 'source ... && python track.py video.source=... hydra.job.chdir=false ...']
[PROCESS] ✗ Subprocess failed with timeout after 180 seconds
```

### After Fix
```
[PROCESS] Starting subprocess with 180.0s timeout...
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['bash', '-c', 'source ... && python track.py hydra.job.chdir=false ... video.source=...']
[TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Importing warnings...
[TRACK.PY] ✓ warnings imported
[TRACK.PY] Importing torch...
[TRACK.PY] ✓ PyTorch 2.x.x
...
[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL
[TRACK.PY] Hydra main() decorator executed
[TRACK.PY] main() called
[TRACK.PY] Creating HMR2_4dhuman tracker...
```

## Files Modified
1. `backend/pose-service/flask_wrapper_minimal_safe.py` - Reordered Hydra args
2. `backend/pose-service/4D-Humans/track.py` - Enhanced import logging

## Comparison with 4D-Humans
✅ 4D-Humans README:
```bash
python track.py video.source="example_data/videos/gymnasts.mp4"
```

✅ Our command (with Hydra flags):
```bash
python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source="/path/to/video.mov"
```

The order now matches the expected pattern: Hydra system config first, then application config.

## Next Steps
1. Run `test-hydra-only.py` to verify the fix
2. Upload a test video to verify end-to-end
3. Monitor logs for `[TRACK.PY]` messages appearing within 5 seconds
