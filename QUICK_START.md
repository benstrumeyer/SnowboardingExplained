# Quick Start - Pose Service Setup

## TL;DR - Just Run This

### Windows (PowerShell)
```powershell
cd SnowboardingExplained
.\setup-pose-service.ps1
```

### macOS/Linux (Bash)
```bash
cd SnowboardingExplained
bash setup-pose-service.sh
```

Then run the backend:
```bash
cd backend
npm run dev
```

## What This Does

1. Creates Python virtual environment
2. Installs all dependencies (opencv-python, torch, etc.)
3. Downloads pose detection models (~600MB)
4. Verifies everything works

## If Setup Script Fails

### Manual Setup (Windows PowerShell)
```powershell
cd SnowboardingExplained\pose-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

### Manual Setup (macOS/Linux)
```bash
cd SnowboardingExplained/pose-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

## Verify It Works

```bash
# Check virtual environment is activated (should see (venv) in prompt)
python -c "import cv2; import torch; print('✓ Success')"
```

## Run Backend

```bash
cd SnowboardingExplained/backend
npm run dev
```

## Test Upload

```bash
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

## Common Issues

| Issue | Fix |
|-------|-----|
| "No module named 'cv2'" | Run setup script or `pip install -r requirements.txt` |
| "No module named 'torch'" | Same as above |
| "(venv) not in prompt" | Activate: `source venv/bin/activate` or `.\venv\Scripts\Activate.ps1` |
| "Models not found" | Run: `python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"` |
| "CUDA out of memory" | Reduce `maxConcurrentProcesses` to 1 in `posePoolConfig.ts` |

## Detailed Guides

- **PYTHON_SETUP_GUIDE.md** - Complete setup instructions
- **PYTHON_ENVIRONMENT_ISSUE.md** - Why this was happening
- **ISSUE_DIAGNOSIS_AND_FIX.md** - Full explanation and fix
- **PROCESS_POOL_ARCHITECTURE.md** - How the system works
- **TEST_PROCESS_POOL.md** - Testing guide

## That's It!

The setup script handles everything. Just run it and you're good to go.
