# Using External Pose Service (WSL)

## Problem
You have the pose service running on WSL, but the backend is trying to spawn its own local Python processes, which fail because Python dependencies aren't installed on Windows.

## Solution
Configure the backend to use the external pose service running on WSL via HTTP instead of spawning local processes.

## Setup

### Step 1: Verify Pose Service is Running on WSL

In WSL terminal:
```bash
cd SnowboardingExplained/pose-service
source venv/bin/activate
python app.py
```

The service should be listening on `http://localhost:5000` (or whatever port you configured).

### Step 2: Configure Backend Environment

Create or update `SnowboardingExplained/backend/.env.local`:

```env
# Use external pose service instead of spawning local processes
POSE_SERVICE_URL=http://localhost:5000
POSE_SERVICE_TIMEOUT=120000

# Disable process pool (optional - set to empty or remove)
# POSE_POOL_ENABLED=false
```

### Step 3: Modify Backend to Use HTTP Service

The backend currently uses the process pool. We need to modify it to use the HTTP client instead.

**Option A: Use HTTP Service (Recommended)**

Modify `SnowboardingExplained/backend/src/server.ts` to use `detectPoseHybrid` (HTTP client) instead of the process pool:

Find this section (around line 750):
```typescript
if (poolManager && framesToProcess.length > 0) {
  console.log(`[UPLOAD] Submitting ${framesToProcess.length} frames to process pool...`);
  // ... process pool code
}
```

Replace with:
```typescript
// Use HTTP service instead of process pool
if (framesToProcess.length > 0) {
  console.log(`[UPLOAD] Submitting ${framesToProcess.length} frames to HTTP service...`);
  
  const framePromises = framesToProcess.map(frameData =>
    detectPoseHybrid(frameData.imageBase64, frameData.frameNumber)
      .then(poseResult => ({
        frameNumber: frameData.frameNumber,
        timestamp: frameData.timestamp,
        keypoints: poseResult.keypoints,
        has3d: poseResult.has3d,
        jointAngles3d: poseResult.jointAngles3d,
        mesh_vertices_data: poseResult.mesh_vertices_data,
        mesh_faces_data: poseResult.mesh_faces_data,
        cameraTranslation: poseResult.cameraTranslation
      }))
      .catch(err => {
        console.error(`[UPLOAD] Error processing frame ${frameData.frameNumber}:`, err);
        logger.warn(`Failed to extract pose for frame ${frameData.frameNumber}:`, err);
        return null;
      })
  );

  try {
    const results = await Promise.all(framePromises);
    meshSequence.push(...results.filter(r => r !== null));
    console.log(`[UPLOAD] Successfully processed ${meshSequence.length}/${framesToProcess.length} frames`);
  } catch (err) {
    console.error(`[UPLOAD] HTTP service processing error:`, err);
    logger.error('HTTP service processing failed', { error: err });
  }
}
```

**Option B: Keep Process Pool but Disable It**

If you want to keep the process pool code but disable it, modify `posePoolConfig.ts`:

```typescript
export function loadPosePoolConfig(): PosePoolConfig {
  // Check if we should use HTTP service instead
  const useHttpService = process.env.USE_HTTP_POSE_SERVICE === 'true';
  
  if (useHttpService) {
    logger.info('Using HTTP pose service instead of process pool');
    // Return a dummy config that won't be used
    return {
      pythonServicePath: '',
      maxConcurrentProcesses: 0,
      queueMaxSize: 0,
      processTimeoutMs: 0,
      debug: false
    };
  }
  
  // ... rest of config
}
```

Then in `.env.local`:
```env
USE_HTTP_POSE_SERVICE=true
POSE_SERVICE_URL=http://localhost:5000
```

## Testing

### Step 1: Start Pose Service on WSL

```bash
cd SnowboardingExplained/pose-service
source venv/bin/activate
python app.py
```

Expected output:
```
[INFO] Starting pose service on http://localhost:5000
```

### Step 2: Start Backend

```bash
cd SnowboardingExplained/backend
npm run dev
```

Expected output:
```
[POSE_SERVICE_CLIENT] Initialized with URL: http://localhost:5000
```

### Step 3: Upload a Video

```bash
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@test-video.mp4" \
  -F "role=rider"
```

### Step 4: Check Logs

**Backend logs should show:**
```
[UPLOAD] Submitting 31 frames to HTTP service
[UPLOAD] Successfully processed 31/31 frames
Pose detection completed
```

**WSL pose service logs should show:**
```
[INFO] Processing frame 0
[INFO] Processing frame 1
...
[INFO] Processing frame 30
```

## Troubleshooting

### Issue: "Connection refused" or "ECONNREFUSED"
**Cause:** Pose service not running on WSL or wrong URL
**Fix:**
1. Verify pose service is running: `ps aux | grep python`
2. Check URL in `.env.local`: `POSE_SERVICE_URL=http://localhost:5000`
3. If using different port, update accordingly

### Issue: "Timeout" errors
**Cause:** Pose service taking too long to process
**Fix:** Increase timeout in `.env.local`:
```env
POSE_SERVICE_TIMEOUT=180000  # 3 minutes instead of 2
```

### Issue: "No module named 'cv2'" in WSL
**Cause:** Python dependencies not installed in WSL
**Fix:** Run setup in WSL:
```bash
cd SnowboardingExplained/pose-service
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Models not found in WSL
**Cause:** Models not downloaded
**Fix:** Download in WSL:
```bash
cd SnowboardingExplained/pose-service
source venv/bin/activate
python -c "from src.models import download_hmr2, download_vitpose; download_hmr2('.models'); download_vitpose('.models')"
```

## Architecture

```
┌─────────────────────────────────────────┐
│  Windows Backend (Node.js)              │
│  - HTTP Client                          │
│  - Sends frames via HTTP                │
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

## Performance Notes

- **Per frame:** ~2-3 seconds (same as process pool)
- **Network overhead:** Minimal (frames sent as base64 in JSON)
- **Concurrency:** Limited by WSL service (adjust as needed)
- **Memory:** All in WSL (doesn't use Windows memory)

## Advantages of This Setup

1. **Separation of concerns:** Pose service runs independently
2. **Easier debugging:** Can monitor WSL service separately
3. **Scalability:** Can run multiple pose services on different machines
4. **Stability:** Backend doesn't depend on local Python setup
5. **Development:** Can restart pose service without restarting backend

## Next Steps

1. Verify pose service is running on WSL
2. Update `.env.local` with `POSE_SERVICE_URL`
3. Modify `server.ts` to use HTTP service (or set `USE_HTTP_POSE_SERVICE=true`)
4. Restart backend
5. Test with video upload
