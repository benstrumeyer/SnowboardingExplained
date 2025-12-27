# Issue Diagnosis and Fix Summary

## What Was Happening

You were seeing errors like:
```
ModuleNotFoundError: No module named 'cv2'
Error: write EOF at WriteWrap.onWriteComplete
stdin write failed: write EOF
```

When uploading videos with 31+ frames.

## Root Cause

**The Python pose service was not properly set up.**

The Python virtual environment didn't have the required dependencies installed, specifically `opencv-python` (cv2). When the backend tried to spawn Python processes for pose detection, they crashed immediately on startup because they couldn't import cv2.

This manifested as "write EOF" errors because:
1. Process spawns
2. Process tries to import cv2
3. Process crashes (ModuleNotFoundError)
4. stdin closes before wrapper can write data
5. Wrapper gets "write EOF" error

## Why It Looked Like a Process Pool Issue

When multiple frames were submitted:
- 31 requests hit the pool simultaneously
- Pool tried to spawn multiple processes
- Some processes crashed on startup
- Wrapper saw stdin write failures
- It looked like a concurrency/backpressure problem

But the real issue was simpler: **Python dependencies weren't installed**.

## The Fix

### Automatic Setup (Recommended)

**Windows:**
```powershell
cd SnowboardingExplained
.\setup-pose-service.ps1
```

**macOS/Linux:**
```bash
cd SnowboardingExplained
bash setup-pose-service.sh
```

### Manual Setup

```bash
cd SnowboardingExplained/pose-service

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# or
.\venv\Scripts\Activate.ps1  # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Download models
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"

# Verify
python -c "import cv2; import torch; print('✓ Success')"
```

## What Gets Installed

The setup installs all required Python packages:
- torch, torchvision (deep learning)
- opencv-python (cv2 - image processing)
- numpy, scipy, scikit-image (scientific computing)
- Pillow (image library)
- tqdm (progress bars)

And downloads the pose detection models (~600MB):
- HMR2 (3D pose estimation)
- ViTPose (2D keypoint detection)

## Verification

After setup, verify everything works:

```bash
# Check virtual environment
ls pose-service/venv/  # Should exist

# Check dependencies
pip list | grep opencv-python  # Should show opencv-python

# Check models
ls pose-service/.models/  # Should have hmr2 and vitpose directories

# Check imports
python -c "import cv2; import torch; print('✓ All good')"
```

## Testing

After setup, test the complete flow:

```bash
# Terminal 1: Run backend
cd SnowboardingExplained/backend
npm run dev

# Terminal 2: Upload a video
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

**Expected success:**
```
[UPLOAD] Submitting 31 frames to process pool
[UPLOAD] Successfully processed 31/31 frames with pose data
Pose detection completed
```

**Should NOT see:**
```
ModuleNotFoundError: No module named 'cv2'
Error: write EOF
stdin write failed
```

## Files Created

To help with setup and understanding:

1. **PYTHON_SETUP_GUIDE.md** - Detailed setup instructions
2. **PYTHON_ENVIRONMENT_ISSUE.md** - Complete explanation of the issue
3. **setup-pose-service.ps1** - Automatic setup script (Windows)
4. **setup-pose-service.sh** - Automatic setup script (macOS/Linux)
5. **STDIN_EOF_FIX.md** - Technical details of the wrapper improvements
6. **PROCESS_POOL_ARCHITECTURE.md** - Architecture documentation
7. **TEST_PROCESS_POOL.md** - Testing guide

## Previous Improvements (Still Valid)

The process pool improvements from earlier are still in place and working:
- ✓ 50ms spawn interval backpressure
- ✓ Robust stdin error tracking
- ✓ Improved Python error handling
- ✓ One frame per process architecture

These improvements help prevent issues when the Python environment is properly set up.

## Next Steps

1. **Run the setup script** (fastest way)
   - Windows: `.\setup-pose-service.ps1`
   - macOS/Linux: `bash setup-pose-service.sh`

2. **Verify setup** with the checklist above

3. **Run the backend** and test with a video upload

4. **Monitor logs** for successful processing

## Why This Wasn't Obvious

The error message "write EOF" is a symptom of the Python process crashing, not the root cause. The actual issue (missing cv2) was hidden in the Python stderr output. The setup scripts and documentation now make this clear.

## Key Takeaway

**Always ensure Python dependencies are installed in a virtual environment before running the backend.**

The process pool architecture is working correctly - it just needs the Python environment to be properly set up first.
