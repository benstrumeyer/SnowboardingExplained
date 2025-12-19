# Debug Setup - Visual Frame Debugging for React Native

## Overview

We've added comprehensive logging and a visual frame debugger similar to Playwright's web debugging. This allows you to:

1. **See detailed logs** from the pose service (HMR2/ViTDet)
2. **Capture frames** from the mobile app
3. **View frames visually** in a web-based debugger
4. **Inspect metadata** for each frame (keypoints, mesh data, etc.)

## Components Added

### 1. Enhanced Logging in Pose Service

**File**: `backend/pose-service/hybrid_pose_detector.py`

Added comprehensive logging at every step:
- Image decoding
- HMR2 model loading
- ViTDet detection
- Mesh vertex extraction
- Face extraction
- Keypoint projection

**Log Output**:
```
[2025-12-19 01:18:30] [INFO] === DETECT_POSE START (frame 0) ===
[2025-12-19 01:18:30] [INFO] Image decoded: 1920x1080
[2025-12-19 01:18:30] [INFO] Running HMR2 detection...
[2025-12-19 01:18:30] [INFO] ✓ HMR2 result: 6890 vertices
[2025-12-19 01:18:30] [INFO] ✓ Mesh vertices: (6890, 3)
[2025-12-19 01:18:30] [INFO] ✓ Mesh faces: (13776, 3)
```

### 2. Debug Frame Capture

**Files**:
- `backend/mcp-server/src/tools/debugFrames.ts` - MCP tools for frame management
- `backend/api/debug-frames.ts` - API endpoints

**MCP Tools**:
- `saveDebugFrame` - Save frame with metadata
- `listDebugFrames` - List all captured frames
- `getDebugFrame` - Get specific frame
- `clearDebugFrames` - Clear all frames

**API Endpoints**:
- `GET /api/debug/frames` - List frames
- `GET /api/debug/frame/:frameNumber` - Get frame data
- `GET /api/debug/frame/:frameNumber/image` - Get frame image
- `DELETE /api/debug/frames` - Clear all frames

### 3. Visual Frame Debugger

**File**: `.debug-frames/viewer.html`

Web-based viewer with:
- Grid view of all captured frames
- Click to view full frame
- Metadata inspection
- Auto-refresh every 2 seconds
- Clear all frames button

**Access**: `http://localhost:3001/debug-frames`

## How to Use

### 1. Start All Services

```bash
# Terminal 1: WSL Pose Service
source venv/bin/activate && python app.py

# Terminal 2: Backend API
npm run dev

# Terminal 3: Mobile App
npm start -- -c --tunnel
```

### 2. Open Debug Viewer

Open in browser: `http://localhost:3001/debug-frames`

### 3. Test with Mobile App

1. Scan QR code on mobile
2. Upload a video
3. Watch frames appear in the debug viewer in real-time

### 4. Check Logs

**Pose Service Logs** (in WSL terminal):
```
[POSE] Frame 0: 3D=yes, keypoints=23, mesh_vertices=6890, time=245ms
```

**Backend Logs** (in backend terminal):
```
2025-12-19 01:18:30 [info]: Frame analysis complete
```

## Debugging Workflow

### Issue: No Mesh Vertices

1. **Check Pose Service Logs**
   - Look for `✓ Mesh vertices:` message
   - If missing, HMR2 failed to load

2. **Check Debug Viewer**
   - Open `http://localhost:3001/debug-frames`
   - Click on frame to see metadata
   - Check `mesh_vertices_data` field

3. **Check Backend Logs**
   - Look for errors in frame processing
   - Check if pose service is reachable

### Issue: Wrong Mesh Position

1. **Inspect Frame Metadata**
   - Camera translation: `camera_translation`
   - Box center: `box_center`
   - Box size: `box_size`

2. **Check Keypoint Projection**
   - Look at `keypoints` array
   - Check if x, y coordinates are in image bounds

3. **Verify ViTDet Detection**
   - Check pose service logs for detection confidence
   - Look for `ViTDet detected X person(s)` message

## MCP Tools Usage

### Save Frame from Mobile App

```typescript
// In mobile app code
const response = await fetch('http://localhost:3001/api/debug/frame', {
  method: 'POST',
  body: JSON.stringify({
    frameData: base64ImageData,
    frameNumber: 0,
    metadata: {
      keypoints: 23,
      meshVertices: 6890,
      timestamp: Date.now()
    }
  })
});
```

### List Frames via MCP

```
Use the listDebugFrames tool to get all captured frames
```

### Get Specific Frame via MCP

```
Use the getDebugFrame tool with frameNumber parameter
```

## Performance Tips

1. **Reduce Frame Capture**
   - Only capture key frames (every 5th frame)
   - Reduces disk usage

2. **Clear Old Frames**
   - Use `clearDebugFrames` tool regularly
   - Or click "Clear All" in viewer

3. **Monitor Disk Space**
   - Each frame ~100-500KB
   - 100 frames = 10-50MB

## Troubleshooting

### Viewer Shows "No debug frames captured yet"

1. Check if mobile app is sending frames
2. Verify backend is running
3. Check browser console for errors

### Frames Not Updating

1. Check if auto-refresh is working (should refresh every 2s)
2. Manually click "Refresh" button
3. Check backend logs for errors

### Mesh Data Missing

1. Check pose service logs for HMR2 errors
2. Verify ViTDet detection is working
3. Check if SMPL faces are being extracted

## Next Steps

1. **Integrate Frame Capture into Mobile App**
   - Add frame capture on video upload
   - Send frames to debug API

2. **Add Visualization Overlay**
   - Draw keypoints on frames
   - Draw mesh wireframe
   - Show camera translation

3. **Create Comparison View**
   - Compare frames side-by-side
   - Show before/after mesh projection

4. **Export Debug Data**
   - Export frames as video
   - Export metadata as JSON
   - Create debug report

## References

- Pose Service: `backend/pose-service/hybrid_pose_detector.py`
- Debug Tools: `backend/mcp-server/src/tools/debugFrames.ts`
- API Endpoints: `backend/src/server.ts` (search for `/api/debug`)
- Viewer: `.debug-frames/viewer.html`
