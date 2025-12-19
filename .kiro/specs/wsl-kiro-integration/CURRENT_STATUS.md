# Current Status - WSL Pose Service Integration

**Date**: December 19, 2025  
**Status**: ✅ CRITICAL FIX APPLIED - Ready for Testing

## What Was Fixed

### The Problem
The backend was trying to connect to `http://localhost:5000` for the pose service, but the pose service is running on WSL at `http://172.24.183.130:5000`. The `.env.local` file had an old ngrok URL that wasn't working.

### The Solution
Updated `backend/.env.local`:
```
POSE_SERVICE_URL=http://172.24.183.130:5000
```

This allows the backend to properly communicate with the HMR2/ViTDet pose detector running on WSL.

## Current System Status

### Running Services
1. **WSL Terminal** (Terminal 1)
   - Pose Service: `http://172.24.183.130:5000`
   - Status: ✅ Running
   - Model: HMR2/ViTDet hybrid detector
   - Capabilities: 3D pose estimation, mesh vertices, joint angles

2. **Backend API** (Process 41)
   - URL: `http://localhost:3001`
   - Status: ✅ Running
   - Key endpoints:
     - `POST /api/video/upload` - Upload video for analysis
     - `POST /api/video/analyze-4d` - Analyze with 4D-Humans
     - `GET /api/debug/frames` - List debug frames
     - `GET /debug-frames` - Visual frame debugger

3. **Mobile App** (Process 39)
   - Status: ✅ Running
   - Tunnel: Expo tunnel active for QR code scanning

## Debug Frame System

### How It Works
1. When a video is uploaded to `/api/video/analyze-4d`, frames are extracted
2. Each frame is sent to the pose service at `http://172.24.183.130:5000/pose/hybrid`
3. The pose service returns:
   - 24 SMPL joint keypoints (3D positions)
   - Mesh vertices and faces
   - Joint angles
   - Visualization with skeleton overlay
4. Frames are optionally saved to `.debug-frames/` directory
5. Visual debugger at `http://localhost:3001/debug-frames` displays captured frames

### Test Frame
A test frame exists at `.debug-frames/frame-test-1/metadata.json` with sample metadata.

## Next Steps

### 1. Test the Connection
The backend should now successfully connect to the pose service. To verify:
- Upload a video to the backend
- Check if keypoints are detected (should be > 0)
- Verify mesh data is returned

### 2. Capture Real Debug Frames
When uploading a video:
- Frames should be captured with pose data
- Visualizations should show skeleton overlay
- Mesh should be rendered on top of video frames

### 3. Use the Visual Debugger
- Open `http://localhost:3001/debug-frames` in browser
- Should see captured frames in a grid
- Click frames to view detailed metadata and visualization

## Key Files Modified

- `backend/.env.local` - Updated POSE_SERVICE_URL to WSL IP
- `backend/src/server.ts` - Debug endpoints already implemented
- `.debug-frames/viewer.html` - Visual frame debugger UI
- `backend/pose-service/hybrid_pose_detector.py` - Comprehensive logging added

## Troubleshooting

### If keypoints are still 0:
1. Verify WSL pose service is running: Check first terminal
2. Verify backend can reach WSL: Check backend logs for connection errors
3. Check pose service logs for errors processing frames

### If debug frames aren't saving:
1. Ensure `.debug-frames/` directory exists
2. Check backend logs for file write errors
3. Verify frame capture is enabled in video upload

### If viewer doesn't load:
1. Verify backend is running on port 3001
2. Check browser console for JavaScript errors
3. Ensure `.debug-frames/viewer.html` exists

## Commands to Run

### Start Everything (in separate terminals):
```bash
# Terminal 1 (WSL) - Already running
# Pose service at http://172.24.183.130:5000

# Terminal 2 (Windows) - Backend
cd backend
npm run dev

# Terminal 3 (Windows) - Mobile
cd backend/mobile
npm start -- -c --tunnel
```

### Test Endpoints
```bash
# Health check
curl http://localhost:3001/api/health

# Pose service health
curl http://localhost:3001/api/pose-service/health

# List debug frames
curl http://localhost:3001/api/debug/frames

# View debugger
# Open in browser: http://localhost:3001/debug-frames
```

## Expected Behavior After Fix

When you upload a video:
1. Backend extracts frames
2. Backend sends frames to pose service at `http://172.24.183.130:5000/pose/hybrid`
3. Pose service returns keypoints, mesh data, and visualization
4. Backend returns analysis with:
   - `keypointCount > 0` (should be 24 for SMPL)
   - `has3d: true`
   - `meshVertices: 6890`
   - `meshFaces: 13776`
   - Visualization with skeleton overlay

## What Was Previously Done

- ✅ Fixed TypeScript compilation errors in MCP tools
- ✅ Set up WSL integration for pose service
- ✅ Created debug frame capture infrastructure
- ✅ Built visual frame debugger UI
- ✅ Added comprehensive logging to pose detector
- ✅ **Fixed POSE_SERVICE_URL to point to WSL IP** ← CRITICAL FIX

## Next Session

When you return, verify:
1. Backend is still running and connected to pose service
2. Upload a test video and check for keypoints
3. Verify debug frames are being captured
4. Test the visual debugger at `http://localhost:3001/debug-frames`
