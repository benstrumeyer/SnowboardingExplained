# Enhanced Logging for Subprocess Crash Debugging

## Problem
The Flask subprocess is crashing with "socket hang up" (ECONNRESET) after ~46 seconds. The streaming mode fix is in place, but we need to see what's actually happening inside track.py.

## Solution
Added comprehensive logging to both Flask wrapper and track.py to capture:

### Flask Wrapper Changes (`flask_wrapper_minimal_safe.py`)

1. **Pre-subprocess logging:**
   - Logs the exact command being run
   - Logs the working directory
   - Logs the timeout value
   - Logs all subprocess.run() parameters

2. **Post-subprocess logging:**
   - Logs the exit code
   - Logs stdout and stderr lengths
   - **Logs FULL stdout and stderr** (not truncated)
   - Logs elapsed time

3. **Timeout exception handler:**
   - Logs timeout with elapsed time
   - Logs partial output if available
   - Provides helpful diagnostic message

### track.py Changes

1. **Module initialization:**
   - Logs when track.py starts
   - Logs Python version and working directory
   - Logs sys.path[0]

2. **Class initialization:**
   - HMR2Predictor: Logs model loading steps
   - HMR2_4dhuman: Logs tracker initialization
   - setup_hmr(): Logs HMR2023TextureSampler creation

3. **Main function:**
   - Logs when main() is called
   - Logs config
   - Logs streaming mode enablement
   - Logs tracker creation
   - Logs tracking start/completion with elapsed time
   - Logs any exceptions with full traceback

4. **All logging uses:**
   - `flush=True` to ensure output is captured
   - `sys.stdout.flush()` and `sys.stderr.flush()` after each log
   - Consistent `[TRACK.PY]` prefix for easy filtering

## How to Use

1. **Restart Flask wrapper:**
   ```bash
   pkill -f flask_wrapper_minimal_safe.py
   cd /home/ben/pose-service
   python flask_wrapper_minimal_safe.py
   ```

2. **Upload a test video** through the web UI

3. **Check Flask logs:**
   ```bash
   tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
   ```

4. **Look for:**
   - `[TRACK.PY] main() called` - confirms track.py started
   - `[TRACK.PY] Setting cfg.video.extract_video = False` - confirms streaming mode
   - `[TRACK.PY] Creating HMR2_4dhuman tracker...` - tracker initialization
   - `[TRACK.PY] Starting PHALP tracking...` - tracking started
   - `[TRACK.PY] ✓ Tracking completed` - tracking finished
   - `[TRACK.PY] ✗✗✗ ERROR IN main()` - if there's an error

## Expected Output

When everything works:
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['python', 'track.py', 'video.source=/tmp/pose-videos/v_*.mov']
[PROCESS]   cwd: /home/ben/pose-service/4D-Humans
[PROCESS]   timeout: 180.0s
[PROCESS]   capture_output: True
[PROCESS]   text: True
[TRACK.PY] ========================================
[TRACK.PY] track.py started
[TRACK.PY] main() called
[TRACK.PY] Setting cfg.video.extract_video = False
[TRACK.PY] ✓ Streaming mode enabled
[TRACK.PY] Creating HMR2_4dhuman tracker...
[TRACK.PY] HMR2_4dhuman.__init__() called
[TRACK.PY] setup_hmr() called
[TRACK.PY] Loading HMR2 models...
[TRACK.PY] Downloading HMR2 models...
[TRACK.PY] ✓ Models downloaded
[TRACK.PY] Loading HMR2 checkpoint...
[TRACK.PY] ✓ HMR2 checkpoint loaded
[TRACK.PY] ✓ HMR2023TextureSampler created
[TRACK.PY] ✓ HMR2_4dhuman initialized
[TRACK.PY] ✓ Tracker created
[TRACK.PY] Starting PHALP tracking...
[TRACK.PY] ✓ Tracking completed in 45.2s
[PROCESS] ✓ Subprocess completed in 45.2s - job_id: ...
[PROCESS] Exit code: 0
[PROCESS] ===== STDOUT START =====
... (full output)
[PROCESS] ===== STDOUT END =====
```

## If Subprocess Times Out

If you see:
```
[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗
[PROCESS] Timeout after 46.0s (limit: 180.0s)
```

This means track.py is hanging. Check:
1. GPU memory with `nvidia-smi`
2. PHALP logs in `/tmp/phalp_output/`
3. Whether streaming mode is actually being used

## Next Steps

1. Run a test upload and capture the logs
2. Look for where the process hangs
3. If it's in model loading, check GPU memory
4. If it's in tracking, check PHALP configuration
5. If it's in output parsing, check pickle file format

