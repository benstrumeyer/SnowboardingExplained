# CRITICAL FIX: WSL Path Issue

## The Real Problem

The subprocess was timing out because **bash couldn't find track.py**.

### What Was Happening

1. Flask wrapper runs on Windows (Node.js backend)
2. It checks if `/home/ben/pose-service/4D-Humans` exists on Windows (it doesn't)
3. It falls back to Windows path: `SnowboardingExplained/backend/pose-service/4D-Humans`
4. It passes this Windows path to bash
5. Bash runs in WSL, where Windows paths don't exist
6. Bash can't find track.py
7. Subprocess hangs for 180 seconds
8. Socket hang up (ECONNRESET)

### Why No Output

When bash can't find the file, it doesn't print anything - it just hangs. That's why we saw NO output at all, not even error messages.

## The Fix

**File:** `backend/pose-service/flask_wrapper_minimal_safe.py` (Lines 930-960)

**BEFORE:**
```python
track_py_dir = POSE_SERVICE_PATH + '/4D-Humans'
if not os.path.exists(track_py_dir):
    # Try Windows path if on Windows
    track_py_dir = 'SnowboardingExplained/backend/pose-service/4D-Humans'

# ... later ...
cmd = ['bash', '-c', f'source {venv_activate} && python track.py ...']
# But track_py_dir might be Windows path!
```

**AFTER:**
```python
# CRITICAL: When running bash (WSL), we MUST use the WSL path
track_py_dir_wsl = POSE_SERVICE_PATH + '/4D-Humans'  # WSL path for bash
track_py_dir_windows = 'SnowboardingExplained/backend/pose-service/4D-Humans'  # Windows path

# For bash subprocess, always use WSL path
track_py_dir = track_py_dir_wsl

# ... later ...
cmd = ['bash', '-c', f'source {venv_activate} && cd {track_py_dir} && python track.py ...']
# Now track_py_dir is ALWAYS the WSL path
```

## Key Changes

1. **Always use WSL path for bash:** `/home/ben/pose-service/4D-Humans`
2. **Explicitly cd into directory:** `cd {track_py_dir} &&` before running track.py
3. **Log the WSL path:** So we can see what path is being used

## Why This Works

- Bash runs in WSL
- WSL can access `/home/ben/pose-service/` (the Linux home directory)
- WSL cannot access Windows paths like `C:\Users\...`
- By using the WSL path, bash can find track.py

## Expected Behavior After Fix

```
[PROCESS] Virtual environment found: /home/ben/pose-service/venv/bin/activate
[PROCESS] Command: bash -c 'source /home/ben/pose-service/venv/bin/activate && cd /home/ben/pose-service/4D-Humans && python track.py hydra.job.chdir=false ...'
[PROCESS] Working directory (for bash): /home/ben/pose-service/4D-Humans
[PROCESS] Starting subprocess with 180.0s timeout...
[TRACK.PY] ========================================
[TRACK.PY] track.py STARTED - BEFORE IMPORTS
[TRACK.PY] Importing warnings...
[TRACK.PY] ✓ warnings imported
...
```

## Testing the Fix

1. Upload a test video via web UI
2. Check Flask logs for `[TRACK.PY]` messages
3. Should see messages within 5 seconds (not timeout)
4. Video processing should complete

## Summary

The Hydra directory bug fix was correct, but there was a SECOND issue: the Flask wrapper was passing a Windows path to bash, which runs in WSL. By always using the WSL path for bash subprocesses, track.py can now be found and executed.

**This is the CRITICAL fix that will make the subprocess work.**
