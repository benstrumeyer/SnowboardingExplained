# Mesh Playback Sync and Recognition Issues - Diagnosis

## Problems Reported
1. **Mesh is late compared to video** - Arms snap with delay
2. **Mesh only completes 360° rotation** - Should complete full motion
3. **Sync issues** - Mesh and video are not synchronized
4. **Recognition problems** - Pose detection may be missing frames or misaligning

## Root Causes Identified

### Issue 1: Hardcoded FPS (30) vs Actual Video FPS
**Problem**: The system assumes all videos are 30 FPS, but your 720p video may have a different frame rate (24, 60, etc.)

**Impact**: 
- If video is 60 FPS but system thinks it's 30 FPS, mesh will play at half speed (LATE)
- If video is 24 FPS but system thinks it's 30 FPS, mesh will play too fast
- Frame index calculations will be wrong: `frameIndex = floor(videoTime * fps)`

**Current Code**:
```typescript
// playbackSyncService.ts - Line 21
this.fps = config.fps || 30;  // HARDCODED!

// PoseOverlayViewer.tsx - Line 280
const fps = 30; // HARDCODED!

// VideoDisplay.tsx - Line 13
fps = 30,  // HARDCODED!
```

### Issue 2: FPS Not Being Passed from Backend
**Problem**: Backend extracts video FPS but doesn't reliably pass it to frontend

**Current Flow**:
1. Backend extracts video and detects FPS
2. Backend stores FPS in MongoDB (meshData.fps)
3. Frontend fetches meshData but may not use the FPS value
4. Frontend defaults to hardcoded 30 FPS

**Missing**: Frontend needs to read `meshData.fps` and use it for all frame calculations

### Issue 3: Frame Rate Mismatch in Playback Sync
**Problem**: Video element's `timeupdate` event fires at video's native FPS, but frame calculation uses hardcoded FPS

**Example**:
- Video is 60 FPS, plays at 60 FPS
- `timeupdate` fires 60 times per second
- But frame calculation: `frameIndex = floor(videoTime * 30)` uses 30 FPS
- Result: Frame index advances too slowly, mesh lags behind

### Issue 4: Incomplete Motion (360° instead of full rotation)
**Problem**: Could be caused by:
1. Frame filtering removing too many frames (already partially fixed)
2. Pose recognition missing frames or keypoints
3. Mesh interpolation not working correctly
4. Frame count mismatch between video and mesh

## Solution Strategy

### Step 1: Detect and Use Actual Video FPS
- Extract FPS from video metadata during upload
- Store FPS in MongoDB with mesh data
- Pass FPS to frontend in API response
- Use actual FPS for all frame calculations

### Step 2: Fix Playback Sync Service
- Read FPS from mesh data
- Use actual FPS in frame index calculation
- Ensure video element drives timing (already done)
- Validate frame index stays within bounds

### Step 3: Validate Frame Alignment
- Ensure mesh frame count matches video frame count
- Check that frame indices are sequential
- Verify timestamps are correct
- Log frame rate mismatches

### Step 4: Debug Pose Recognition
- Check if pose service is detecting all frames
- Verify keypoint confidence levels
- Check if frames are being filtered out incorrectly
- Validate mesh data completeness

## Testing Checklist
- [ ] Upload 720p video and check detected FPS
- [ ] Verify FPS is passed to frontend
- [ ] Check mesh playback timing (should match video exactly)
- [ ] Verify mesh completes full motion
- [ ] Check frame count: video frames = mesh frames
- [ ] Validate no frames are being skipped
- [ ] Test with different video frame rates (24, 30, 60 FPS)

## Files to Modify
1. `playbackSyncService.ts` - Use actual FPS instead of hardcoded 30
2. `PoseOverlayViewer.tsx` - Pass FPS from mesh data to sync service
3. `VideoDisplay.tsx` - Use actual FPS for frame calculations
4. `meshDataService.ts` (frontend) - Extract and pass FPS
5. Backend video extraction - Ensure FPS is correctly detected and stored
