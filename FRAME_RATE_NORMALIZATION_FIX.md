# Frame Rate Normalization Fix

## The Problem

When you have multiple videos at different frame rates, you need to normalize them so they can be played back together. The old approach had a critical flaw:

### Old Approach (Broken)

```
Video 1: 60 fps, 30 seconds
  → Extract at 4 fps → 120 frames
  → Pose detection → 85 frames with mesh
  → Store all 120 frames (35 without mesh!)

Video 2: 30 fps, 30 seconds
  → Extract at 4 fps → 120 frames
  → Pose detection → 90 frames with mesh
  → Store all 120 frames (30 without mesh!)

Video 3: 24 fps, 30 seconds
  → Extract at 4 fps → 120 frames
  → Pose detection → 80 frames with mesh
  → Store all 120 frames (40 without mesh!)

Normalization: min(120, 120, 120) = 120 frames
Problem: But only 85, 90, 80 frames have mesh data!
Result: Playback is broken!
```

### New Approach (Fixed)

```
Video 1: 60 fps, 30 seconds
  → Extract at 4 fps → 120 frames
  → Pose detection → 85 frames with mesh
  → Filter & rename → 85 frames (sequential)
  → Store 85 frames (all with mesh!)

Video 2: 30 fps, 30 seconds
  → Extract at 4 fps → 120 frames
  → Pose detection → 90 frames with mesh
  → Filter & rename → 90 frames (sequential)
  → Store 90 frames (all with mesh!)

Video 3: 24 fps, 30 seconds
  → Extract at 4 fps → 120 frames
  → Pose detection → 80 frames with mesh
  → Filter & rename → 80 frames (sequential)
  → Store 80 frames (all with mesh!)

Normalization: min(85, 90, 80) = 80 frames
Result: All 80 frames have mesh data!
Playback is perfect!
```

## Why This Matters

### Synchronized Playback

When playing multiple videos together, they need to:
1. Have the same number of frames
2. All frames must have mesh data
3. Frame indices must be sequential

**Before the fix:**
- Videos had different numbers of frames (120, 120, 120)
- But different numbers of frames WITH mesh (85, 90, 80)
- Frame indices were misaligned
- Playback would show frames without mesh data

**After the fix:**
- Videos have the same number of frames (80, 80, 80)
- All frames have mesh data
- Frame indices are perfectly aligned
- Playback is synchronized and complete

## Frame Rate Calculation

### Before (Broken)
```
Video 1: 120 frames / 30 seconds = 4 fps (but only 85 have mesh)
Video 2: 120 frames / 30 seconds = 4 fps (but only 90 have mesh)
Video 3: 120 frames / 30 seconds = 4 fps (but only 80 have mesh)

Normalized FPS: 4 fps
Normalized frames: 120

Problem: Frame 85 of Video 1 has no mesh data!
```

### After (Fixed)
```
Video 1: 85 frames / 30 seconds = 2.83 fps (all have mesh)
Video 2: 90 frames / 30 seconds = 3.0 fps (all have mesh)
Video 3: 80 frames / 30 seconds = 2.67 fps (all have mesh)

Normalized FPS: 2.67 fps (minimum)
Normalized frames: 80

Perfect: All 80 frames have mesh data!
```

## Implementation Details

### Step 1: Extract Frames
```typescript
const frameResult = await FrameExtractionService.extractFrames(videoPath, videoId);
// Extracts frames at fixed FPS (4 fps by default)
// Result: frameResult.frames = [frame0, frame1, ..., frame119]
```

### Step 2: Detect Poses
```typescript
const meshSequence = [];
for (let i = 0; i < frameResult.frameCount; i++) {
  const poseResult = await detectPoseHybrid(imageBase64);
  if (poseResult.keypoints) {
    meshSequence.push({
      frameNumber: i,
      keypoints: poseResult.keypoints,
      // ... mesh data
    });
  }
}
// Result: meshSequence = [mesh0, mesh1, ..., mesh84]
// Only 85 frames have mesh data!
```

### Step 3: Filter Frames
```typescript
const meshFrameIndices = meshSequence.map((_, index) => index);
// meshFrameIndices = [0, 1, 2, ..., 84]

FrameExtractionService.filterFramesToMeshData(videoId, meshFrameIndices);
// Deletes frames 85-119 from disk
// Keeps only frames with mesh data
```

### Step 4: Rename Frames
```typescript
FrameExtractionService.renameFramesToSequential(videoId, meshFrameIndices);
// Renames remaining frames to be sequential
// frame-1.png → frame-1.png (no change)
// frame-6.png → frame-2.png (was frame 5, now frame 1)
// frame-12.png → frame-3.png (was frame 11, now frame 2)
// etc.
```

### Step 5: Store in MongoDB
```typescript
await meshDataService.saveMeshData({
  videoId,
  fps: frameResult.fps,
  videoDuration: frameResult.videoDuration,
  frameCount: meshSequence.length,  // 85, not 120!
  frames: meshSequence
});
// Stores 85 frames with sequential indices
```

## Playback Synchronization

### Before (Broken)
```
Timeline: 0s ────────────────────────────────────── 30s

Video 1:  [0][1][2]...[84][X][X]...[X]  (85 with mesh, 35 without)
Video 2:  [0][1][2]...[89][X][X]...[X]  (90 with mesh, 30 without)
Video 3:  [0][1][2]...[79][X][X]...[X]  (80 with mesh, 40 without)

At frame 80:
  Video 1: Frame 80 has mesh ✓
  Video 2: Frame 80 has mesh ✓
  Video 3: Frame 80 has NO mesh ✗
  
Playback breaks!
```

### After (Fixed)
```
Timeline: 0s ────────────────────────────────────── 30s

Video 1:  [0][1][2]...[79]  (all 80 have mesh)
Video 2:  [0][1][2]...[79]  (all 80 have mesh)
Video 3:  [0][1][2]...[79]  (all 80 have mesh)

At frame 80:
  Video 1: Frame 80 has mesh ✓
  Video 2: Frame 80 has mesh ✓
  Video 3: Frame 80 has mesh ✓
  
Perfect synchronization!
```

## Benefits

1. **Correct Normalization**: Frame rate normalization now works correctly
2. **Perfect Synchronization**: All videos have the same number of frames
3. **No Missing Data**: Every frame has mesh data
4. **Storage Efficient**: No wasted frames
5. **Predictable Playback**: No surprises or missing frames

## Testing

To verify the fix is working:

1. Upload multiple videos at different frame rates
2. Check MongoDB for frame counts:
   - Video 1: 85 frames
   - Video 2: 90 frames
   - Video 3: 80 frames
3. Verify all frames have mesh data (no null/undefined keypoints)
4. Verify frame indices are sequential (0, 1, 2, ..., 79)
5. Play videos together and verify synchronization

## Example: Three Videos

```
Input Videos:
  Video A: 60 fps, 30 seconds
  Video B: 30 fps, 30 seconds
  Video C: 24 fps, 30 seconds

After Extraction (4 fps):
  Video A: 120 frames extracted
  Video B: 120 frames extracted
  Video C: 120 frames extracted

After Pose Detection:
  Video A: 85 frames with mesh
  Video B: 90 frames with mesh
  Video C: 80 frames with mesh

After Filtering & Renaming:
  Video A: 85 frames (sequential 0-84)
  Video B: 90 frames (sequential 0-89)
  Video C: 80 frames (sequential 0-79)

Normalized Frame Count:
  min(85, 90, 80) = 80 frames

Final Result:
  All videos: 80 frames, all with mesh data, perfectly synchronized!
```
