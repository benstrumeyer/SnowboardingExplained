# Quick Start: ViTDet Cache Setup (WSL)

## TL;DR - One Time Setup

```bash
# In WSL with venv activated
cd backend/pose-service
source venv/bin/activate
python3 download_vitdet_cache.py

# Then create symlink to share with Windows
bash setup_vitdet_symlink.sh
```

## Every Time After

```bash
# Just start the service - model is cached
cd backend/pose-service
source venv/bin/activate
python3 app.py
```

## What Happens

**First Run (5-15 minutes):**
1. Download script checks for cached model at `~/.cache/4d-humans/`
2. If not found, downloads ~2.7GB ViTDet model
3. Takes 5-15 minutes depending on connection
4. Saves to cache for reuse

**Setup Symlink:**
1. Symlink script creates link from WSL cache to Windows cache
2. Allows sharing the model between Windows and WSL
3. No duplicate storage needed

**Subsequent Runs (Instant):**
1. Service checks cache
2. Model found ✓
3. Loads instantly (~1-2 seconds)
4. Service starts normally

## Verify Cache

```bash
# Check if model is cached
ls -lh ~/.cache/4d-humans/model_final_f05665.pkl

# Should show: ~2.7GB file
```

## If Something Goes Wrong

```bash
# Re-download (deletes old cache first)
rm -rf ~/.cache/4d-humans/
python download_vitdet_cache.py

# Recreate symlink
bash setup_vitdet_symlink.sh
```

## Performance Comparison

| Scenario | Time |
|---|---|
| Without cache | 5-15 min + service startup |
| With cache | 1-2 sec + service startup |
| **Savings** | **5-15 minutes per restart** |

## That's It!

No more waiting for ViTDet downloads! 🚀

The model is cached and shared between Windows and WSL via symlink.
