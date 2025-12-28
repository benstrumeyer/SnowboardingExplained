# Quick Fix Summary

## Two Critical Bugs Fixed

### 1. Hydra Argument Order Bug
**File:** `flask_wrapper_minimal_safe.py` Line 951
```bash
# BEFORE (WRONG):
python track.py video.source=... hydra.job.chdir=false ...

# AFTER (CORRECT):
python track.py hydra.job.chdir=false ... video.source=...
```

### 2. WSL Path Bug
**File:** `flask_wrapper_minimal_safe.py` Lines 930-960
```bash
# BEFORE (WRONG):
bash -c 'cd SnowboardingExplained/backend/pose-service/4D-Humans && python track.py ...'
# Path doesn't exist in WSL!

# AFTER (CORRECT):
bash -c 'cd /home/ben/pose-service/4D-Humans && python track.py ...'
# Path exists in WSL
```

## Why It Was Failing

1. Flask wrapper (Windows) passed Windows path to bash
2. Bash runs in WSL where Windows paths don't exist
3. Bash couldn't find track.py
4. Subprocess hung for 180 seconds with NO output
5. Socket hang up (ECONNRESET)

## The Fix

- Always use WSL path (`/home/ben/pose-service/4D-Humans`) for bash
- Explicitly cd into directory: `cd {track_py_dir} &&`
- Hydra args come BEFORE video.source

## Test It

Upload a test video and check logs for `[TRACK.PY]` messages within 5 seconds.

## Files Changed

1. `backend/pose-service/flask_wrapper_minimal_safe.py` (Lines 930-960, 951)
2. `backend/pose-service/4D-Humans/track.py` (Lines 1-80, already had enhanced logging)

## Status

✓ Both fixes applied
✓ Ready for testing
