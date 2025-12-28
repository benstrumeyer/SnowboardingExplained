# Next Actions - Debugging Subprocess Crash

## Current Status

✅ **Streaming mode fix applied** - `cfg.video.extract_video = False` is set in track.py
✅ **Enhanced logging added** - Both Flask wrapper and track.py now have comprehensive logging
❌ **Root cause unknown** - Subprocess still crashes with "socket hang up" after ~46 seconds

## Immediate Next Steps

### 1. Restart Flask Wrapper (5 minutes)
```bash
# In WSL terminal
pkill -f flask_wrapper_minimal_safe.py
cd /home/ben/pose-service
python flask_wrapper_minimal_safe.py
```

### 2. Monitor Logs (ongoing)
```bash
# In another WSL terminal
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
```

### 3. Upload Test Video (5-10 minutes)
- Go to web UI
- Upload a small test video (50-100MB)
- Watch logs in real-time
- Let it run until completion or timeout

### 4. Analyze Logs (10-15 minutes)
Look for:
- Where does `[TRACK.PY]` logging start?
- Where does it stop?
- Is there an error message?
- How long does each stage take?

## Expected Outcomes and Next Steps

### Outcome A: Process Completes Successfully ✅
**Logs show:**
```
[TRACK.PY] ✓ Tracking completed in 45.2s
[PROCESS] Exit code: 0
```

**Next steps:**
1. Verify mesh data is returned correctly
2. Check if data format matches expectations
3. Test with larger videos
4. Move to production testing

### Outcome B: Process Times Out ⏱️
**Logs show:**
```
[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗
[PROCESS] Timeout after 46.0s (limit: 180.0s)
```

**Next steps:**
1. Check GPU memory: `nvidia-smi`
   - If GPU memory is maxed out → GPU OOM issue
   - If GPU memory is low → Something else is hanging
2. Check if `[TRACK.PY] ✓ Streaming mode enabled` appears
   - If yes → Streaming mode is set but not working
   - If no → Streaming mode isn't being set
3. Check PHALP logs: `ls -la /tmp/phalp_output/`
4. Consider:
   - Reducing video resolution
   - Reducing frame rate
   - Increasing timeout
   - Checking PHALP configuration

### Outcome C: Python Error ❌
**Logs show:**
```
[TRACK.PY] ✗✗✗ ERROR IN main() ✗✗✗
[TRACK.PY] Error type: RuntimeError
[TRACK.PY] Error message: CUDA out of memory
```

**Next steps:**
1. Identify the error type
2. Look for the full traceback in logs
3. Fix based on error:
   - CUDA OOM → Reduce batch size, enable streaming mode
   - ImportError → Install missing module
   - FileNotFoundError → Check video path
   - Other → Debug based on error message

### Outcome D: track.py Doesn't Start ❌
**Logs show:**
```
[PROCESS] About to call subprocess.run with:
[PROCESS]   cmd: ['python', 'track.py', 'video.source=/tmp/pose-videos/v_*.mov']
[PROCESS] Starting subprocess with 180.0s timeout...
[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗
```

No `[TRACK.PY]` messages at all.

**Next steps:**
1. Check if Python can run track.py manually:
   ```bash
   cd /home/ben/pose-service/4D-Humans
   python track.py video.source=/tmp/test.mov
   ```
2. Check if all imports work:
   ```bash
   python -c "from phalp.trackers.PHALP import PHALP; print('OK')"
   ```
3. Check working directory and permissions
4. Check if video file exists

## Diagnostic Commands

### Check GPU Memory
```bash
nvidia-smi
watch -n 1 nvidia-smi  # Real-time monitoring
```

### Check PHALP Logs
```bash
ls -la /tmp/phalp_output/
tail -f /tmp/phalp_output/*.log
```

### Check Flask Logs
```bash
tail -f /tmp/pose-service-logs/pose-service-*.log
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
```

### Test track.py Manually
```bash
cd /home/ben/pose-service/4D-Humans
python track.py video.source=/tmp/test.mov
```

### Check Python Imports
```bash
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "from phalp.trackers.PHALP import PHALP; print('PHALP OK')"
python -c "from hmr2.models import load_hmr2; print('HMR2 OK')"
```

## Timeline

- **Now:** Restart Flask and upload test video
- **5-10 min:** Collect logs
- **10-15 min:** Analyze logs and identify issue
- **15-30 min:** Implement fix based on issue
- **30-45 min:** Test fix with another upload
- **45+ min:** Iterate if needed

## Success Criteria

✅ Process completes without timeout
✅ Exit code is 0
✅ Mesh data is returned to Node.js
✅ Web UI receives and displays data correctly
✅ Works with videos of various sizes (50MB, 200MB, 500MB+)

## If Stuck

1. **Check the logs first** - They should tell you exactly what's happening
2. **Look for [TRACK.PY] messages** - They show the execution flow
3. **Check GPU memory** - Most common issue is GPU OOM
4. **Verify streaming mode** - Look for `✓ Streaming mode enabled`
5. **Check file paths** - Make sure video file exists at the path shown

## Questions to Answer

1. Does `[TRACK.PY] track.py started` appear in logs?
2. Does `[TRACK.PY] ✓ Streaming mode enabled` appear?
3. Does `[TRACK.PY] Starting PHALP tracking...` appear?
4. Does `[TRACK.PY] ✓ Tracking completed` appear?
5. What is the exit code?
6. Is there an error message?
7. How long does it take?
8. What is GPU memory usage?

## Ready to Start?

1. Open two WSL terminals
2. In terminal 1: Restart Flask
3. In terminal 2: Monitor logs
4. Upload test video
5. Watch logs and collect data
6. Report findings

