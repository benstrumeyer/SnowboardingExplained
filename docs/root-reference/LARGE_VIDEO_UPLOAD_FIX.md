# Large Video Upload Fix

## Problem

Video uploads were failing for large files (60 FPS, 4 seconds = ~240 frames). The issue was file size limits in the Express.js and multer configuration.

## Root Cause

Two file size limits were too restrictive:

1. **Multer limit**: 500MB (in `server.ts` line ~122)
2. **Express.json() limit**: Default (100KB) - could interfere with form data

## Solution

Updated `SnowboardingExplained/backend/src/server.ts`:

### 1. Increased Multer File Size Limit
```typescript
// Before:
limits: { fileSize: 500 * 1024 * 1024 } // 500MB

// After:
limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
```

### 2. Increased Express Middleware Limits
```typescript
// Before:
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// After:
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

## Why 2GB?

- **60 FPS, 4 seconds** = 240 frames
- **High-quality video** (e.g., ProRes, H.264 high bitrate) can be 500MB-1.5GB
- **2GB limit** provides headroom for future use cases (longer videos, higher FPS)
- **Still safe**: Won't cause memory issues on modern servers

## File Size Estimates

| Format | Bitrate | 4 sec @ 60 FPS | 10 sec @ 60 FPS |
|--------|---------|----------------|-----------------|
| H.264 (low) | 5 Mbps | ~2.5 MB | ~6.25 MB |
| H.264 (medium) | 25 Mbps | ~12.5 MB | ~31 MB |
| H.264 (high) | 100 Mbps | ~50 MB | ~125 MB |
| ProRes 422 | 500 Mbps | ~250 MB | ~625 MB |
| ProRes HQ | 1000 Mbps | ~500 MB | ~1.25 GB |

## Testing

To test with a large video:

```bash
# Upload a 60 FPS, 4-second video
curl -X POST http://localhost:3001/api/upload-video-with-pose \
  -F "video=@large_video.mov" \
  -F "role=rider"
```

Should now succeed without "413 Payload Too Large" errors.

## Related Files

- `SnowboardingExplained/backend/src/server.ts` (lines ~55-60, ~122)
- `SnowboardingExplained/backend/web/src/components/VideoUploadModal.tsx` (frontend timeout: 5 min)

## Notes

- Frontend timeout is 5 minutes (300,000ms), which is sufficient for large uploads on typical connections
- Backend should handle the upload and start processing in background
- Monitor disk space in `/uploads` directory for accumulated videos
