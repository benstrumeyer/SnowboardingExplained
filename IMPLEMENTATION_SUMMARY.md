# Implementation Summary: Backend with WSL Pose Service

## What Was Done

Implemented support for the backend to connect to the pose service running on WSL via HTTP, instead of trying to spawn local Python processes.

## Architecture

The system follows the original design:

```
1. Pose Service App (WSL)
   └─ Python app with HMR2/ViTPose models
   └─ Listens on http://localhost:5000

2. PoseServiceHttpWrapper (Backend)
   └─ HTTP client wrapper
   └─ Sends frames to WSL service
   └─ Implements same interface as PoseServiceExecWrapper

3. ProcessPoolManager (Backend)
   └─ Queues HTTP requests
   └─ Limits concurrent requests (default: 2)
   └─ Supports both process spawning and HTTP modes

4. HTTP Endpoint (Backend)
   └─ Receives video uploads
   └─ Extracts frames
   └─ Submits to ProcessPoolManager
   └─ Stores results in MongoDB
```

## Files Created/Modified

### New Files

1. **poseServiceHttpWrapper.ts**
   - HTTP wrapper for external service
   - Same interface as PoseServiceExecWrapper
   - Sends frames via HTTP to WSL service
   - Includes 50ms backpressure between requests

### Modified Files

1. **processPoolManager.ts**
   - Added support for HTTP mode
   - Can use either PoseServiceExecWrapper or PoseServiceHttpWrapper
   - Configuration determines which wrapper to use

2. **posePoolConfig.ts**
   - Added `useHttpService` configuration option
   - Supports both local process and HTTP modes

### Documentation

1. **SETUP_WITH_WSL_SERVICE.md** - Quick setup guide
2. **USE_EXTERNAL_POSE_SERVICE.md** - Detailed configuration guide
3. **EXTERNAL_POSE_SERVICE_SETUP.md** - Architecture explanation

## How to Use

### Step 1: Start WSL Pose Service

```bash
cd SnowboardingExplained/pose-service
source venv/bin/activate
python app.py
```

### Step 2: Configure Backend

Create `backend/.env.local`:

```env
USE_HTTP_POSE_SERVICE=true
POSE_SERVICE_URL=http://localhost:5000
POSE_SERVICE_TIMEOUT=120000
```

### Step 3: Start Backend

```bash
cd SnowboardingExplained/backend
npm run dev
```

### Step 4: Test

```bash
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

## Configuration Options

### Environment Variables

```env
# Use HTTP wrapper (true) or local process wrapper (false)
USE_HTTP_POSE_SERVICE=true

# URL of external pose service
POSE_SERVICE_URL=http://localhost:5000

# HTTP request timeout (milliseconds)
POSE_SERVICE_TIMEOUT=120000

# Max concurrent requests
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

## How It Works

### Request Flow

1. **Backend receives video upload**
   ```
   POST /api/upload-video-with-pose
   - Extract frames
   - Convert to base64
   ```

2. **ProcessPoolManager queues requests**
   ```
   For each frame:
   - Create request object
   - If capacity available: process immediately
   - Else: queue request
   ```

3. **PoseServiceHttpWrapper sends HTTP request**
   ```
   POST http://localhost:5000/pose/hybrid
   - Send frame as base64
   - Wait for response
   - Include 50ms backpressure
   ```

4. **WSL Pose Service processes frame**
   ```
   - Receive HTTP request
   - Spawn Python process
   - Process with HMR2/ViTPose
   - Return pose data
   ```

5. **Backend stores results**
   ```
   - Collect all responses
   - Save to MongoDB
   - Return success to client
   ```

### Concurrency Management

```
Time    Active Requests    Queue Size
0ms     2                  28
50ms    2                  28
2600ms  2                  28
2650ms  2                  27
5200ms  2                  26
...
```

- Max 2 concurrent HTTP requests
- Remaining 28 requests queued
- As requests complete, queue is processed
- 50ms backpressure between requests

## Advantages

1. **No Windows Python setup needed** - Service runs on WSL
2. **Separation of concerns** - Service runs independently
3. **Easier debugging** - Can monitor service separately
4. **Scalability** - Service can be on WSL, Docker, or remote server
5. **Flexibility** - Can switch between local and HTTP modes

## Troubleshooting

### Connection Refused
- Verify WSL service is running: `python app.py`
- Check URL in `.env.local`

### Timeout Errors
- Increase `POSE_SERVICE_TIMEOUT` in `.env.local`
- Check WSL service logs

### Missing Dependencies in WSL
```bash
cd pose-service
source venv/bin/activate
pip install -r requirements.txt
```

### Models Not Found in WSL
```bash
cd pose-service
source venv/bin/activate
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

## Performance

- **Per frame:** ~2-3 seconds
- **Network overhead:** Minimal (base64 JSON)
- **Concurrency:** Limited by `MAX_CONCURRENT_PROCESSES`
- **Memory:** All in WSL (doesn't use Windows memory)

## Switching Modes

### To use local processes (if Python is set up on Windows):
```env
USE_HTTP_POSE_SERVICE=false
```

### To use WSL service (recommended):
```env
USE_HTTP_POSE_SERVICE=true
POSE_SERVICE_URL=http://localhost:5000
```

Then restart the backend.

## Next Steps

1. Verify WSL pose service is running
2. Update `backend/.env.local` with configuration
3. Start backend: `npm run dev`
4. Test with video upload
5. Monitor logs for successful processing

## Technical Details

### PoseServiceHttpWrapper

- Implements same interface as PoseServiceExecWrapper
- Sends frames to external service via HTTP
- Includes 50ms backpressure between requests
- Handles errors gracefully
- Compatible with ProcessPoolManager

### ProcessPoolManager

- Supports both process spawning and HTTP modes
- Configuration determines which wrapper to use
- Queues requests and limits concurrency
- Works identically in both modes

### HTTP Client

- Uses existing `detectPoseHybrid()` function
- Sends frames as base64 JSON
- Handles retries and timeouts
- Maps responses to PoseResult format

## Files

### Core Implementation

- `backend/src/services/poseServiceHttpWrapper.ts` - HTTP wrapper
- `backend/src/services/processPoolManager.ts` - Pool manager (updated)
- `backend/src/services/posePoolConfig.ts` - Configuration (updated)

### Existing (Unchanged)

- `backend/src/services/poseServiceExecWrapper.ts` - Process wrapper
- `backend/src/services/pythonPoseService.ts` - HTTP client
- `pose-service/app.py` - Python service

### Documentation

- `SETUP_WITH_WSL_SERVICE.md` - Quick setup
- `USE_EXTERNAL_POSE_SERVICE.md` - Detailed guide
- `EXTERNAL_POSE_SERVICE_SETUP.md` - Architecture

## Summary

The backend now supports connecting to the pose service running on WSL via HTTP. This eliminates the need for Python to be installed on Windows and allows the service to run independently on WSL. The architecture maintains the original design with ProcessPoolManager queuing requests and limiting concurrency.
