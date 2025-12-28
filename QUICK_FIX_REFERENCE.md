# Quick Fix Reference Card

## The Problem
Subprocess crashes with "socket hang up" after ~46 seconds

## The Root Cause
Virtual environment not activated before running track.py

## The Fix
Flask wrapper now activates venv before subprocess call

## File Changed
`backend/pose-service/flask_wrapper_minimal_safe.py` (lines ~930-945)

## What Changed
```python
# BEFORE (Broken)
cmd = ['python', 'track.py', f'video.source={video_path}']

# AFTER (Fixed)
venv_activate = os.path.expanduser('~/pose-service/venv/bin/activate')
if os.path.exists(venv_activate):
    cmd = ['bash', '-c', f'source {venv_activate} && python track.py video.source={video_path}']
else:
    cmd = ['python', 'track.py', f'video.source={video_path}']
```

## Test It (5 minutes)

### Terminal 1: Start Flask
```bash
cd ~/pose-service
source venv/bin/activate
python flask_wrapper_minimal_safe.py
```

### Terminal 2: Monitor Logs
```bash
tail -f /tmp/pose-service-logs/pose-service-*.log | grep -E "\[PROCESS\]|\[TRACK.PY\]"
```

### Terminal 3: Upload Video
- Go to http://localhost:3000
- Upload test video
- Watch Terminal 2

## Success Indicators
✅ `[TRACK.PY]` messages appear
✅ `[TRACK.PY] ✓ PyTorch` appears
✅ `[TRACK.PY] ✓ Tracking completed` appears
✅ `[PROCESS] Exit code: 0` appears

## Failure Indicators
❌ No `[TRACK.PY]` messages
❌ `[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT`
❌ `[TRACK.PY] ✗ PyTorch failed`

## Diagnostic Commands
```bash
# Check venv exists
ls -la ~/pose-service/venv/bin/activate

# Test venv activation
source ~/pose-service/venv/bin/activate
python -c "import torch; print(torch.__version__)"

# Test track.py startup
cd ~/pose-service/4D-Humans
python test_startup.py

# Check Flask logs
tail -f /tmp/pose-service-logs/pose-service-*.log
```

## Documentation
- `ROOT_CAUSE_FOUND_AND_FIXED.md` - Full analysis
- `TEST_THE_FIX.md` - Detailed testing guide
- `DEBUGGING_SESSION_COMPLETE.md` - Complete session summary

---

**Status:** FIXED ✅ Ready to test!
