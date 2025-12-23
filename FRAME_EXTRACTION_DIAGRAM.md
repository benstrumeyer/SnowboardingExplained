# Frame Extraction Process Diagram

## Old Process (Broken)

```
┌─────────────────────────────────────────────────────────────┐
│ Video File (30 seconds @ 30 fps)                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Extract Frames @ 4 fps                                      │
│ Result: 120 frames (0-119)                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Run Pose Detection on ALL 120 frames                        │
│ Success: 85 frames have mesh data                           │
│ Failed: 35 frames have no mesh data                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Store ALL 120 frames in MongoDB                             │
│ Problem: 35 frames have no mesh data!                       │
│ Problem: Frame indices don't match mesh data!               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend receives 120 frames                                │
│ But only 85 have mesh data                                  │
│ Playback is broken!                                         │
└─────────────────────────────────────────────────────────────┘
```

## New Process (Fixed)

```
┌─────────────────────────────────────────────────────────────┐
│ Video File (30 seconds @ 30 fps)                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Extract Frames @ 4 fps                                      │
│ Result: 120 frames (0-119)                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Run Pose Detection on ALL 120 frames                        │
│ Success: 85 frames have mesh data                           │
│ Failed: 35 frames have no mesh data                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ FILTER: Delete 35 frames without mesh data                  │
│ Keep: 85 frames with mesh data                              │
│ Remaining frames: [0, 5, 12, 18, 25, ...]                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ RENAME: Make frame indices sequential                       │
│ Before: [0, 5, 12, 18, 25, ...]                            │
│ After:  [0, 1, 2,  3,  4,  ...]                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Store 85 frames in MongoDB                                  │
│ All frames have mesh data                                   │
│ Frame indices are sequential                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend receives 85 frames                                 │
│ All have mesh data                                          │
│ Playback is perfect!                                        │
└─────────────────────────────────────────────────────────────┘
```

## Frame Index Alignment

### Before Filtering
```
Extracted Frame Index:  0   1   2   3   4   5   6   7   8   9  10  11  12
Has Mesh Data:          ✓   ✗   ✗   ✓   ✗   ✗   ✓   ✗   ✗   ✓   ✗   ✗   ✓
Mesh Frame Index:       0               1               2               3
                        ↑               ↑               ↑               ↑
                    MISMATCH!      MISMATCH!      MISMATCH!      MISMATCH!
```

### After Filtering & Renaming
```
Extracted Frame Index:  0   1   2   3   4   5   6   7   8   9  10  11  12
Has Mesh Data:          ✓   ✗   ✗   ✓   ✗   ✗   ✓   ✗   ✗   ✓   ✗   ✗   ✓
Filtered Frame Index:   0               1               2               3
Renamed Frame Index:    0               1               2               3
Mesh Frame Index:       0               1               2               3
                        ✓               ✓               ✓               ✓
                    PERFECT MATCH!
```

## Code Flow

```typescript
// 1. Extract frames at fixed FPS
const frameResult = await FrameExtractionService.extractFrames(videoPath, videoId);
// Result: 120 frames extracted

// 2. Run pose detection and build mesh sequence
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
// Result: 85 frames with mesh data

// 3. Save mesh data to MongoDB
await meshDataService.saveMeshData({
  frames: meshSequence  // 85 frames
});

// 4. Filter frames to keep only those with mesh data
const meshFrameIndices = meshSequence.map((_, index) => index);
// meshFrameIndices = [0, 1, 2, ..., 84]
FrameExtractionService.filterFramesToMeshData(videoId, meshFrameIndices);
// Deletes frames 85-119 from disk

// 5. Rename remaining frames to be sequential
FrameExtractionService.renameFramesToSequential(videoId, meshFrameIndices);
// Renames frame-1.png to frame-1.png, frame-6.png to frame-2.png, etc.
```

## Storage Impact

### Before
- 120 frames × 100 KB/frame = 12 MB
- 35 frames without mesh data = 3.5 MB wasted

### After
- 85 frames × 100 KB/frame = 8.5 MB
- 0 frames wasted
- **Savings: 29% storage reduction**

## Frame Rate Normalization

With mesh-aligned frames, frame rate normalization works correctly:

```
Video 1: 30 fps, 85 mesh frames → normalized to 85 frames
Video 2: 60 fps, 85 mesh frames → normalized to 85 frames
Video 3: 24 fps, 85 mesh frames → normalized to 85 frames

All videos now have the same number of frames!
Playback can be synchronized perfectly.
```
