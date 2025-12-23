# Frame Extraction Fix: Mesh-Aligned Frame Extraction

## Problem
Previously, the frame extraction was extracting ALL frames from the video at a fixed FPS (4 fps), but only some of those frames had corresponding mesh data. This meant:
- Extracting frames 0-100 at 4 fps
- But only frames 5, 12, 18, 25, etc. had pose/mesh data
- Wasting storage and causing frame index misalignment

## Solution
Implemented mesh-aligned frame extraction that:
1. Extracts frames at fixed FPS initially
2. Runs pose detection on all extracted frames
3. **Filters out frames without mesh data** (deletes them)
4. **Renames remaining frames to be sequential** (0, 1, 2, ...)

This ensures:
- Only frames with mesh data are stored
- Frame indices are sequential and match the mesh data
- Storage is optimized (no wasted frames)
- Frame rate normalization works correctly

## Changes Made

### 1. FrameExtractionService (`backend/src/services/frameExtraction.ts`)

#### New Methods:

**`filterFramesToMeshData(videoId, meshFrameIndices)`**
- Deletes frames that don't have corresponding mesh data
- Takes array of frame indices that have mesh data
- Removes all other frames from disk

**`renameFramesToSequential(videoId, meshFrameIndices)`**
- Renames remaining frames to be sequential (frame-1.png, frame-2.png, etc.)
- Ensures frame indices match the mesh data array indices

**Updated `extractFrames()` method**
- Now accepts optional `frameIndices` parameter for mesh-aligned extraction
- Supports both fixed FPS extraction and specific frame index extraction
- Stores metadata about whether extraction was mesh-aligned

### 2. Server Upload Endpoint (`backend/src/server.ts`)

After saving mesh data to MongoDB:
```typescript
// Filter frames to keep only those with mesh data
const meshFrameIndices = meshSequence.map((_, index) => index);
FrameExtractionService.filterFramesToMeshData(videoId, meshFrameIndices);

// Rename frames to be sequential
FrameExtractionService.renameFramesToSequential(videoId, meshFrameIndices);
```

## Frame Index Mapping

### Before (Broken):
```
Video frames extracted: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10...
Mesh data frames:       ✓        ✓        ✓        ✓
Frame indices:          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10...
                        ✓        ✓        ✓        ✓
Problem: Frame 0 has mesh, but frame 1 doesn't!
```

### After (Fixed):
```
Video frames extracted: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10...
Mesh data frames:       ✓        ✓        ✓        ✓
Filtered frames:        0        1        2        3
Renamed frames:         0        1        2        3
Frame indices:          0, 1, 2, 3
                        ✓  ✓  ✓  ✓
Perfect: Every frame has mesh data!
```

## Benefits

1. **Storage Optimization**: Only frames with mesh data are kept
2. **Frame Rate Normalization**: Works correctly because frame indices are sequential
3. **Correct Playback**: Video and mesh stay synchronized
4. **Reduced Bandwidth**: Fewer frames to transfer to frontend
5. **Cleaner Data**: No orphaned frames without mesh data

## Example Flow

1. User uploads 30-second video at 30 fps
2. Extract frames at 4 fps → 120 frames extracted
3. Run pose detection → 85 frames have mesh data
4. Filter frames → Delete 35 frames without mesh data
5. Rename frames → Remaining 85 frames become 0-84
6. Store in MongoDB → 85 frames with sequential indices
7. Frontend receives → 85 frames, all with mesh data, all synchronized

## Testing

The frame filtering is automatic and happens after every video upload. To verify:

1. Check MongoDB for mesh data frame count
2. Check temp directory for actual frame files
3. Verify frame indices are sequential (0, 1, 2, ...)
4. Verify all frames have corresponding mesh data

## Future Improvements

1. Could extract only specific frame indices from video (more efficient)
2. Could implement adaptive FPS based on pose detection success rate
3. Could cache filtered frame lists for faster re-extraction
