# Test Mesh Rendering Now

## Quick Start (5 minutes)

### 1. Verify Services Are Running
```bash
# Check pose service
curl http://localhost:5000/health

# Check backend
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost:3000
```

All should return 200 OK.

### 2. Clear Old Mesh Data (Optional but Recommended)
The old data had empty mesh vertices/faces. Clear it to avoid confusion:

```bash
# Using MongoDB CLI
mongo -u admin -p password
db.mesh_data.deleteMany({})
db.mesh_frames.deleteMany({})
exit
```

### 3. Upload a Test Video
1. Go to http://localhost:3000
2. Upload a short video (10-30 seconds)
3. Wait for processing to complete

### 4. Check Browser Console (F12)
Look for purple logs showing mesh data:

```
[MESH-UPDATE] 🎬 MESH UPDATE TRIGGERED
[MESH-CREATE] ✅ Detected SyncedFrame format
[MESH-CREATE] SyncedFrame meshData: {
  verticesCount: 6890,    ← Should be ~6,890
  facesCount: 13776       ← Should be ~13,776
}
[MESH-CREATE] ✅✅✅ MESH CREATED SUCCESSFULLY ✅✅✅
```

### 5. Visual Check
- ✅ Mesh appears as human-like shape
- ✅ Proper proportions (head, arms, legs, torso)
- ✅ Smooth surface with lighting
- ❌ Random 4 points = still using old data

## What Changed
- Frames now stored with mesh data at top level
- Frame quality analyzer can properly filter frames
- Filtered frames stored in MongoDB with all properties intact
- Frontend receives correct mesh data

## Troubleshooting

### Mesh Still Shows Random Points
1. Check MongoDB was cleared: `db.mesh_frames.countDocuments({})`
2. Re-upload video
3. Check browser console for error messages

### No Mesh Data in Console
1. Check backend logs for errors
2. Verify pose service is running: `curl http://localhost:5000/health`
3. Check MongoDB connection: `mongo -u admin -p password`

### Mesh Rendering Errors
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed API calls
4. Verify `/api/mesh-data/:videoId` returns data with vertices and faces

## Success Criteria
✅ Mesh renders as human-like shape
✅ Browser console shows ~6,890 vertices and ~13,776 faces
✅ Frame quality filtering applied (check MongoDB for qualityStats)
✅ Smooth motion with proper proportions

## Next: Advanced Testing
Once basic rendering works:
1. Test with different video lengths
2. Test with different video qualities
3. Verify frame quality filtering statistics
4. Test mesh comparison between rider and reference
