# Using External Pose Service (WSL)

## Setup

You have the pose service running on WSL. The backend now supports connecting to it via HTTP instead of spawning local processes.

### Step 1: Verify Pose Service is Running on WSL

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

### Step 2: Configure Backend to Use HTTP Service

Create or update `SnowboardingExplained/backend/.env.local`:

```env
# Use external HTTP service instead of spawning local processes
USE_HTTP_POSE_SERVICE=true

# URL of the external pose service
POSE_SERVICE_URL=http://localhost:5000

# Timeout for HTTP requests (in milliseconds)
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

```
┌─────────────────────────────────────────┐
│  Windows Backend (Node.js)              │
│  - HTTP Client                          │
│  - ProcessPoolManager (HTTP mode)       │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP POST
                 │ (localhost:5000)
                 │
┌────────────────▼────────────────────────┐
│  WSL Pose Service (Python)              │
│  - Receives frames via HTTP             │
│  - Processes with HMR2/ViTPose          │
│  - Returns pose data                    │
└─────────────────────────────────────────┘
```

## Architecture

The backend now supports two modes:

### Mode 1: Local Process Spawning (Default)
- Spawns Python processes locally
- Requires Python environment on Windows
- Good for single-machine development

**Enable with:**
```env
USE_HTTP_POSE_SERVICE=false
# or omit the variable (defaults to false)
```

### Mode 2: External HTTP Service (Recommended for WSL)
- Connects to external service via HTTP
- Service can run on WSL, Docker, or remote machine
- No local Python dependencies needed

**Enable with:**
```env
USE_HTTP_POSE_SERVICE=true
POSE_SERVICE_URL=http://localhost:5000
```

## Components

### PoseServiceHttpWrapper
New wrapper that sends frames to external service via HTTP instead of spawning processes.

**File:** `backend/src/services/poseServiceHttpWrapper.ts`

Features:
- Sends frames to external service
- Handles HTTP errors gracefully
- Includes backpressure (50ms between requests)
- Compatible with ProcessPoolManager

### ProcessPoolManager (Updated)
Now supports both modes:
- Process spawning (original)
- HTTP requests (new)

**File:** `backend/src/services/processPoolManager.ts`

Configuration:
```typescript
{
  useHttpService: true,  // Enable HTTP mode
  maxConcurrentProcesses: 2,
  queueMaxSize: 100,
  processTimeoutMs: 120000
}
```

### PoseServiceHttpClient
Existing HTTP client for communicating with external service.

**File:** `backend/src/services/pythonPoseService.ts`

Functions:
- `detectPoseHybrid()` - Send single frame
- `detectPoseHybridBatch()` - Send multiple frames
- `checkPoseServiceHealth()` - Check service status

## Configuration

### Environment Variables

```env
# Enable HTTP mode
USE_HTTP_POSE_SERVICE=true

# URL of external service
POSE_SERVICE_URL=http://localhost:5000

# HTTP request timeout (ms)
POSE_SERVICE_TIMEOUT=120000

# Max concurrent requests (for HTTP mode)
MAX_CONCURRENT_PROCESSES=2

# Queue size
QUEUE_MAX_SIZE=100

# Debug logging
POSE_SERVICE_DEBUG=true
```

### Default Values

- `USE_HTTP_POSE_SERVICE`: false (use local processes)
- `POSE_SERVICE_URL`: http://localhost:5000
- `POSE_SERVICE_TIMEOUT`: 120000 (2 minutes)
- `MAX_CONCURRENT_PROCESSES`: 2
- `QUEUE_MAX_SIZE`: 100
- `POSE_SERVICE_DEBUG`: false

## Troubleshooting

### Issue: "Connection refused"
**Cause:** Pose service not running on WSL
**Fix:**
1. Start pose service in WSL: `python app.py`
2. Verify URL in `.env.local`: `POSE_SERVICE_URL=http://localhost:5000`

### Issue: "Timeout" errors
**Cause:** Service taking too long
**Fix:** Increase timeout in `.env.local`:
```env
POSE_SERVICE_TIMEOUT=180000  # 3 minutes
```

### Issue: "No module named 'cv2'" in WSL
**Cause:** Python dependencies not installed
**Fix:** Install in WSL:
```bash
cd pose-service
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Models not found in WSL
**Cause:** Models not downloaded
**Fix:** Download in WSL:
```bash
cd pose-service
source venv/bin/activate
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

## Performance

- **Per frame:** ~2-3 seconds (same as local spawning)
- **Network overhead:** Minimal (frames sent as base64 JSON)
- **Concurrency:** Limited by `MAX_CONCURRENT_PROCESSES`
- **Memory:** All in WSL (doesn't use Windows memory)

## Advantages

1. **No Windows Python setup needed** - Service runs on WSL
2. **Separation of concerns** - Service runs independently
3. **Easier debugging** - Can monitor service separately
4. **Scalability** - Can run multiple services on different machines
5. **Flexibility** - Service can be on WSL, Docker, or remote server

## Switching Modes

To switch between local and HTTP modes:

**To use local processes:**
```env
USE_HTTP_POSE_SERVICE=false
```

**To use external service:**
```env
USE_HTTP_POSE_SERVICE=true
POSE_SERVICE_URL=http://localhost:5000
```

Then restart the backend.

## Next Steps

1. Verify pose service is running on WSL
2. Update `.env.local` with `USE_HTTP_POSE_SERVICE=true`
3. Start backend: `npm run dev`
4. Test with video upload
5. Monitor logs for successful processing
