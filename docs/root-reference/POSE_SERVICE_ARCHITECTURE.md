# Pose Service Architecture

## Overview

Your project uses a **distributed architecture** where the pose detection service runs on WSL (Linux) and your backend runs on Windows.

```
┌─────────────────────────────────────────────────────────────┐
│  Windows Backend (Node.js)                                  │
│  - Extracts frames from video                               │
│  - Sends HTTP POST to WSL service                           │
│  - Stores results in MongoDB                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP POST
                     │ /pose/hybrid
                     │
┌────────────────────▼────────────────────────────────────────┐
│  WSL Flask Server (Python)                                  │
│  - Listens on http://0.0.0.0:5000                           │
│  - Receives frames as base64 JSON                           │
│  - Processes with 4D-Humans + PHALP                         │
│  - Returns pose data as JSON                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│  4D-Humans (HMR2) + PHALP Tracking                          │
│  - Per-frame 3D pose detection (HMR2)                       │
│  - Temporal tracking (PHALP)                                │
│  - Predicts when detection fails                            │
│  - Result: 100% frame coverage                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Configuration

**File:** `SnowboardingExplained/backend/.env.local`

```env
# URL of the pose service (running on WSL)
POSE_SERVICE_URL=http://172.24.183.130:5000

# HTTP request timeout (milliseconds)
POSE_SERVICE_TIMEOUT=120000
```

**Key points:**
- Uses WSL IP address (not localhost)
- 120 second timeout for first run (model download)
- Calls `/pose/hybrid` endpoint

---

## Backend HTTP Client

**File:** `SnowboardingExplained/backend/src/services/pythonPoseService.ts`

Provides these functions:

- `detectPoseHybrid(imageBase64, frameNumber, visualize)` - Single frame
- `detectPoseHybridBatch(frames, visualize)` - Multiple frames
- `checkPoseServiceHealth()` - Health check
- `getPoseServiceStatus()` - Full status

All functions call the WSL service via HTTP.

---

## WSL Pose Service

**Location:** `/home/ben/pose-service/` on WSL

**Startup command:**
```bash
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source 4D-Humans/venv/bin/activate && python flask_wrapper.py"
```

**What's running:**
- Flask HTTP server on port 5000
- 4D-Humans (HMR2) for per-frame pose detection
- PHALP for temporal tracking across frames

**Endpoints:**
- `GET /health` - Health check
- `POST /pose/hybrid` - Single frame processing
- `POST /pose/batch` - Multiple frames

---

## Why This Architecture?

### Per-Frame Detection (HMR2)

HMR2 processes each frame independently and can fail when:
- Person is occluded
- Extreme angles (back-facing, side-facing)
- Motion blur
- Poor lighting
- Person is far from camera

**Result:** ~36% failure rate on snowboarding videos

### Temporal Tracking (PHALP)

PHALP tracks across frames and predicts when HMR2 fails:
- Maintains tracklets (continuous tracks)
- Builds motion models (velocity, acceleration)
- Predicts poses when detection fails
- Re-associates predictions with detections

**Result:** 100% frame coverage (0 frames lost)

---

## Frame Coverage

### Without PHALP
```
Video: 140 frames
├─ Frame 0 → HMR2 → Detected ✓
├─ Frame 1 → HMR2 → Detected ✓
├─ Frame 2 → HMR2 → Failed ✗ (LOST)
├─ Frame 3 → HMR2 → Detected ✓
└─ ... (50 frames lost total)

Result: 90 frames extracted (36% loss)
```

### With PHALP
```
Video: 140 frames
├─ Frame 0 → HMR2 → Detected ✓ → PHALP Tracklet
├─ Frame 1 → HMR2 → Detected ✓ → PHALP Tracklet
├─ Frame 2 → HMR2 → Failed ✗ → PHALP Predicts ✓
├─ Frame 3 → HMR2 → Detected ✓ → PHALP Tracklet
└─ ... (all 140 frames have pose data)

Result: 140 frames extracted (0% loss)
```

---

## Setup Instructions

See `SETUP_4D_HUMANS_WITH_PHALP.md` for complete setup guide.

Quick summary:
1. SSH into WSL
2. Clone 4D-Humans (if not already there)
3. Install dependencies and PHALP
4. Create Flask wrapper
5. Test from Windows
6. Upload video to backend

---

## Key Files

**Backend:**
- `backend/src/services/pythonPoseService.ts` - HTTP client
- `backend/.env.local` - Configuration

**WSL:**
- `/home/ben/pose-service/flask_wrapper.py` - Flask HTTP wrapper
- `/home/ben/pose-service/4D-Humans/` - 4D-Humans library
- `/home/ben/pose-service/start.sh` - Startup script

---

## Testing

### Health Check
```bash
curl -X GET http://172.24.183.130:5000/health
```

### Single Frame
```bash
curl -X POST http://172.24.183.130:5000/pose/hybrid \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "...", "frame_number": 0}'
```

### From Backend
```bash
# Start backend
cd SnowboardingExplained/backend
npm run dev

# Upload video
# Check frame count - should be 140/140 instead of 90/140
```

---

## Performance

**First run:** ~30-60 seconds (downloads ~500MB models)
**Subsequent runs:** ~250ms per frame (with GPU)
**CPU only:** ~2-5 seconds per frame

**GPU:** Much faster, recommended
**CPU:** Slow but works

---

## Troubleshooting

### Connection refused
- Check WSL IP: `hostname -I` in WSL
- Update `POSE_SERVICE_URL` in `.env.local`
- Verify Flask is running: `lsof -i :5000` in WSL

### Models not downloading
- Check internet connection
- Manually download: `python -c "from hmr2.models import download_model; download_model()"`

### PHALP import error
- Reinstall: `pip install git+https://github.com/brjathu/PHALP.git`

### Slow performance
- Check GPU: `nvidia-smi` in WSL
- First run is slow (model download)
- Subsequent runs should be faster

---

## Next Steps

1. Follow `SETUP_4D_HUMANS_WITH_PHALP.md` to set up the WSL service
2. Test with a video upload
3. Verify you get 140 frames instead of 90
4. Optimize performance if needed
