# Logging Changes Summary

## What Was Done

Added comprehensive logging to diagnose why the Flask subprocess is crashing with "socket hang up" (ECONNRESET) after ~46 seconds.

## Files Modified

### 1. `SnowboardingExplained/backend/pose-service/flask_wrapper_minimal_safe.py`

**Changes:**
- Enhanced subprocess logging to show exact command, working directory, and timeout
- Added full stdout/stderr logging (not truncated)
- Improved timeout exception handler with diagnostic messages
- Added logging for subprocess completion with elapsed time

**Key additions:**
```python
logger.info(f"[PROCESS] About to call subprocess.run with:")
logger.info(f"[PROCESS]   cmd: {cmd}")
logger.info(f"[PROCESS]   cwd: {track_py_dir}")
logger.info(f"[PROCESS]   timeout: {timeout_seconds}s")

# After subprocess completes:
logger.info(f"[PROCESS] ===== STDOUT START =====")
logger.info(result.stdout)
logger.info(f"[PROCESS] ===== STDOUT END =====")
```

### 2. `SnowboardingExplained/backend/pose-service/4D-Humans/track.py`

**Changes:**
- Added module-level logging when track.py starts
- Added logging to HMR2Predictor initialization
- Added logging to HMR2_4dhuman initialization and setup_hmr()
- Added comprehensive logging to main() function with try/except

**Key additions:**
```python
# Module level
print("[TRACK.PY] track.py started", flush=True)
print(f"[TRACK.PY] Python version: {sys.version}", flush=True)

# In main()
print("[TRACK.PY] Setting cfg.video.extract_video = False", flush=True)
print("[TRACK.PY] Starting PHALP tracking...", flush=True)
start_time = time.time()
phalp_tracker.track()
elapsed = time.time() - start_time
print(f"[TRACK.PY] ✓ Tracking completed in {elapsed:.1f}s", flush=True)
```

## Why This Helps

1. **Identifies where the crash happens:**
   - If we see `[TRACK.PY] main() called` but not `[TRACK.PY] ✓ Streaming mode enabled`, the crash is in config setup
   - If we see `[TRACK.PY] Starting PHALP tracking...` but not `[TRACK.PY] ✓ Tracking completed`, the crash is in PHALP tracking

2. **Captures full output:**
   - Previously, stderr/stdout were truncated to 1000 chars
   - Now we capture the full output to see complete error messages

3. **Measures elapsed time:**
   - Helps identify if the process is hanging or just slow
   - Shows how long each stage takes

4. **Uses flush=True:**
   - Ensures output is captured even if the process crashes
   - Prevents buffering from hiding output

## How to Use

### Step 1: Restart Flask
```bash
pkill -f flask_wrapper_minimal_safe.py
cd /home/ben/pose-service
python flask_wrapper_minimal_safe.py
```

### Step 2: Monitor Logs
```bash
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
```

### Step 3: Upload a Test Video
- Use the web UI to upload a video
- Watch the logs in real-time

### Step 4: Analyze Output

**Expected success output:**
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

**Expected timeout output:**
```
[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗
[PROCESS] Timeout after 46.0s (limit: 180.0s)
[PROCESS] This likely means track.py is hanging or taking too long
```

## What to Look For

### Success Indicators
- ✅ `[TRACK.PY] track.py started`
- ✅ `[TRACK.PY] main() called`
- ✅ `[TRACK.PY] ✓ Streaming mode enabled`
- ✅ `[TRACK.PY] ✓ Tracker created`
- ✅ `[TRACK.PY] ✓ Tracking completed in X.Xs`
- ✅ `[PROCESS] Exit code: 0`

### Failure Indicators
- ❌ `[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗` - Process is hanging
- ❌ `[TRACK.PY] ✗✗✗ ERROR IN main()` - Python error in track.py
- ❌ `[PROCESS] Exit code: 1` - Subprocess failed
- ❌ No `[TRACK.PY]` messages at all - track.py didn't start

## Next Steps

1. **Run a test upload** with the enhanced logging
2. **Capture the logs** to see where the process hangs
3. **Analyze the output** to identify the root cause
4. **Fix the issue** based on what the logs reveal

## Common Issues and Solutions

### Issue: Timeout after ~46 seconds
**Likely cause:** GPU memory exhaustion or PHALP hanging
**Solution:** Check GPU memory with `nvidia-smi`, verify streaming mode is enabled

### Issue: No [TRACK.PY] messages
**Likely cause:** track.py didn't start or crashed immediately
**Solution:** Check if Python can import required modules, check working directory

### Issue: Error in HMR2Predictor initialization
**Likely cause:** Model download or loading failed
**Solution:** Check internet connection, check disk space, check CUDA availability

### Issue: Error in PHALP tracking
**Likely cause:** Video format issue, PHALP configuration issue
**Solution:** Check video file format, check PHALP config, check video file exists

## Files Created

1. `SnowboardingExplained/ENHANCED_LOGGING_FOR_DEBUGGING.md` - Detailed explanation of logging changes
2. `SnowboardingExplained/TEST_LOGGING_CHANGES.md` - Step-by-step testing guide
3. `SnowboardingExplained/LOGGING_CHANGES_SUMMARY.md` - This file

