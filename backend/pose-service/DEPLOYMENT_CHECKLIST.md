# Deployment Checklist

## Pre-Deployment

- [ ] All code changes committed to git
- [ ] No uncommitted changes in working directory
- [ ] All tests passing: `python test_parallel_processing.py`
- [ ] Documentation reviewed and complete

## Code Changes

- [x] `app.py` - Updated to use parallel processor
- [x] `hmr2_loader.py` - Added WSL HMR2 renderer fix
- [x] No breaking changes to existing APIs
- [x] Backward compatible with legacy code

## Testing

- [ ] Health check endpoint works: `curl http://localhost:5000/health`
- [ ] Warmup endpoint works: `curl http://localhost:5000/warmup`
- [ ] Single frame pose detection works: `POST /pose/hybrid`
- [ ] Synchronous video processing works: `POST /process_video`
- [ ] Asynchronous video processing works: `POST /process_video_async`
- [ ] Job status tracking works: `GET /job_status/<job_id>`
- [ ] Download endpoint works: `GET /download/<filename>`

## Performance Verification

- [ ] Pose detection speedup: 3-5x
- [ ] Mesh rendering speedup: 8x
- [ ] Overall speedup: 4-5x
- [ ] No memory leaks in worker pool
- [ ] No hanging processes after completion

## WSL Compatibility

- [ ] HMR2 loads without OpenGL errors
- [ ] Worker pool starts successfully
- [ ] Multiprocessing works with spawn context
- [ ] Mesh rendering gracefully handles failures
- [ ] Original frames returned on rendering failure

## Documentation

- [x] `DEPLOYMENT_READY.md` - Production guide
- [x] `SESSION_SUMMARY.md` - Session summary
- [x] `PARALLEL_PROCESSOR_INTEGRATION.md` - Integration guide
- [x] `INTEGRATION_COMPLETE.md` - Integration status
- [x] `WSL_HMR2_RENDERER_FIX.md` - Renderer fix
- [x] `WSL_MULTIPROCESSING_FIX.md` - Multiprocessing fix
- [x] `LATEST_FIX_SUMMARY.md` - Latest fixes
- [x] `PARALLEL_PROCESSING_GUIDE.md` - Implementation guide

## Configuration

- [ ] `num_workers` set appropriately for target hardware
- [ ] `batch_size` set appropriately for target GPU
- [ ] WSL memory allocation sufficient (8GB+ recommended)
- [ ] WSL CPU allocation sufficient (4+ cores recommended)

## Deployment Steps

1. **Backup Current Code**
   ```bash
   git stash
   git branch backup-$(date +%Y%m%d)
   ```

2. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

3. **Verify Changes**
   ```bash
   git diff HEAD~1
   ```

4. **Run Tests**
   ```bash
   python test_parallel_processing.py
   ```

5. **Start Service**
   ```bash
   python app.py
   ```

6. **Verify Health**
   ```bash
   curl http://localhost:5000/health
   ```

7. **Test Processing**
   ```bash
   curl -X POST -F "video=@test.mp4" \
     -F "num_workers=2" \
     -F "batch_size=4" \
     http://localhost:5000/process_video
   ```

## Rollback Plan

If issues occur:

1. **Stop Service**
   ```bash
   # Kill the process
   pkill -f "python app.py"
   ```

2. **Revert Changes**
   ```bash
   git checkout HEAD~1
   ```

3. **Restart Service**
   ```bash
   python app.py
   ```

4. **Verify Rollback**
   ```bash
   curl http://localhost:5000/health
   ```

## Monitoring

### Health Checks

```bash
# Every 5 minutes
curl http://localhost:5000/health

# Expected response
{
  "status": "ready",
  "models": {
    "hmr2": "loaded",
    "vitdet": "loaded"
  }
}
```

### Performance Metrics

- Track average processing time per video
- Monitor worker pool utilization
- Check for memory leaks
- Monitor GPU utilization

### Error Tracking

- Monitor error logs for exceptions
- Track failed video processing jobs
- Monitor worker crashes
- Track timeout errors

## Post-Deployment

- [ ] Monitor service for 24 hours
- [ ] Verify no memory leaks
- [ ] Verify no hanging processes
- [ ] Collect performance metrics
- [ ] Verify all endpoints working
- [ ] Check error logs for issues
- [ ] Document any issues found
- [ ] Plan optimization if needed

## Success Criteria

✓ Service starts without errors
✓ Health check returns "ready"
✓ Video processing completes successfully
✓ Processing time is 4-5x faster than before
✓ No memory leaks or hanging processes
✓ All endpoints responding correctly
✓ Error handling working as expected
✓ WSL compatibility verified

## Contacts

- **Issues**: Check documentation in pose-service directory
- **Troubleshooting**: See `DEPLOYMENT_READY.md`
- **Performance**: See `PARALLEL_PROCESSING_GUIDE.md`

---

**Deployment Date**: [To be filled]
**Deployed By**: [To be filled]
**Status**: [To be filled]
