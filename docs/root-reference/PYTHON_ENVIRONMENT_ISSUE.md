# Python Environment Issue - Complete Explanation

## The Problem

You're seeing this error:
```
ModuleNotFoundError: No module named 'cv2'
```

Which manifests as:
```
Error: write EOF at WriteWrap.onWriteComplete
stdin write failed: write EOF
```

## Why This Happens

### The Real Issue
The Python pose service process is **crashing on startup** because it can't import required dependencies (specifically `cv2` - OpenCV).

### The Chain of Events
1. Backend spawns Python process via `PoseServiceExecWrapper`
2. Python process starts and tries to import modules
3. Python tries: `import cv2` (from `pose_detector.py`)
4. Python fails: `ModuleNotFoundError: No module named 'cv2'`
5. Python process crashes immediately
6. stdin closes before wrapper can write frame data
7. Wrapper gets "write EOF" error
8. Request fails

### Why It Looks Like a Process Pool Issue
The error happens when:
- Multiple frames are submitted (31 frames)
- Multiple processes spawn rapidly
- Some processes crash on startup
- Wrapper sees stdin write failures

This looks like a concurrency/backpressure issue, but it's actually a **Python environment setup issue**.

## The Solution

### Quick Fix (Windows)
```powershell
cd SnowboardingExplained
.\setup-pose-service.ps1
```

### Quick Fix (macOS/Linux)
```bash
cd SnowboardingExplained
bash setup-pose-service.sh
```

### Manual Setup

**Step 1: Create virtual environment**
```bash
cd SnowboardingExplained/pose-service
python -m venv venv  # or python3 on macOS/Linux
```

**Step 2: Activate virtual environment**
```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# macOS/Linux
source venv/bin/activate
```

**Step 3: Install dependencies**
```bash
pip install -r requirements.txt
```

**Step 4: Download models**
```bash
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

**Step 5: Verify**
```bash
python -c "import cv2; import torch; print('✓ Success')"
```

## What Gets Installed

The `requirements.txt` installs:
- **torch** (2.0.1) - Deep learning framework
- **torchvision** (0.15.2) - Computer vision utilities
- **opencv-python** (4.8.0.74) - Image processing (cv2)
- **numpy** (1.24.3) - Numerical computing
- **Pillow** (10.0.0) - Image library
- **scipy** (1.11.2) - Scientific computing
- **scikit-image** (0.21.0) - Image processing
- **tqdm** (4.66.1) - Progress bars

## Why Virtual Environment?

A virtual environment isolates Python packages for this project:
- Prevents conflicts with system Python
- Allows different versions for different projects
- Makes deployment reproducible
- Keeps system Python clean

## Verification Checklist

Before running the backend, verify:

```bash
# 1. Virtual environment exists
ls pose-service/venv/  # or dir pose-service\venv\ on Windows

# 2. Virtual environment is activated (should see (venv) in prompt)
which python  # or where python on Windows

# 3. Dependencies are installed
pip list | grep opencv-python

# 4. Models are downloaded
ls pose-service/.models/  # or dir pose-service\.models\ on Windows

# 5. Imports work
python -c "import cv2; import torch; print('✓ All good')"
```

## Common Issues

### Issue: "No module named 'cv2'"
**Cause:** Virtual environment not activated or dependencies not installed
**Fix:** 
```bash
cd pose-service
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
```

### Issue: "No module named 'torch'"
**Cause:** Same as above
**Fix:** Same as above

### Issue: "ModuleNotFoundError" for other modules
**Cause:** Incomplete installation
**Fix:** Reinstall all requirements
```bash
pip install --force-reinstall -r requirements.txt
```

### Issue: Models not found
**Cause:** Models not downloaded
**Fix:** Download manually
```bash
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

### Issue: "CUDA out of memory"
**Cause:** GPU doesn't have enough memory for 2 concurrent processes
**Fix:** Reduce concurrent processes in `posePoolConfig.ts`
```typescript
maxConcurrentProcesses: 1  // Instead of 2
```

## How to Verify It's Fixed

After setup, test with:

```bash
# Terminal 1: Run backend
cd SnowboardingExplained/backend
npm run dev

# Terminal 2: Upload a video
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

**Success indicators in logs:**
```
[UPLOAD] Submitting 31 frames to process pool
[UPLOAD] Successfully processed 31/31 frames with pose data
Pose detection completed
```

**Error indicators (should NOT see):**
```
ModuleNotFoundError: No module named 'cv2'
Error: write EOF
stdin write failed
```

## Architecture Context

The process pool architecture is actually working correctly:
- ✓ Backpressure (50ms spawn interval) prevents OS buffer overflow
- ✓ Error tracking catches stdin write failures
- ✓ Pool queuing limits concurrent processes
- ✓ One frame per process ensures isolation

The "write EOF" errors were just a symptom of Python processes crashing on startup due to missing dependencies.

## Next Steps

1. Run the setup script (PowerShell or Bash)
2. Verify all checklist items pass
3. Run the backend: `npm run dev`
4. Test with a video upload
5. Monitor logs for successful processing

## Support

If you still have issues after setup:
1. Check that `(venv)` appears in your prompt
2. Verify `pip list` shows opencv-python
3. Check that `.models/` directory exists
4. Look at backend logs for specific error messages
5. Ensure Python version is 3.8+

The setup script handles all of this automatically, so running it is the fastest way to get everything working.
