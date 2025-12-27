# Setup: Backend with WSL Pose Service

## Architecture

```
┌─────────────────────────────────────────┐
│  Windows Backend (Node.js)              │
│  - HTTP Endpoint                        │
│  - ProcessPoolManager                   │
│  - PoseServiceHttpWrapper               │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP POST /pose/hybrid
                 │ (localhost:5000)
                 │
┌────────────────▼────────────────────────┐
│  WSL Pose Service (Python)              │
│  - Receives frames via HTTP             │
│  - Spawns process for each request      │
│  - Processes with HMR2/ViTPose          │
│  - Returns pose data                    │
└─────────────────────────────────────────┘
```

## Setup Steps

### Step 1: Verify Pose Service on WSL

In WSL terminal:
```bash
cd SnowboardingExplained/pose-service
source venv/bin/activate
python app.py
```

Expected output:
```
[INFO] Starting pose service on http://localhost:5000
```

### Step 2: Configure Backend

Create `SnowboardingExplained/backend/.env.local`:

```env
# Use HTTP wrapper to connect to WSL service
USE_HTTP_POSE_SERVICE=true

# URL of the WSL pose service
POSE_SERVICE_URL=http://localhost:5000

# HTTP request timeout
POSE_SERVICE_TIMEOUT=120000
```

### Step 3: Start Backend

```bash
cd SnowboardingExplained/backend
npm run dev
```

Expected output:
```
[POSE_SERVICE_CLIENT] Initialized with URL: http://localhost:5000
ProcessPoolManager initialized with mode: HTTP
```

### Step 4: Test

Upload a video:
```bash
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

## How It Works

1. **Backend receives video upload**
   - Extracts frames
   - Converts to base64

2. **ProcessPoolManager queues requests**
   - Each frame = one request
   - Limits concurrent requests (default: 2)
   - Queues excess requests

3. **PoseServiceHttpWrapper sends HTTP request**
   - Sends frame to WSL service
   - Includes 50ms backpressure between requests
   - Waits for response

4. **WSL Pose Service processes frame**
   - Receives HTTP request
   - Spawns Python process
   - Processes with HMR2/ViTPose
   - Returns pose data

5. **Backend stores results**
   - Collects all responses
   - Saves to MongoDB

## Configuration

### Environment Variables

```env
# Enable HTTP mode (use WSL service)
USE_HTTP_POSE_SERVICE=true

# URL of WSL service
POSE_SERVICE_URL=http://localhost:5000

# HTTP timeout (milliseconds)
POSE_SERVICE_TIMEOUT=120000

# Max concurrent HTTP requests
MAX_CONCURRENT_PROCESSES=2

# Queue size
QUEUE_MAX_SIZE=100

# Debug logging
POSE_SERVICE_DEBUG=true
```

### Switching Modes

**To use local processes (if Python is set up on Windows):**
```env
USE_HTTP_POSE_SERVICE=false
```

**To use WSL service (recommended):**
```env
USE_HTTP_POSE_SERVICE=true
POSE_SERVICE_URL=http://localhost:5000
```

## Troubleshooting

### Issue: "Connection refused"
**Cause:** WSL service not running
**Fix:**
1. Start service in WSL: `python app.py`
2. Verify URL: `POSE_SERVICE_URL=http://localhost:5000`

### Issue: "Timeout" errors
**Cause:** Service taking too long
**Fix:** Increase timeout:
```env
POSE_SERVICE_TIMEOUT=180000  # 3 minutes
```

### Issue: "No module named 'cv2'" in WSL
**Cause:** Python dependencies not installed
**Fix:**
```bash
cd pose-service
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Models not found in WSL
**Cause:** Models not downloaded
**Fix:**
```bash
cd pose-service
source venv/bin/activate
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

## Performance

- **Per frame:** ~2-3 seconds
- **Network overhead:** Minimal (base64 JSON)
- **Concurrency:** Limited by `MAX_CONCURRENT_PROCESSES`
- **Memory:** All in WSL

## Files

### New/Modified Files

- `backend/src/services/poseServiceHttpWrapper.ts` - HTTP wrapper (new)
- `backend/src/services/processPoolManager.ts` - Updated to support both modes
- `backend/src/services/posePoolConfig.ts` - Updated to support both modes

### Existing Files (Unchanged)

- `backend/src/services/poseServiceExecWrapper.ts` - Local process wrapper
- `backend/src/services/pythonPoseService.ts` - HTTP client
- `pose-service/app.py` - Python service

## Next Steps

1. Verify WSL service is running
2. Update `.env.local` with `USE_HTTP_POSE_SERVICE=true`
3. Start backend: `npm run dev`
4. Test with video upload
5. Monitor logs for successful processing
