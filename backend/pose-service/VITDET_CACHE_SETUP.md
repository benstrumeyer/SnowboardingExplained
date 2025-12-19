# ViTDet Model Caching Setup

This guide explains how to pre-download and cache the ViTDet model to avoid re-downloading it every time you restart the pose service.

## Problem
- ViTDet model is ~2.7GB
- Downloaded fresh every time the service starts
- Takes 5-15 minutes on first run
- Wastes bandwidth and time

## Solution
Pre-download the model once to Windows, then symlink it into WSL so both can share it.

## Setup Steps

### Step 1: Download Model to Windows Cache (One-time)

**Option A: From WSL (Recommended)**
```bash
# In WSL terminal
cd ~/repos/SnowboardingExplained/backend/pose-service
python download_vitdet_cache.py
```

**Option B: From Windows PowerShell**
```powershell
# In PowerShell
cd C:\Users\YourUsername\repos\SnowboardingExplained\backend\pose-service
python download_vitdet_cache.py
```

This will:
- Create cache directory: `~/.cache/4d-humans/` (in WSL) or `%USERPROFILE%\.cache\4d-humans\` (Windows)
- Download ViTDet model (~2.7GB)
- Takes 5-15 minutes depending on connection

### Step 2: Verify Cache Location

**In WSL:**
```bash
ls -lh ~/.cache/4d-humans/
# Should show: model_final_f05665.pkl (~2.7GB)
```

**In Windows PowerShell:**
```powershell
ls $env:USERPROFILE\.cache\4d-humans\
# Should show: model_final_f05665.pkl (~2.7GB)
```

### Step 3: Create Symlink (WSL to Windows Cache)

If you want WSL to use the Windows cache (optional but recommended for space):

```bash
# In WSL
mkdir -p ~/.cache
ln -s /mnt/c/Users/YourUsername/.cache/4d-humans ~/.cache/4d-humans

# Verify
ls -l ~/.cache/4d-humans/
```

## Usage

### Starting the Service

**From WSL:**
```bash
cd ~/repos/SnowboardingExplained/backend/pose-service
python app.py
```

**From Windows (using start-pose-service.bat):**
```batch
cd C:\Users\YourUsername\repos\SnowboardingExplained\backend\pose-service
python app.py
```

The service will now:
1. Check if model is cached
2. Load from cache (instant, ~1-2 seconds)
3. Skip the 5-15 minute download

### Warmup Endpoint

After starting the service, call the warmup endpoint to pre-load models:

```bash
curl http://localhost:5000/warmup
```

Response:
```json
{
  "status": "ready",
  "hmr2": {"status": "loaded", "load_time_seconds": 3.2},
  "vitdet": {"status": "loaded", "load_time_seconds": 1.5}
}
```

## Troubleshooting

### Model not found after download
```bash
# Check cache directory
ls -lh ~/.cache/4d-humans/

# If empty, try downloading again
python download_vitdet_cache.py
```

### Symlink not working
```bash
# Remove broken symlink
rm ~/.cache/4d-humans

# Create new symlink with correct path
ln -s /mnt/c/Users/YourUsername/.cache/4d-humans ~/.cache/4d-humans
```

### Still downloading on startup
- Check that `~/.cache/4d-humans/model_final_f05665.pkl` exists
- Verify file size is ~2.7GB
- Check logs for cache directory path

## Cache Locations

| OS | Location |
|---|---|
| WSL | `~/.cache/4d-humans/` |
| Windows | `%USERPROFILE%\.cache\4d-humans\` |
| Docker | `/root/.cache/4d-humans/` (if mounted) |

## Disk Space

- ViTDet model: ~2.7GB
- HMR2 model: ~500MB
- Total: ~3.2GB

If using symlink from WSL to Windows, only one copy is stored on Windows.

## Performance

| Scenario | Time |
|---|---|
| First run (download) | 5-15 minutes |
| Cached load | 1-2 seconds |
| Warmup endpoint | 3-5 seconds |
| First inference | 10-30 seconds |
| Subsequent inference | 5-15 seconds |

## Automation

To automate this on service startup, add to your startup script:

**start-pose-service.bat:**
```batch
@echo off
cd /d "%~dp0"

REM Check if model is cached, if not download
if not exist "%USERPROFILE%\.cache\4d-humans\model_final_f05665.pkl" (
    echo Downloading ViTDet model...
    python download_vitdet_cache.py
    if errorlevel 1 (
        echo Download failed!
        exit /b 1
    )
)

REM Start service
python app.py
```

## Notes

- Model is downloaded from Facebook's official CDN
- Download is resumable if interrupted
- Cache is persistent across service restarts
- Safe to delete cache and re-download anytime
