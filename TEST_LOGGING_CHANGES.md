# Testing the Enhanced Logging

## Quick Start

### 1. Restart Flask Wrapper (in WSL)
```bash
# Kill existing Flask process
pkill -f flask_wrapper_minimal_safe.py

# Start Flask again
cd /home/ben/pose-service
python flask_wrapper_minimal_safe.py
```

### 2. Monitor Logs in Real-Time
```bash
# In a separate terminal, watch the logs
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
```

### 3. Upload a Test Video
- Go to your web UI
- Upload a video (start with a small one, ~50MB)
- Watch the logs in real-time

### 4. What to Look For

**Success indicators:**
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
[TRACK.PY] ✓ Tracking completed in X.Xs
[PROCESS] ✓ Subprocess completed in X.Xs
[PROCESS] Exit code: 0
```

**Failure indicators:**
```
[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗
[PROCESS] Timeout after 46.0s (limit: 180.0s)
```

This means track.py is hanging somewhere.

**Error indicators:**
```
[TRACK.PY] ✗✗✗ ERROR IN main() ✗✗✗
[TRACK.PY] Error type: RuntimeError
[TRACK.PY] Error message: CUDA out of memory
```

## Debugging Steps

### If subprocess times out:

1. **Check GPU memory:**
   ```bash
   watch -n 1 nvidia-smi
   ```
   - Look for GPU memory usage
   - If it's maxed out, that's the problem

2. **Check PHALP logs:**
   ```bash
   ls -la /tmp/phalp_output/
   tail -f /tmp/phalp_output/*.log
   ```

3. **Check if streaming mode is working:**
   - Look for `[TRACK.PY] ✓ Streaming mode enabled` in logs
   - If you don't see this, streaming mode isn't being set

### If there's a Python error:

1. **Look for the full traceback:**
   ```bash
   tail -f /tmp/pose-service-logs/pose-service-*.log | grep -A 20 "Traceback"
   ```

2. **Common errors:**
   - `CUDA out of memory` - GPU memory issue
   - `FileNotFoundError` - Video file not found
   - `ImportError` - Missing Python module
   - `RuntimeError` - PHALP or HMR2 error

### If subprocess completes but returns error:

1. **Check the full stderr:**
   ```bash
   tail -f /tmp/pose-service-logs/pose-service-*.log | grep -A 50 "STDERR START"
   ```

2. **Check the full stdout:**
   ```bash
   tail -f /tmp/pose-service-logs/pose-service-*.log | grep -A 50 "STDOUT START"
   ```

## Expected Behavior

### Small video (50MB, 30 FPS, 50 seconds):
- Should complete in ~60-90 seconds
- GPU memory should stay relatively constant
- Should see all `[TRACK.PY]` log messages

### Large video (200MB, 60 FPS, 100 seconds):
- Should complete in ~120-180 seconds
- GPU memory should stay relatively constant
- Should see all `[TRACK.PY]` log messages

### Very large video (500MB+):
- May take 3-5 minutes
- GPU memory should stay relatively constant
- Should NOT crash with CUDA OOM

## Troubleshooting Checklist

- [ ] Flask wrapper restarted
- [ ] Logs are being written to `/tmp/pose-service-logs/`
- [ ] Video file exists at the path shown in logs
- [ ] GPU has available memory (`nvidia-smi`)
- [ ] `[TRACK.PY] ✓ Streaming mode enabled` appears in logs
- [ ] `[TRACK.PY] Starting PHALP tracking...` appears in logs
- [ ] Either `[TRACK.PY] ✓ Tracking completed` or timeout error appears

## Next Steps

Once you have the logs:

1. **If it completes successfully:**
   - Check if mesh data is being returned correctly
   - Verify the output format matches expectations

2. **If it times out:**
   - Check GPU memory usage during processing
   - Consider reducing video resolution or frame rate
   - Check if PHALP is actually using streaming mode

3. **If there's an error:**
   - Look at the full traceback
   - Check if it's a known issue
   - Consider the error type and context

