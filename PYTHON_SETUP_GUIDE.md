# Python Pose Service Setup Guide

## Problem
The pose service is failing with:
```
ModuleNotFoundError: No module named 'cv2'
```

This causes the Python process to crash on startup, which manifests as "write EOF" errors in the wrapper.

## Root Cause
The Python virtual environment for the pose service doesn't have the required dependencies installed, specifically `opencv-python` (cv2).

## Solution

### Step 1: Create Virtual Environment

**On Windows (PowerShell):**
```powershell
cd SnowboardingExplained/pose-service
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On macOS/Linux:**
```bash
cd SnowboardingExplained/pose-service
python3 -m venv venv
source venv/bin/activate
```

### Step 2: Install Dependencies

```bash
# Make sure you're in the virtual environment (you should see (venv) in your prompt)
pip install --upgrade pip setuptools wheel

# Install all requirements
pip install -r requirements.txt
```

This will install:
- `torch` - PyTorch deep learning framework
- `torchvision` - Computer vision utilities
- `opencv-python` - Image processing (cv2)
- `numpy` - Numerical computing
- `Pillow` - Image library
- `scipy` - Scientific computing
- `scikit-image` - Image processing
- `tqdm` - Progress bars

### Step 3: Download Models

```bash
# Make sure you're still in the virtual environment
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

This downloads:
- HMR2 model (~500MB) - 3D pose estimation
- ViTPose model (~100MB) - 2D keypoint detection

Models are cached in `.models/` directory for reuse.

### Step 4: Verify Installation

```bash
# Test that imports work
python -c "import cv2; import torch; print('✓ All imports successful')"

# Check if models are cached
ls -la .models/  # On Windows: dir .models\
```

Expected output:
```
✓ All imports successful
```

## Troubleshooting

### Issue: "No module named 'cv2'"
**Solution:** Make sure you're in the virtual environment and ran `pip install -r requirements.txt`
```bash
# Check if venv is activated (should see (venv) in prompt)
which python  # On Windows: where python

# If not activated, activate it:
source venv/bin/activate  # macOS/Linux
.\venv\Scripts\Activate.ps1  # Windows PowerShell
```

### Issue: "No module named 'torch'"
**Solution:** Same as above - install requirements
```bash
pip install -r requirements.txt
```

### Issue: "CUDA out of memory"
**Solution:** The system doesn't have enough GPU memory. Options:
1. Reduce `maxConcurrentProcesses` in pool config (default: 2)
2. Use CPU instead (slower but works)
3. Increase GPU memory if available

### Issue: Models not downloading
**Solution:** Download manually
```bash
# Create models directory
mkdir .models

# Download HMR2
python -c "from src.models import download_hmr2; download_hmr2('.models')"

# Download ViTPose
python -c "from src.models import download_vitpose; download_vitpose('.models')"

# Verify
ls -la .models/
```

### Issue: "ModuleNotFoundError" for other modules
**Solution:** Reinstall requirements
```bash
pip install --force-reinstall -r requirements.txt
```

## Verification Checklist

Before running the backend, verify:

- [ ] Virtual environment created: `ls venv/` (or `dir venv\` on Windows)
- [ ] Virtual environment activated: `(venv)` shows in prompt
- [ ] Dependencies installed: `pip list | grep opencv-python`
- [ ] Models downloaded: `ls .models/` shows `hmr2` and `vitpose` directories
- [ ] Imports work: `python -c "import cv2; import torch"`

## Running the Service

### Option 1: Direct Python (for testing)
```bash
# Activate venv
source venv/bin/activate  # macOS/Linux
.\venv\Scripts\Activate.ps1  # Windows

# Run the service
python app.py
```

Then send test data via stdin:
```bash
echo '{"frames": [{"frameNumber": 0, "imagePath": "path/to/image.jpg"}]}' | python app.py
```

### Option 2: Via Process Pool (production)
The backend automatically spawns the service via the process pool. Just make sure:
1. Virtual environment is set up
2. Dependencies are installed
3. Models are downloaded
4. Backend is running

## Environment Variables

Optional configuration:

```bash
# Enable debug logging
export POSE_SERVICE_DEBUG=1

# Set PyTorch cache directory
export TORCH_HOME=/path/to/cache

# Set CUDA device (if multiple GPUs)
export CUDA_VISIBLE_DEVICES=0
```

## Performance Notes

### First Run
- **Startup time**: ~2-3 seconds (models load from disk)
- **Memory**: ~2-4GB (GPU memory for models)

### Subsequent Runs
- **Startup time**: ~500ms (models cached in memory)
- **Per frame**: ~100-500ms (depends on complexity)

### Optimization Tips
1. Keep models cached (don't delete `.models/`)
2. Use GPU if available (much faster than CPU)
3. Limit concurrent processes to available GPU memory
4. Batch frames if possible (reduces startup overhead)

## Docker Alternative

If you prefer containerization:

```dockerfile
FROM pytorch/pytorch:2.0.1-cuda11.8-runtime-ubuntu22.04

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"

ENTRYPOINT ["python", "app.py"]
```

Build and run:
```bash
docker build -t pose-service .
docker run --gpus all pose-service
```

## Next Steps

1. Complete the setup steps above
2. Verify all checks pass
3. Run the backend: `npm run dev` in `backend/`
4. Test with a video upload
5. Monitor logs for any errors

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all checklist items
3. Check backend logs for error messages
4. Ensure Python version is 3.8+
5. Ensure CUDA is installed (if using GPU)
