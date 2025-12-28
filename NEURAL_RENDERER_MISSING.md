# Neural Renderer Missing - Fix Required

## Problem

Track.py execution failed with:
```
ModuleNotFoundError: No module named 'neural_renderer'
```

## Root Cause

The `neural_renderer` module is required by HMR2 for mesh rendering but is not installed in the venv.

## Error Stack

```
File "/mnt/c/Users/benja/repos/SnowboardingExplained/backend/pose-service/4D-Humans/track.py", line 147, in __init__
    import neural_renderer as nr
ModuleNotFoundError: No module named 'neural_renderer'
```

## Solution

Install the missing module in the WSL venv:

```bash
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && pip install neural-renderer-pytorch"
```

Or if that doesn't work, try:

```bash
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && pip install neural_renderer"
```

## What Worked

✓ Flask wrapper running on port 5000
✓ Video uploaded successfully (0.2 MB)
✓ Path conversion working (Windows → WSL)
✓ track.py started and loaded all models
✓ HMR2 checkpoint loaded successfully
✓ Streaming mode enabled

## What Failed

✗ HMR2 mesh rendering setup (needs neural_renderer)

## Next Steps

1. Install neural_renderer in WSL venv
2. Test again with the same video
3. Should complete successfully

## Test Command

```powershell
& "C:\Users\benja\repos\SnowboardingExplained\test-direct-upload.ps1"
```

This will upload the video and run track.py with the neural_renderer module installed.
