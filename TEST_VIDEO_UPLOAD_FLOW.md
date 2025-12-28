# Test Video Upload Flow

## Prerequisites

1. **Flask wrapper running** on port 5000
   ```bash
   wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python -B flask_wrapper_minimal_safe.py"
   ```

2. **Backend running** on port 3001
   ```bash
   cd SnowboardingExplained/backend
   npm run dev
   ```

3. **Frontend running** on port 5173 (or 3000)
   ```bash
   cd SnowboardingExplained/backend/web
   npm run dev
   ```

## Test 1: Direct Upload via cURL

```bash
# Small test video (< 100MB)
curl -X POST http://localhost:3001/api/pose/video \
  -F "video=@path/to/test-video.mp4" \
  -v
```

Expected response:
```json
{
  "status": "completed",
  "videoPath": "/path/to/uploaded/video.mp4",
  "message": "Video processed successfully"
}
```

## Test 2: Chunked Upload via Web UI

1. Open browser to `http://localhost:5173` (or 3000)
2. Click "Upload Video" button
3. Select a video file (any size)
4. Watch console for:
   - `[CHUNKED-UPLOAD] Starting chunked upload: X chunks`
   - `[CHUNKED-UPLOAD] ✓ Chunk N/X uploaded` (for each chunk)
   - `[UPLOAD] All chunks uploaded, finalizing...`
   - `[FINALIZE] ✓ Video assembled`
   - `[FINALIZE] 🚀 PHASE 3: Calling Flask wrapper /pose/video endpoint`
   - `[FINALIZE] ✓ Flask wrapper returned HTTP 200`

5. Wait for processing to complete (may take several minutes for large videos)

## Test 3: Monitor Backend Logs

Watch the backend console for:

```
[POSE-API] Processing video: /path/to/video.mp4
[POSE-API] Converting Windows path to WSL path...
[POSE-API] WSL path: /mnt/c/Users/.../video.mp4
[POSE-API] Running track.py...
[TRACK.PY] ... (track.py output)
[POSE-API] ✓ track.py completed successfully
```

## Test 4: Verify MongoDB Storage

```bash
# Connect to MongoDB
mongosh

# Check if pose data was stored
use snowboarding_explained
db.videos.findOne({ videoId: "your-video-id" })
```

Expected structure:
```json
{
  "_id": ObjectId(...),
  "videoId": "video-123",
  "role": "rider",
  "meshSequence": [
    {
      "frameNumber": 0,
      "timestamp": 0,
      "keypoints": [...],
      "mesh_vertices_data": [...],
      "mesh_faces_data": [...]
    },
    ...
  ],
  "createdAt": ISODate(...),
  "updatedAt": ISODate(...)
}
```

## Troubleshooting

### Issue: "No video file provided"
**Solution**: Ensure file is being sent as multipart form data with field name 'video'

### Issue: "Failed to convert path"
**Solution**: 
- Check WSL is running: `wsl --list --verbose`
- Verify WSL has wslpath: `wsl which wslpath`

### Issue: "Tracking failed" or timeout
**Solution**:
- Check Flask wrapper is running: `curl http://localhost:5000/health`
- Check track.py logs in WSL
- Verify video file is valid: `ffprobe video.mp4`
- Try smaller video first

### Issue: Chunks not uploading
**Solution**:
- Check backend is running on port 3001
- Check network tab in browser DevTools
- Verify CORS headers are correct
- Try smaller chunk size if needed

### Issue: MongoDB not storing data
**Solution**:
- Check MongoDB is running: `mongosh`
- Check database connection in backend logs
- Verify finalize-upload endpoint is being called

## Performance Notes

- **Small videos** (< 100MB): Use direct upload via `/api/pose/video`
- **Large videos** (> 100MB): Use chunked upload via web UI
- **Processing time**: ~1-2 minutes per minute of video (depends on GPU)
- **Memory**: Ensure 8GB+ GPU VRAM available

## Next Steps After Testing

1. Verify pose visualization displays correctly
2. Test with different video formats (MP4, MOV, WebM)
3. Test with different video resolutions (720p, 1080p, 4K)
4. Monitor performance with large videos
5. Implement progress tracking for long uploads
