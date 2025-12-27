# Start Here: Complete Setup Guide

## Overview

This guide walks you through starting the complete system:
1. **Pose Service** (WSL) - Python app for pose detection
2. **Backend** (Windows) - Node.js API server
3. **Frontend** (Windows) - React web app

## Prerequisites

- WSL with Python 3.8+
- Node.js 16+ on Windows
- MongoDB running
- Video file for testing

## Quick Start (3 Steps)

### Step 1: Start Pose Service (WSL Terminal)

```bash
cd SnowboardingExplained/pose-service
source venv/bin/activate
python app.py
```

Expected output:
```
[INFO] Starting pose service on http://localhost:5000
```

### Step 2: Start Backend (Windows Terminal)

```bash
cd SnowboardingExplained/backend
npm run dev
```

Expected output:
```
[POSE_SERVICE_CLIENT] Initialized with URL: http://localhost:5000
ProcessPoolManager initialized with mode: HTTP
Server running on port 3001
```

### Step 3: Start Frontend (Windows Terminal)

```bash
cd SnowboardingExplained/backend/web
npm run dev
```

Expected output:
```
VITE v... ready in ... ms
➜  Local:   http://localhost:5173
```

## Testing

### Upload a Video

```bash
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

### Check Logs

**Pose Service (WSL):**
```
[INFO] Processing frame 0
[INFO] Processing frame 1
...
```

**Backend (Windows):**
```
[UPLOAD] Submitting 31 frames to process pool
[UPLOAD] Successfully processed 31/31 frames
Pose detection completed
```

## Configuration Files

### Pose Service: `pose-service/.env.local`

```env
HOST=0.0.0.0
PORT=5000
MODEL_CACHE_DIR=.models
LOG_LEVEL=INFO
DEBUG=false
```

### Backend: `backend/.env.local`

```env
USE_HTTP_POSE_SERVICE=true
POSE_SERVICE_URL=http://localhost:5000
POSE_SERVICE_TIMEOUT=120000
MAX_CONCURRENT_PROCESSES=2
PORT=3001
NODE_ENV=development
```

## Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React)                       │
│  http://localhost:5173                  │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP
                 │
┌────────────────▼────────────────────────┐
│  Backend (Node.js)                      │
│  http://localhost:3001                  │
│  - HTTP Endpoint                        │
│  - ProcessPoolManager                   │
│  - PoseServiceHttpWrapper               │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP POST /pose/hybrid
                 │
┌────────────────▼────────────────────────┐
│  Pose Service (Python on WSL)           │
│  http://localhost:5000                  │
│  - Receives frames                      │
│  - Spawns processes                     │
│  - Returns pose data                    │
└─────────────────────────────────────────┘
```

## Troubleshooting

### Pose Service Won't Start

**Error:** `ModuleNotFoundError: No module named 'cv2'`

**Fix:**
```bash
cd pose-service
source venv/bin/activate
pip install -r requirements.txt
```

**Error:** Models not found

**Fix:**
```bash
cd pose-service
source venv/bin/activate
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

### Backend Won't Connect to Pose Service

**Error:** `Connection refused`

**Fix:**
1. Verify pose service is running: `python app.py`
2. Check URL in `backend/.env.local`: `POSE_SERVICE_URL=http://localhost:5000`

**Error:** `Timeout` errors

**Fix:** Increase timeout in `backend/.env.local`:
```env
POSE_SERVICE_TIMEOUT=180000  # 3 minutes
```

### Video Upload Fails

**Check logs:**
- Backend: `npm run dev` output
- Pose Service: `python app.py` output

**Common issues:**
- Pose service not running
- MongoDB not running
- Invalid video format

## Performance

- **Per frame:** ~2-3 seconds
- **31 frames:** ~42 seconds (with 2 concurrent processes)
- **Network overhead:** Minimal

## Next Steps

1. ✅ Start pose service
2. ✅ Start backend
3. ✅ Start frontend
4. ✅ Upload a test video
5. ✅ Check results in MongoDB

## Documentation

- **QUICK_SETUP_WSL.md** - TL;DR setup
- **SETUP_WITH_WSL_SERVICE.md** - Detailed setup
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **PROCESS_POOL_ARCHITECTURE.md** - Architecture explanation

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the relevant documentation
3. Check logs in each terminal
4. Verify all services are running

## That's It!

You now have a complete system running:
- Pose detection on WSL
- Backend API on Windows
- Frontend web app on Windows

All communicating via HTTP with proper queuing and concurrency management.
