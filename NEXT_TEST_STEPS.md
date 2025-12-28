# NEXT TEST STEPS

## Current Status

✅ **Subprocess fix is complete and verified**

The Flask wrapper subprocess is now:
- ✅ Not hanging (completes in 0.1s instead of timing out at 180s)
- ✅ Executing bash commands properly (shell=True)
- ✅ Using bash instead of sh (executable='/bin/bash')
- ✅ Activating virtual environment (source command works)

## What's Next

### Step 1: Restart Flask Wrapper

```bash
# Kill the current Flask wrapper
pkill -f flask_wrapper_minimal_safe.py

# Start it again with the updated code
cd /home/ben/pose-service
python flask_wrapper_minimal_safe.py
```

### Step 2: Upload a Test Video

Use the web UI or curl:

```bash
curl -X POST http://localhost:5000/api/pose/video \
  -F "video=@/tmp/test-video.mov"
```

### Step 3: Monitor Flask Logs

Watch for these key indicators:

```
[PROCESS] Starting subprocess with 180.0s timeout...
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['bash', '-c', 'source ... && python track.py ...']
[PROCESS] ✓ Subprocess completed in X.Xs - job_id: ...
[PROCESS] Exit code: 0
[TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Python version: ...
[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL
[TRACK.PY] Hydra main() decorator executed
[TRACK.PY] main() called
[TRACK.PY] ✓ Tracking completed in X.Xs
[PROCESS] ===== STDOUT START =====
[PROCESS] ===== STDOUT END =====
```

### Step 4: Verify Results

Check that:
1. ✅ Subprocess completes in 5-15 seconds (not timing out at 180s)
2. ✅ `[TRACK.PY]` logs appear in output
3. ✅ Exit code is 0 (success)
4. ✅ Mesh data appears in database

## Expected Behavior

**Subprocess execution timeline:**
- T+0s: Subprocess starts
- T+0.1s: Virtual environment activated
- T+0.2s: track.py imports begin
- T+5-15s: PHALP tracking completes
- T+15s: Subprocess exits with code 0

**Log output:**
- `[PROCESS]` logs show subprocess progress
- `[TRACK.PY]` logs show track.py execution
- No timeout errors
- Exit code 0

## Troubleshooting

If you still see issues:

1. **Subprocess still hangs?**
   - Verify `shell=True` is in the code
   - Verify `executable='/bin/bash'` is in the code
   - Verify `subprocess.run(cmd[2], **run_kwargs)` is being used

2. **`source: not found` error?**
   - Verify `executable='/bin/bash'` is in the code
   - Check that `/bin/bash` exists on your system

3. **No `[TRACK.PY]` logs?**
   - Check that track.py has the enhanced logging (lines 1-80)
   - Verify stdout/stderr are being captured

4. **Exit code not 0?**
   - Check Flask logs for error messages
   - Check if dependencies are installed
   - Check if GPU is available

## Files Modified

- `backend/pose-service/flask_wrapper_minimal_safe.py`
  - Line 978: Added `'shell': True`
  - Line 979: Added `'executable': '/bin/bash'`
  - Line 987: Changed to `subprocess.run(cmd[2], **run_kwargs)`

## Success Criteria

✅ All of the following must be true:

1. Subprocess completes in < 20 seconds
2. `[TRACK.PY]` logs appear in Flask output
3. Exit code is 0
4. Mesh data is stored in database
5. No timeout errors in logs

## Documentation

- `SUBPROCESS_FIX_COMPLETE.md` - Complete fix documentation
- `CRITICAL_SHELL_TRUE_FIX_COMPLETE.md` - shell=True fix details
- `BASH_EXECUTABLE_FIX.md` - Bash executable fix details
- `test-track-py-subprocess.py` - Test script

Ready to test!
