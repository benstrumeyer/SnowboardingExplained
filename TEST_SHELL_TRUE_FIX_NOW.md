# TEST THE SHELL=TRUE FIX NOW

## Quick Summary

The critical `shell=True` fix has been applied to the Flask wrapper. This fixes the 180-second timeout with zero output from track.py.

**What was fixed:**
- Line 978: Added `'shell': True` to run_kwargs
- Line 987: Changed `subprocess.run(cmd, **run_kwargs)` to `subprocess.run(cmd[2], **run_kwargs)`

## How to Test

### Step 1: Start Flask Wrapper

```bash
# In WSL or your Python environment
cd /home/ben/pose-service
python flask_wrapper_minimal_safe.py
```

You should see:
```
[STARTUP] ✓ Flask wrapper started on http://0.0.0.0:5000
[STARTUP] ✓ Models initialized
```

### Step 2: Upload a Test Video

Use the web UI or curl:

```bash
curl -X POST http://localhost:5000/api/pose/video \
  -F "video=@/path/to/test-video.mov"
```

### Step 3: Monitor Flask Logs

Watch for `[TRACK.PY]` output. You should see:

```
[PROCESS] Starting subprocess with 180.0s timeout...
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['bash', '-c', 'source ... && python track.py ...']
[PROCESS]   timeout: 180.0s
[PROCESS]   capture_output: True
[PROCESS]   text: True
[TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Python version: ...
[TRACK.PY] Working directory: ...
[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL
[TRACK.PY] Hydra main() decorator executed
[TRACK.PY] main() called
[TRACK.PY] Setting cfg.video.extract_video = False
[TRACK.PY] Creating HMR2_4dhuman tracker...
[TRACK.PY] ✓ Tracker created
[TRACK.PY] Starting PHALP tracking...
[TRACK.PY] ✓ Tracking completed in X.Xs
[PROCESS] ✓ Subprocess completed in X.Xs - job_id: ...
[PROCESS] Exit code: 0
```

### Step 4: Verify Results

Check that:
1. ✅ `[TRACK.PY]` logs appear (subprocess is actually running)
2. ✅ Subprocess completes in 5-15 seconds (not timing out at 180s)
3. ✅ Exit code is 0 (success)
4. ✅ Mesh data appears in database

## Expected Behavior

**BEFORE FIX:**
- Subprocess hangs for 180 seconds
- Zero output from track.py
- No `[TRACK.PY]` logs
- Timeout error

**AFTER FIX:**
- Subprocess completes in 5-15 seconds
- `[TRACK.PY]` logs appear immediately
- Exit code 0 (success)
- Mesh data stored in database

## Troubleshooting

If you still see timeouts:

1. Check that the fix is in place:
   ```bash
   grep -n "shell.*True" backend/pose-service/flask_wrapper_minimal_safe.py
   ```
   Should show line 978 with `'shell': True`

2. Check that cmd[2] is being used:
   ```bash
   grep -n "subprocess.run(cmd\[2\]" backend/pose-service/flask_wrapper_minimal_safe.py
   ```
   Should show line 987

3. Restart Flask wrapper to ensure new code is loaded

## Files Changed

- `backend/pose-service/flask_wrapper_minimal_safe.py`
  - Lines 975-987: Added shell=True and changed to cmd[2]

## Verification

The fix has been verified with `test-track-py-subprocess.py`:
- ✅ Test 1: WITHOUT shell=True hangs (confirms bug)
- ✅ Test 2: WITH shell=True completes immediately (confirms fix)

Ready for production testing!
