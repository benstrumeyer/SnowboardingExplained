# Debugging Session Setup - Complete Guide

## Problem Statement

Flask subprocess crashes with "socket hang up" (ECONNRESET) after ~46 seconds when processing videos. The streaming mode fix is in place, but we need to identify what's actually causing the crash.

## Solution Implemented

Added comprehensive logging to both Flask wrapper and track.py to capture the execution flow and identify where the process hangs or crashes.

## Files Modified

### 1. Flask Wrapper
**File:** `SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py`

**Changes:**
- Enhanced subprocess logging (lines ~950-1000)
- Full stdout/stderr logging (not truncated)
- Improved timeout exception handler (lines ~1100-1115)
- Better error detection and reporting

### 2. track.py
**File:** `SnowboardingExplained/backend/pose-service/4D-Humans/track.py`

**Changes:**
- Module-level logging (lines ~30-37)
- HMR2Predictor logging (lines ~40-65)
- HMR2_4dhuman logging (lines ~180-210)
- Main function logging (lines ~230-270)
- All logging uses `flush=True` to ensure capture

## Documentation Created

1. **ENHANCED_LOGGING_FOR_DEBUGGING.md** - Detailed explanation of logging changes
2. **TEST_LOGGING_CHANGES.md** - Step-by-step testing guide
3. **LOGGING_CHANGES_SUMMARY.md** - Summary of all changes
4. **NEXT_ACTIONS.md** - Action plan with expected outcomes
5. **DEBUGGING_SESSION_SETUP.md** - This file

## Quick Start (5 minutes)

### Terminal 1: Restart Flask
```bash
# Kill existing Flask process
pkill -f flask_wrapper_minimal_safe.py

# Start Flask again
cd /home/ben/pose-service
python flask_wrapper_minimal_safe.py
```

### Terminal 2: Monitor Logs
```bash
# Watch logs in real-time
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
```

### Terminal 3: Upload Test Video
- Go to web UI at http://localhost:3000
- Upload a test video (50-100MB)
- Watch Terminal 2 for logs

## What to Look For

### Success Path
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['python', 'track.py', 'video.source=/tmp/pose-videos/v_*.mov']
[TRACK.PY] ========================================
[TRACK.PY] track.py started
[TRACK.PY] main() called
[TRACK.PY] Setting cfg.video.extract_video = False
[TRACK.PY] ✓ Streaming mode enabled
[TRACK.PY] Creating HMR2_4dhuman tracker...
[TRACK.PY] ✓ Tracker created
[TRACK.PY] Starting PHALP tracking...
[TRACK.PY] ✓ Tracking completed in 45.2s
[PROCESS] ✓ Subprocess completed in 45.2s
[PROCESS] Exit code: 0
```

### Timeout Path
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['python', 'track.py', 'video.source=/tmp/pose-videos/v_*.mov']
[TRACK.PY] ========================================
[TRACK.PY] track.py started
[TRACK.PY] main() called
[TRACK.PY] Setting cfg.video.extract_video = False
[TRACK.PY] ✓ Streaming mode enabled
[TRACK.PY] Creating HMR2_4dhuman tracker...
[TRACK.PY] ✓ Tracker created
[TRACK.PY] Starting PHALP tracking...
[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗
[PROCESS] Timeout after 46.0s (limit: 180.0s)
```

### Error Path
```
[TRACK.PY] ✗✗✗ ERROR IN main() ✗✗✗
[TRACK.PY] Error type: RuntimeError
[TRACK.PY] Error message: CUDA out of memory
[TRACK.PY] Traceback:
... (full traceback)
```

## Key Logging Points

| Log Message | Meaning |
|-------------|---------|
| `[TRACK.PY] track.py started` | track.py process started |
| `[TRACK.PY] main() called` | main() function entered |
| `[TRACK.PY] ✓ Streaming mode enabled` | Streaming mode successfully set |
| `[TRACK.PY] ✓ Tracker created` | PHALP tracker initialized |
| `[TRACK.PY] Starting PHALP tracking...` | PHALP.track() called |
| `[TRACK.PY] ✓ Tracking completed in X.Xs` | Tracking finished successfully |
| `[PROCESS] Exit code: 0` | Subprocess completed successfully |
| `[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗` | Process hung and timed out |
| `[TRACK.PY] ✗✗✗ ERROR IN main()` | Python error occurred |

## Diagnostic Commands

### Check GPU Memory
```bash
nvidia-smi
watch -n 1 nvidia-smi
```

### Check PHALP Logs
```bash
ls -la /tmp/phalp_output/
tail -f /tmp/phalp_output/*.log
```

### Check Flask Logs (Full)
```bash
tail -f /tmp/pose-service-logs/pose-service-*.log
```

### Check Flask Logs (Filtered)
```bash
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
```

### Test track.py Manually
```bash
cd /home/ben/pose-service/4D-Humans
python track.py video.source=/tmp/test.mov
```

## Expected Behavior

### Small Video (50MB, 30 FPS)
- Should complete in 60-90 seconds
- GPU memory should stay relatively constant
- Should see all [TRACK.PY] messages

### Medium Video (200MB, 60 FPS)
- Should complete in 120-180 seconds
- GPU memory should stay relatively constant
- Should see all [TRACK.PY] messages

### Large Video (500MB+)
- Should complete in 3-5 minutes
- GPU memory should stay relatively constant
- Should NOT crash with CUDA OOM

## Troubleshooting

### If you see timeout:
1. Check GPU memory: `nvidia-smi`
2. Check if streaming mode is enabled: Look for `✓ Streaming mode enabled`
3. Check PHALP logs: `tail -f /tmp/phalp_output/*.log`

### If you see error:
1. Look for the error type and message
2. Check the full traceback in logs
3. Fix based on error type

### If you see no [TRACK.PY] messages:
1. Check if track.py can run manually
2. Check if Python imports work
3. Check working directory and permissions

## Success Criteria

✅ Process completes without timeout
✅ Exit code is 0
✅ All [TRACK.PY] messages appear
✅ Mesh data is returned to Node.js
✅ Web UI displays data correctly

## Timeline

- **0-5 min:** Restart Flask and start monitoring
- **5-10 min:** Upload test video
- **10-15 min:** Collect logs
- **15-30 min:** Analyze logs and identify issue
- **30-45 min:** Implement fix if needed
- **45+ min:** Test fix

## Next Steps After Debugging

1. **If successful:** Test with larger videos, move to production
2. **If timeout:** Investigate GPU memory, PHALP config, or streaming mode
3. **If error:** Fix based on error type and traceback
4. **If no [TRACK.PY]:** Debug track.py startup

## Important Notes

- All logging uses `flush=True` to ensure output is captured
- Logs are written to `/tmp/pose-service-logs/pose-service-*.log`
- Streaming mode is set with `cfg.video.extract_video = False`
- Timeout is 180 seconds (3 minutes)
- GPU memory should stay relatively constant with streaming mode

## Questions?

Refer to:
- **ENHANCED_LOGGING_FOR_DEBUGGING.md** - Detailed explanation
- **TEST_LOGGING_CHANGES.md** - Testing guide
- **NEXT_ACTIONS.md** - Action plan with outcomes

