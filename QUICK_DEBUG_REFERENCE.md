# Quick Debug Reference

## TL;DR - What to Look For

After uploading a video, check the backend console for these key indicators:

### ✅ Good Signs
```
[UPLOAD] poolManager check: poolManager=YES
[POOL-MANAGER] processRequest called with 1 frames
[HTTP-WRAPPER] getPoseInfo called with 1 frames
[4D-HUMANS] Got response for frame 0: status 200
[HTTP-WRAPPER] Frame 0 processed successfully
```

### ❌ Bad Signs
```
[UPLOAD] poolManager check: poolManager=NO  ← Pool manager is null!
[UPLOAD] ✗ poolManager is NULL              ← Fallback to sequential processing
[HTTP-WRAPPER] Frame 0 missing imageBase64  ← Frame data is missing
[4D-HUMANS] Error for frame 0: ECONNREFUSED ← Pose service not running
Queue full (max 100 requests)               ← Too many frames queued
```

## Quick Checklist

- [ ] Backend started with `./start-backend.bat`
- [ ] Pose service running in WSL (`python app.py`)
- [ ] `.env.local` has `USE_HTTP_POSE_SERVICE=true`
- [ ] Video uploaded through web UI
- [ ] Console shows `[UPLOAD] poolManager check: poolManager=YES`
- [ ] Console shows `[HTTP-WRAPPER] getPoseInfo called`
- [ ] Console shows `[4D-HUMANS] Got response`
- [ ] Console shows `[UPLOAD] Successfully processed X/X frames`

## Common Issues & Fixes

| Issue | Look For | Fix |
|-------|----------|-----|
| Pool manager null | `poolManager=NO` | Restart backend, check startup logs |
| Pose service not responding | `ECONNREFUSED` | Start WSL pose service |
| Frames not submitted | No `[POOL-MANAGER]` logs | Check frame extraction, check for errors |
| Queue overflow | `Queue full` | Normal for large videos, should auto-recover |
| Missing frame data | `missing imageBase64` | Check frame extraction, check disk space |

## Log Locations

- **Backend console:** Real-time output when running `./start-backend.bat`
- **Backend logs:** `SnowboardingExplained/backend/logs/` (if configured)
- **Pose service logs:** WSL terminal where `python app.py` is running

## Performance Baseline

- **31 frames (213KB):** ~90-100 seconds
- **130 frames (60fps):** ~400-450 seconds
- **Per frame:** ~2-3 seconds for pose detection

## Files Modified

1. `backend/src/services/processPoolManager.ts` - Pool manager debug logs
2. `backend/src/services/poseServiceHttpWrapper.ts` - HTTP wrapper debug logs
3. `backend/src/server.ts` - Upload endpoint debug logs

## Revert Changes

To remove debug logging:
```bash
git checkout SnowboardingExplained/backend/src/services/processPoolManager.ts
git checkout SnowboardingExplained/backend/src/services/poseServiceHttpWrapper.ts
git checkout SnowboardingExplained/backend/src/server.ts
```

## Next Steps

1. Restart backend
2. Upload test video
3. Check console for debug logs
4. Identify where flow breaks
5. Report issue with logs
