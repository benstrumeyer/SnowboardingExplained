# Action Items - Mesh Rendering Integration

## Current Situation

✅ **Frame quality filtering is fully integrated** with mesh rendering
✅ **Mesh rendering is simplified and working**
❌ **Mesh appears as random points** because pose service returns dummy data

## What You Need To Do

### Step 1: Verify Pose Service Status (5 minutes)

Run the diagnostic script:
```bash
cd SnowboardingExplained
node diagnose-pose-service.js
```

This will tell you:
- ✅ If pose service is running
- ✅ If models are loaded
- ✅ If mesh data is real or dummy
- ✅ What to do next

### Step 2: Switch to Real HMR2 Service (if needed)

If diagnostic shows dummy mesh data:

**Option A: Use WSL Ubuntu (Recommended)**
```bash
# In a new terminal
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python app.py"
```

**Option B: Use Windows Python**
```bash
cd C:\Users\benja\repos\SnowboardingExplained\backend\pose-service
python app.py
```

**Verify it's running:**
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ready",
  "models": {
    "hmr2": "loaded",
    "vitdet": "loaded"
  }
}
```

### Step 3: Warmup Models (30-60 seconds)

```bash
curl -X POST http://localhost:5000/warmup
```

Wait for response:
```json
{
  "status": "ready",
  "hmr2": { "status": "loaded", "load_time_seconds": 45.2 },
  "vitdet": { "status": "loaded", "load_time_seconds": 52.1 }
}
```

### Step 4: Clear Old Mesh Data

```bash
# Connect to MongoDB
mongo -u admin -p password

# Delete old mesh data
db.mesh_data.deleteMany({})
db.mesh_frames.deleteMany({})

# Verify deletion
db.mesh_data.countDocuments({})  # Should return 0
db.mesh_frames.countDocuments({}) # Should return 0
```

### Step 5: Upload Test Video

1. Go to frontend (http://localhost:3000)
2. Upload a video
3. Wait for processing to complete
4. Check mesh viewer

### Step 6: Verify Mesh Rendering

**In Browser Console (F12):**

Look for purple logs:
```
[MESH-UPDATE] 🎬 MESH UPDATE TRIGGERED
[MESH-CREATE] ✅ Detected SyncedFrame format
[MESH-CREATE] SyncedFrame meshData: {
  verticesCount: 6890,    ← Should be ~6,890
  facesCount: 13776       ← Should be ~13,776
}
[MESH-CREATE] ✅✅✅ MESH CREATED SUCCESSFULLY ✅✅✅
```

**Visual Check:**
- ✅ Mesh appears as human-like shape
- ✅ Proper proportions (head, arms, legs)
- ✅ Smooth surface
- ❌ Random 4 points = still using dummy data

### Step 7: Verify Frame Quality Filtering

**In MongoDB:**
```bash
mongo -u admin -p password

# Check quality statistics
db.mesh_data.findOne({}, { metadata: 1 })

# Should show:
{
  "metadata": {
    "qualityStats": {
      "originalCount": 300,
      "processedCount": 285,
      "removedCount": 15,
      "interpolatedCount": 8,
      "removalPercentage": "5.0%",
      "interpolationPercentage": "2.7%"
    }
  }
}
```

## Troubleshooting

### Problem: Pose Service Won't Start

**Error**: `ModuleNotFoundError: No module named 'torch'`

**Solution**:
```bash
# Activate Python environment
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python app.py"

# Or install dependencies
pip install -r requirements.txt
```

### Problem: Models Won't Load

**Error**: `RuntimeError: CUDA out of memory`

**Solution**:
1. Close other GPU-intensive applications
2. Restart the pose service
3. Call `/warmup` again

### Problem: Mesh Still Shows Random Points

**Cause**: Still using dummy service

**Solution**:
1. Check which pose service is running:
   ```bash
   ps aux | grep python | grep pose
   ```
2. Kill dummy service:
   ```bash
   pkill -f "pose_detector.py"
   ```
3. Start real service:
   ```bash
   wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python app.py"
   ```
4. Clear MongoDB and re-upload video

### Problem: Frame Quality Filtering Not Applied

**Check**: No `qualityStats` in MongoDB

**Solution**:
1. Enable debug logging in `frameQualityConfig.ts`:
   ```typescript
   DEBUG_MODE: true
   ```
2. Check backend logs for filtering errors
3. Verify `FrameQualityAnalyzer` is being called
4. Re-upload video

## Quick Reference

### All Services Running?

```bash
# Check backend
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost:3000

# Check pose service
curl http://localhost:5000/health

# Check MongoDB
mongo -u admin -p password
db.adminCommand("ping")

# Check Redis
redis-cli ping
```

### Restart All Services

```bash
# Kill all processes
pkill -f "npm run dev"
pkill -f "start-backend"
pkill -f "ngrok"
pkill -f "python app.py"

# Start fresh (in separate terminals)
# Terminal 1: Backend
cd C:\Users\benja\repos\SnowboardingExplained
.\start-backend.bat

# Terminal 2: Frontend
cd C:\Users\benja\repos\SnowboardingExplained\backend\web
npm run dev

# Terminal 3: Pose Service
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python app.py"

# Terminal 4: ngrok
cd C:\Program Files\
ngrok http 3001

# Terminal 5: Docker (if needed)
docker run -d -p 6379:6379 redis
docker run -d --name snowboard-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:latest
```

## Expected Results

### After Completing All Steps

1. ✅ Pose service running with real HMR2
2. ✅ Models loaded and ready
3. ✅ Video uploaded successfully
4. ✅ Frame quality filtering applied
5. ✅ Mesh data stored in MongoDB (~6,890 vertices, ~13,776 faces)
6. ✅ Frontend receives correct mesh data
7. ✅ Mesh renders as human-like shape
8. ✅ Quality statistics show filtering results

### Browser Console Should Show

```
[MESH-UPDATE] 🎬 MESH UPDATE TRIGGERED
[MESH-UPDATE] Input state: {
  riderMeshExists: true,
  showRider: true,
  riderMeshType: "SyncedFrame"
}
[MESH-CREATE] ✅ Detected SyncedFrame format
[MESH-CREATE] SyncedFrame meshData: {
  verticesCount: 6890,
  facesCount: 13776,
  verticesType: "object",
  facesType: "object"
}
[MESH-CREATE] ✅ Vertices found, creating geometry
[MESH-CREATE] ✅ Position attribute set
[MESH-CREATE] ✅ Index attribute set
[MESH-CREATE] ✅ Vertex normals computed
[MESH-CREATE] ✅✅✅ MESH CREATED SUCCESSFULLY ✅✅✅
[MESH-UPDATE] ✅ RIDER MESH CREATED
[MESH-UPDATE] ✅ RIDER MESH ADDED TO SCENE
[MESH-UPDATE] 🎬 MESH UPDATE COMPLETE
```

### MongoDB Should Show

```json
{
  "_id": ObjectId("..."),
  "videoId": "v_...",
  "fps": 30,
  "videoDuration": 10.5,
  "frameCount": 285,
  "totalFrames": 285,
  "metadata": {
    "qualityStats": {
      "originalCount": 300,
      "processedCount": 285,
      "removedCount": 15,
      "interpolatedCount": 8,
      "removalPercentage": "5.0%",
      "interpolationPercentage": "2.7%"
    }
  }
}
```

## Success Criteria

✅ **Mesh Rendering Working** when:
1. Mesh appears as human-like shape (not random points)
2. Proper proportions visible (head, arms, legs, torso)
3. Smooth surface with proper lighting
4. Browser console shows 6,890 vertices and 13,776 faces
5. MongoDB shows quality statistics

✅ **Frame Quality Filtering Working** when:
1. MongoDB shows `qualityStats` in metadata
2. `removedCount` > 0 (some frames removed)
3. `interpolatedCount` > 0 (some frames interpolated)
4. `processedCount` < `originalCount` (filtering applied)

## Support

If you get stuck:

1. **Check logs**: Browser console (F12) and backend terminal
2. **Run diagnostic**: `node diagnose-pose-service.js`
3. **Check MongoDB**: `mongo -u admin -p password`
4. **Verify services**: `curl http://localhost:PORT/health`
5. **Review docs**: Read `MESH_RENDERING_VERIFICATION_GUIDE.md`

## Timeline

- **Step 1-2**: 5 minutes (verify/switch pose service)
- **Step 3**: 1 minute (warmup models)
- **Step 4**: 1 minute (clear old data)
- **Step 5**: 2-5 minutes (upload video)
- **Step 6-7**: 2 minutes (verify results)

**Total**: ~15-20 minutes to complete

## Next: Advanced Customization

Once mesh rendering is working, you can:

1. **Adjust frame quality thresholds** in `frameQualityConfig.ts`
2. **Customize mesh colors** in `MeshViewer.tsx`
3. **Add mesh animations** in `MeshViewer.tsx`
4. **Implement mesh comparison** between rider and reference
5. **Add joint angle visualization** (reserved for future)

See `MESH_RENDERING_VERIFICATION_GUIDE.md` for detailed customization options.
