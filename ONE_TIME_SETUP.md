# One-Time Setup for 4D-Humans with PHALP

## TL;DR

**One-time setup** (run once):
```bash
bash setup-4d-humans-wsl.sh
```

**Every time you want to use it** (run whenever):
```bash
bash start-pose-service.sh
```

---

## What Gets Installed (One-Time)

When you run `setup-4d-humans-wsl.sh`, it:
- ✅ Clones 4D-Humans repository (persists on WSL)
- ✅ Creates Python virtual environment (persists on WSL)
- ✅ Installs all dependencies (persists on WSL)
- ✅ Downloads models (~600MB, cached on WSL)

**All of this persists on WSL** - you don't need to do it again.

---

## What Gets Started (Every Time)

When you run `start-pose-service.sh`, it:
- ✅ Activates the virtual environment
- ✅ Starts the Flask wrapper
- ✅ Listens on port 5000

**This is a service** - it runs until you stop it (Ctrl+C).

---

## Workflow

### First Time (One-Time Setup)

```bash
# 1. Run setup script (1-2 hours, mostly waiting for downloads)
bash setup-4d-humans-wsl.sh

# 2. Copy flask_wrapper.py to /home/ben/pose-service/
cp flask_wrapper.py /home/ben/pose-service/

# 3. Start Flask wrapper
bash start-pose-service.sh

# 4. In another terminal, test it
curl http://172.24.183.130:5000/health
```

### Every Time After (Just Start It)

```bash
# Just run the startup script
bash start-pose-service.sh

# That's it! It's ready to use
```

---

## What Persists on WSL

```
/home/ben/pose-service/
├── 4D-Humans/                    # ✅ Persists (cloned once)
│   ├── venv/                     # ✅ Persists (created once)
│   ├── hmr2/                     # ✅ Persists (cloned once)
│   ├── phalp/                    # ✅ Persists (cloned once)
│   └── requirements.txt
├── flask_wrapper.py              # ✅ Persists (copied once)
├── start-pose-service.sh         # ✅ Persists (copied once)
└── ~/.cache/torch/hub/           # ✅ Persists (downloaded once, ~600MB)
```

---

## What Doesn't Persist

Nothing! Everything is persistent on WSL.

**WSL filesystem is persistent** - files you create stay there until you delete them or reset WSL.

---

## Common Questions

### Q: Do I need to clone it every time I run WSL?
**A: No.** Once cloned, it stays on WSL. Just run `start-pose-service.sh` to start it.

### Q: Do I need to reinstall dependencies every time?
**A: No.** They're installed in the virtual environment, which persists on WSL.

### Q: Do I need to re-download models every time?
**A: No.** Models are cached in `~/.cache/torch/hub/`, which persists on WSL.

### Q: What if I restart my computer?
**A: Everything persists.** WSL filesystem is persistent across reboots. Just run `start-pose-service.sh` again.

### Q: What if I close the terminal?
**A: The Flask wrapper stops.** Just run `start-pose-service.sh` again to restart it.

### Q: What if I reset WSL?
**A: Everything is deleted.** You'll need to run `setup-4d-humans-wsl.sh` again. But you shouldn't need to reset WSL.

---

## Setup Timeline

| Step | Time | Command | Frequency |
|------|------|---------|-----------|
| Clone & Install | 1-2h | `bash setup-4d-humans-wsl.sh` | **Once** |
| Download Models | (included above) | (automatic) | **Once** |
| Start Service | 1m | `bash start-pose-service.sh` | **Every time** |
| Test | 1m | `curl http://172.24.183.130:5000/health` | **Every time** |

---

## Idempotent Setup

The setup script is **idempotent** - safe to run multiple times:

```bash
# First run: Clones, installs, downloads
bash setup-4d-humans-wsl.sh

# Second run: Skips clone (already exists), skips install (already installed), skips download (already cached)
bash setup-4d-humans-wsl.sh

# Third run: Same as second run
bash setup-4d-humans-wsl.sh
```

Each step checks if it's already done and skips it if so.

---

## Quick Reference

### One-Time Setup
```bash
# Run once to set everything up
bash setup-4d-humans-wsl.sh

# Copy Flask wrapper
cp flask_wrapper.py /home/ben/pose-service/
```

### Every Time You Want to Use It
```bash
# Start the Flask wrapper
bash start-pose-service.sh

# In another terminal, test it
curl http://172.24.183.130:5000/health

# Start your backend
npm run dev  # in SnowboardingExplained/backend

# Upload a video and it will use the Flask wrapper
```

### Stop the Flask Wrapper
```bash
# Press Ctrl+C in the terminal where it's running
```

---

## Summary

✅ **One-time setup**: `bash setup-4d-humans-wsl.sh`
✅ **Every time**: `bash start-pose-service.sh`
✅ **Everything persists** on WSL
✅ **Safe to run setup multiple times** (idempotent)
✅ **No need to clone again** after first setup

Done! 🎉
