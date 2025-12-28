# Quick Reference - Video Upload Integration

## Start Services

```bash
# Terminal 1: Flask wrapper
wsl -d Ubuntu bash -c "cd /home/ben/pose-service && source venv/bin/activate && python -B flask_wrapper_minimal_safe.py"

# Terminal 2: Backend
cd SnowboardingExplained/backend && npm run dev

# Terminal 3: Frontend
cd SnowboardingExplained/backend/web && npm run dev
```

## Endpoints

### Direct Upload (small videos)
```
POST /api/pose/video
Content-Type: multipart/form-data
Body: video=<file>

Response: { status: 'completed', videoPath, message }
```

### Chunked Upload (large videos)
```
POST /api/upload-chunk
Body: chunk, sessionId, chunkIndex, totalChunks

POST /api/finalize-upload
Body: { role, sessionId, filename, filesize }

Response: { videoId, ... }
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/api/pose-video.ts` | Direct upload endpoint |
| `backend/src/server.ts` | Router mounting |
| `backend/web/src/components/VideoUploadModal.tsx` | Upload UI |
| `run-track.sh` | Bash script for track.py |
| `run-track.ps1` | PowerShell wrapper |

## Logs to Watch

```
[POSE-API] Processing video: ...
[POSE-API] Converting Windows path to WSL path...
[POSE-API] WSL path: /mnt/c/...
[POSE-API] Running track.py...
[TRACK.PY] ... (track.py output)
[POSE-API] ✓ track.py completed successfully
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "No video file provided" | Check multipart form data, field name must be 'video' |
| "Failed to convert path" | Check WSL is running: `wsl --list --verbose` |
| "Tracking failed" | Check Flask wrapper is running: `curl http://localhost:5000/health` |
| Timeout | Video too large or complex, increase timeout in code |
| MongoDB not storing | Check MongoDB is running: `mongosh` |

## Performance

- **Small videos** (< 100MB): ~1-2 minutes
- **Large videos** (> 1GB): ~5-10 minutes
- **GPU memory**: Requires 8GB+ VRAM
- **Streaming mode**: Prevents OOM on large videos

## Testing

```bash
# Quick test
curl -X POST http://localhost:3001/api/pose/video \
  -F "video=@test-video.mp4" \
  -v

# Check MongoDB
mongosh
use snowboarding_explained
db.videos.findOne()
```

## Architecture

```
Upload → Chunks → Assemble → Flask → track.py → MongoDB → Frontend
```

## Status

✓ Integration complete
✓ Code compiles
✓ Ready for testing
✓ Documentation complete

See `POSE_VIDEO_INTEGRATION_COMPLETE.md` for full details.
