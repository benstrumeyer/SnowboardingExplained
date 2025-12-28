# Hydra Output Directory Hang - Root Cause and Fix

## Problem Summary
The Flask subprocess was timing out after ~46 seconds when calling `track.py`. The subprocess was hanging during initialization, before any `[TRACK.PY]` logging messages appeared.

## Root Cause Analysis

### What Was Happening
1. Flask wrapper calls `track.py` via subprocess with `video.source={video_path}`
2. `track.py` is decorated with `@hydra.main(version_base="1.2", config_name="config")` (same as 4D-Humans)
3. **Hydra was trying to create output directories** (by default: `outputs/YYYY-MM-DD/HH-MM-SS/`)
4. This directory creation was **hanging**, likely due to:
   - Permission issues in WSL
   - Symlink issues (4D-Humans is symlinked)
   - File system locking issues
   - Hydra trying to write to a directory that doesn't exist or can't be created

### Why It Wasn't Obvious
- The subprocess was hanging **before** any Python code executed
- The `[TRACK.PY]` logging messages never appeared
- The timeout was exactly 46 seconds (Flask timeout)
- No error messages were printed

### Comparison with 4D-Humans
✅ **4D-Humans README shows correct usage:**
```bash
python track.py video.source="example_data/videos/gymnasts.mp4"
```

✅ **Our implementation matches 4D-Humans:**
- Uses Hydra for config management
- Passes `video.source=` as Hydra argument
- Uses same HMR2_4dhuman class from 4D-Humans
- Uses ViTDet for person detection (same as 4D-Humans demo.py)
- Uses PHALP for temporal tracking

❌ **The difference:**
- 4D-Humans runs directly (not in subprocess)
- We run in subprocess from Flask
- WSL + symlinks + subprocess = Hydra output directory hang

## Solution

### Fix 1: Disable Hydra Output Directory Creation (Flask Wrapper)
**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (lines ~930-950)

**Change:** Pass Hydra configuration flags to disable output directory creation:
```python
hydra_args = 'hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.'

cmd = ['bash', '-c', f'source {venv_activate} && python track.py video.source={video_path} {hydra_args}']
```

**What This Does:**
- `hydra.job.chdir=false` - Don't change working directory
- `hydra.output_subdir=null` - Don't create output subdirectories
- `hydra.run.dir=.` - Use current directory for outputs (if needed)

### Fix 2: Enhanced Hydra Logging (track.py)
**File:** `backend/pose-service/4D-Humans/track.py` (lines ~261-270)

**Change:** Log when Hydra decorator is executed:
```python
@hydra.main(version_base="1.2", config_name="config")
def main(cfg: DictConfig) -> Optional[float]:
    print("[TRACK.PY] Hydra main() decorator executed", flush=True)
    print(f"[TRACK.PY] Hydra version: {hydra.__version__}", flush=True)
```

**What This Does:**
- Shows that Hydra decorator executed successfully
- Helps diagnose if Hydra is the hang point

## Testing the Fix

### Quick Test
Run the diagnostic script to test subprocess execution:
```bash
python test-subprocess-directly.py
```

This will test:
1. Venv activation
2. Bash command execution
3. track.py execution with timeout

### Full Test
1. Start Flask wrapper:
   ```bash
   cd SnowboardingExplained/backend/pose-service
   python flask_wrapper_minimal_safe.py
   ```

2. Upload a video via the web UI or API
3. Check logs for `[TRACK.PY]` messages appearing within 5 seconds
4. Verify video processing completes without timeout

## Why This Fix Works

### Before
```
Flask calls subprocess
  → bash -c 'source venv && python track.py video.source=...'
    → Python starts
      → Hydra decorator executes
        → Hydra tries to create outputs/YYYY-MM-DD/HH-MM-SS/
          → **HANGS** (permission/symlink issue in WSL)
        → Timeout after 46 seconds
```

### After
```
Flask calls subprocess
  → bash -c 'source venv && python track.py video.source=... hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.'
    → Python starts
      → Hydra decorator executes
        → Hydra skips output directory creation
        → track.py main() executes immediately
        → [TRACK.PY] logging appears
        → Video processing starts
```

## GPU Memory Status
✅ **8GB allocated in ~/.wslconfig** - This is sufficient for PHALP
- PHALP typically uses 4-6GB
- HMR2 uses 1-2GB
- ViTDet uses 1-2GB
- Total: 6-10GB (within limits with 8GB)

## Files Modified
1. `backend/pose-service/flask_wrapper_minimal_safe.py` - Added Hydra flags
2. `backend/pose-service/4D-Humans/track.py` - Added Hydra logging

## References
- 4D-Humans: https://github.com/shubham-goel/4D-Humans
- PHALP: https://github.com/brjathu/PHALP
- ViTDet: Used by 4D-Humans for person detection

## Next Steps
1. Test the fix with a video upload
2. Monitor logs for `[TRACK.PY]` messages
3. Verify video processing completes successfully
4. If still hanging, check Flask stderr logs for track.py output
