# Mesh Rendering Test Guide - Fresh Data

## Status
✅ **All services running**
✅ **MongoDB cleared and ready for fresh data**
✅ **Backend code fixed with correct mesh data storage**

## What Was Fixed
The backend was storing mesh data incorrectly. The fix ensures:
- ✅ `mesh_vertices_data` and `mesh_faces_data` are stored at the top level (not nested under `skeleton`)
- ✅ Frames pass through the frame quality analyzer
- ✅ Filtered frames are stored with mesh data intact
- ✅ Frontend receives correct mesh data with ~6,890 vertices and ~13,776 faces

## Current Services Status

### Running Services
1. **Pose Service** (WSL Ubuntu) - ProcessId: 16
   - Running on: `http://localhost:5000`
   - Status: ✅ Active

2. **Backend** - ProcessId: 17
   - Running on: `http://localhost:3001`
   - Status: ✅ Active

3. **Frontend** - ProcessId: 18
   - Running on: `http://localhost:5173`
   - Status: ✅ Active

4. **ngrok Tunnel** - ProcessId: 19
   - Tunnel URL: Check ngrok terminal for current URL
   - Status: ✅ Active

5. **Docker Services**
   - Redis: `localhost:6379` ✅
   - MongoDB: `localhost:27017` ✅

## Testing Steps

### Step 1: Open the Frontend
Navigate to: `http://localhost:5173`

You should see the main application interface with:
- Video upload area
- Model selection (Rider/Coach)
- Mesh viewer panel

### Step 2: Upload a Test Video
1. Click the upload button
2. Select a short video file (30-60 seconds recommended for quick testing)
3. Choose role: **Rider** or **Coach**
4. Click upload

**Expected behavior:**
- Video uploads and processes
- Backend extracts frames
- Pose service processes each frame
- Mesh data is generated and stored in MongoDB

### Step 3: Monitor Backend Logs
Watch the backend terminal (ProcessId: 17) for logs:

```
[UPLOAD] ========================================
[UPLOAD] Generated videoId: v_1234567890_1
[UPLOAD] Role: rider
[UPLOAD] Starting pose extraction for X frames
[UPLOAD] ✓ poolManager is initialized, submitting X frames to process pool
[UPLOAD] Successfully processed X/X frames with pose data
[UPLOAD] Connecting to MongoDB...
[UPLOAD] ✓ Connected to MongoDB
[UPLOAD] About to save mesh data for v_1234567890_1
[MESH-SERVICE] ========== SAVE MESH DATA START ==========
[MESH-SERVICE] 💾 SAVING X frames for videoId: v_1234567890_1
[MESH-SERVICE] ✅ Successfully inserted X frames
[MESH-SERVICE] ========== SAVE MESH DATA COMPLETE ==========
```

### Step 4: Check Browser Console
Open browser DevTools (F12) and go to Console tab.

**Look for logs like:**
```
[MESH-UPDATE] 🎬 MESH UPDATE TRIGGERED
[MESH-UPDATE] ✅ Detected SyncedFrame format
[MESH-UPDATE] SyncedFrame meshData:
  verticesCount: 6890
  facesCount: 13776
[MESH-CREATE] 📊 Extracted data:
  verticesLength: 6890
  facesLength: 13776
[MESH-CREATE] ✅✅✅ MESH CREATED SUCCESSFULLY ✅✅✅
```

### Step 5: Verify Mesh Rendering
In the frontend:
1. Select the uploaded video from the list
2. Enable "Show Rider" or "Show Coach" toggle
3. Look at the 3D mesh viewer panel

**Expected result:**
- A human-like mesh shape appears on the 3D grid
- The mesh has proper proportions (head, torso, arms, legs)
- The mesh is colored (red for rider, cyan for reference)
- You can rotate the view by dragging the mouse
- You can zoom with the mouse wheel

## Troubleshooting

### Issue: Empty vertices/faces arrays in console
**Cause:** Old data in MongoDB or frames not being processed correctly

**Solution:**
1. Check backend logs for frame processing errors
2. Verify pose service is responding correctly
3. Clear MongoDB again: `node backend/clear-mesh-data.js`
4. Re-upload the video

### Issue: Mesh doesn't appear
**Cause:** Frame quality filtering removed all frames or mesh data is empty

**Solution:**
1. Check browser console for error messages
2. Check backend logs for frame quality filtering stats
3. Try uploading a different video with clearer pose data
4. Verify pose service is working: `curl http://localhost:5000/health`

### Issue: Pose service errors
**Cause:** Python environment or model loading issues

**Solution:**
1. Check WSL terminal (ProcessId: 16) for error messages
2. Verify Python environment is activated
3. Check if models are downloaded
4. Restart pose service if needed

### Issue: MongoDB connection errors
**Cause:** MongoDB container not running or connection string incorrect

**Solution:**
1. Verify MongoDB is running: `docker ps | grep mongo`
2. Check connection string in `.env.local`
3. Restart MongoDB: `docker restart snowboard-mongo`

## Expected Data Flow

```
Video Upload
    ↓
Frame Extraction (FrameExtractionService)
    ↓
Pose Detection (ProcessPoolManager → Python Service)
    ↓
Frame Quality Analysis (FrameQualityAnalyzer)
    ↓
Frame Filtering & Interpolation (FrameFilterService)
    ↓
MongoDB Storage (meshDataService.saveMeshData)
    ↓
Frontend Retrieval (GET /api/mesh-data/:videoId)
    ↓
Data Transformation (SyncedFrame format)
    ↓
Mesh Rendering (MeshViewer component)
    ↓
3D Visualization (Three.js)
```

## Key Metrics to Verify

After uploading a video, check:

1. **Frame Count**
   - Original frames extracted: X
   - Frames after quality filtering: Y
   - Removal percentage: (X-Y)/X * 100%

2. **Mesh Data**
   - Vertices per frame: ~6,890
   - Faces per frame: ~13,776
   - Keypoints per frame: 33 (MediaPipe)

3. **Performance**
   - Frame processing time: < 100ms per frame
   - Total upload time: < 5 minutes for 300 frames
   - Mesh rendering: 60 FPS

## Next Steps After Successful Test

1. **Test with Multiple Videos**
   - Upload rider and coach videos
   - Compare side-by-side rendering

2. **Test Frame Synchronization**
   - Verify frame offset controls work
   - Check playback sync between videos

3. **Test Mesh Comparison**
   - Enable overlay mode
   - Verify mesh alignment and comparison

4. **Performance Testing**
   - Upload longer videos (5-10 minutes)
   - Monitor memory usage
   - Check frame processing speed

## Support

If you encounter issues:
1. Check the backend logs (ProcessId: 17)
2. Check the browser console (F12)
3. Check the pose service logs (ProcessId: 16)
4. Review the error messages and timestamps
5. Refer to the troubleshooting section above

---

**Last Updated:** December 27, 2025
**Status:** Ready for testing with fresh MongoDB data
