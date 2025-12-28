# Test the Fix - Quick Start

## The Fix

The Flask wrapper now activates the virtual environment before running track.py. This ensures all required packages (torch, phalp, hmr2, etc.) are available.

## Quick Test (5 minutes)

### Terminal 1: Start Flask Wrapper

```bash
cd ~/pose-service
source venv/bin/activate
python flask_wrapper_minimal_safe.py
```

Expected output:
```
[KIRO-DEBUG] FILE LOADED - VERSION 2024-12-27-v2 (ViTDet)
[PATCH] torch.serialization patched...
[INIT] Initializing models...
[INIT] ✓ Models initialized
 * Running on http://127.0.0.1:5000
```

### Terminal 2: Monitor Logs

```bash
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
```

### Terminal 3: Upload Test Video

1. Go to http://localhost:3000
2. Upload a small test video (50-100MB)
3. Watch Terminal 2 for logs

## Expected Log Output

### Success Path (What You Should See)

```
[PROCESS] Starting video processing - job_id: abc123...
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['bash', '-c', 'source /home/ben/pose-service/venv/bin/activate && python track.py ...']
[PROCESS] Starting subprocess with 180.0s timeout...
[TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Python version: 3.12.3
[TRACK.PY] ✓ PyTorch 2.5.1+cu121
[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL
[TRACK.PY] main() called
[TRACK.PY] ✓ Streaming mode enabled
[TRACK.PY] Creating HMR2_4dhuman tracker...
[TRACK.PY] ✓ Tracker created
[TRACK.PY] Starting PHALP tracking...
[TRACK.PY] ✓ Tracking completed in 45.2s
[PROCESS] ✓ Subprocess completed in 45.2s
[PROCESS] Exit code: 0
[PROCESS] Found output .pkl: /home/ben/pose-service/4D-Humans/outputs/...
[PROCESS] Parsing .pkl output to JSON
[PROCESS] Parsing completed in 2.3s
[PROCESS] Total frames: 1350
[PROCESS] Processing complete - job_id: abc123..., total_time: 47.5s, frames: 1350
```

### Failure Path (What NOT to See)

❌ `[TRACK.PY]` messages don't appear
❌ `[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT`
❌ `[TRACK.PY] ✗✗✗ IMPORT ERROR`
❌ `[TRACK.PY] ✗ PyTorch failed: No module named 'torch'`

## Diagnostic Commands

### Check if venv is set up correctly

```bash
ls -la ~/pose-service/venv/bin/activate
```

Should show:
```
-rw-r--r-- 1 ben ben 2234 Dec 27 11:28 /home/ben/pose-service/venv/bin/activate
```

### Test venv activation manually

```bash
source ~/pose-service/venv/bin/activate
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
```

Should show:
```
PyTorch: 2.5.1+cu121
```

### Test track.py startup

```bash
cd ~/pose-service/4D-Humans
source ~/pose-service/venv/bin/activate
python test_startup.py
```

Should show:
```
[TEST] ✓ PyTorch 2.5.1+cu121
[TEST] ✓ CUDA available: True
[TEST] ✓ ALL TESTS PASSED
```

### Check Flask logs

```bash
# Full logs
tail -f /tmp/pose-service-logs/pose-service-*.log

# Filtered logs (process and track.py only)
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"

# Last 50 lines
tail -50 /tmp/pose-service-logs/pose-service-*.log
```

## Troubleshooting

### If you see: `[TRACK.PY] ✗ PyTorch failed: No module named 'torch'`

**Problem:** venv is not being activated

**Solution:**
1. Check if venv exists: `ls -la ~/pose-service/venv/bin/activate`
2. Verify Flask wrapper has the fix: `grep -A5 "venv_activate" ~/pose-service/flask_wrapper_minimal_safe.py`
3. Restart Flask wrapper

### If you see: `[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT`

**Problem:** Process is hanging or taking too long

**Solution:**
1. Check GPU memory: `nvidia-smi`
2. Check if streaming mode is enabled: Look for `✓ Streaming mode enabled`
3. Check PHALP logs: `tail -f /tmp/phalp_output/*.log`
4. Try with a smaller video

### If you see: `[PROCESS] Exit code: 1`

**Problem:** track.py exited with error

**Solution:**
1. Check stderr in logs: Look for `[PROCESS] ===== STDERR START =====`
2. Look for error message in stderr
3. Check if all imports are available: `python test_startup.py`

## Success Criteria

✅ `[TRACK.PY]` messages appear in logs
✅ `[TRACK.PY] ✓ PyTorch` message appears
✅ `[TRACK.PY] ✓ ALL IMPORTS SUCCESSFUL` message appears
✅ `[TRACK.PY] ✓ Streaming mode enabled` message appears
✅ `[TRACK.PY] ✓ Tracking completed` message appears
✅ `[PROCESS] Exit code: 0` message appears
✅ Web UI receives mesh data and displays it

## Timeline

- **0-2 min:** Start Flask wrapper
- **2-3 min:** Start monitoring logs
- **3-5 min:** Upload test video
- **5-10 min:** Watch logs and verify success

## Next Steps After Success

1. Test with larger videos (200MB, 500MB+)
2. Test with different video formats
3. Verify mesh data quality
4. Move to production

---

**Ready to test?** Start with Terminal 1 above!
