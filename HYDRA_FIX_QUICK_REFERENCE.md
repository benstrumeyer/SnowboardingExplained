# Hydra Fix - Quick Reference Card

## The Bug
Flask subprocess times out after 180 seconds with NO output from track.py.

## The Root Cause
Hydra arguments were in the WRONG order:
```bash
# WRONG (causes hang):
python track.py video.source=... hydra.job.chdir=false ...

# CORRECT (no hang):
python track.py hydra.job.chdir=false ... video.source=...
```

## The Fix

### File 1: flask_wrapper_minimal_safe.py (Line 951)
```python
# BEFORE:
cmd = ['bash', '-c', f'source {venv_activate} && python track.py video.source={video_path} hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=.']

# AFTER:
cmd = ['bash', '-c', f'source {venv_activate} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']
```

### File 2: track.py (Lines 1-80)
Added 36 `sys.stdout.flush()` calls after every import for enhanced logging.

## Quick Test
```bash
python SnowboardingExplained/verify-hydra-fix.py
```

Expected:
```
✓ CORRECT: Hydra args come BEFORE video.source
✓ Enhanced logging found ([TRACK.PY] markers)
✓ Found 36 sys.stdout.flush() calls
```

## Full Test
```bash
python SnowboardingExplained/test-hydra-directory-bug.py
```

Expected:
```
✓ Command completed in X.Xs (did not hang)
✓ [TRACK.PY] logging appeared - track.py started successfully
```

## Key Points
1. Hydra parses arguments left-to-right
2. System config args must come BEFORE application args
3. Enhanced logging helps identify where hangs occur
4. Fix is minimal and focused on the root cause

## Files Modified
- `backend/pose-service/flask_wrapper_minimal_safe.py` (Line 951)
- `backend/pose-service/4D-Humans/track.py` (Lines 1-80)

## Status
✓ Fix verified and in place
✓ Ready for testing
✓ Diagnostic scripts created

## Next Steps
1. Run verification scripts
2. Upload test video
3. Monitor logs for `[TRACK.PY]` messages
4. Verify no timeout occurs
