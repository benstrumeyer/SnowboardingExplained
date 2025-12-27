# Design: Pose Frame Quality Filtering

## Architecture Overview

The frame quality filtering system operates in **two passes** to balance efficiency with accuracy:

**Pass 1 (Pose Service)**: Detect poses for all frames, return raw data
**Pass 2 (Backend)**: Analyze quality with full context, filter, and interpolate

This approach allows:
- Outlier detection with neighbor context
- Intelligent interpolation across gaps
- Only good frames stored in database
- Efficient frame synchronization

## Data Flow

```
Video Frames (60 FPS)
    ↓
Pose Service (Pass 1)
    └─ Detect pose for each frame
    └─ Return all frames with keypoints
    ↓
Backend (Pass 2)
    ├─ Analyze quality (confidence, boundaries, outliers)
    ├─ Filter low-quality frames
    ├─ Interpolate outliers
    └─ Track frame indices
    ↓
Filtered Frames + Index Mapping (stored in MongoDB)
    ↓
Frontend Retrieval
    └─ Use mapping to sync with original video
```

## Component Design

### 1. Frame Quality Analyzer (Backend - TypeScript)

**Location**: `SnowboardingExplained/backend/src/services/frameQualityAnalyzer.ts`

**Purpose**: Evaluate pose quality with full frame context

**Inputs**:
- Complete frame sequence with keypoints
- Video dimensions (for boundary detection)

**Outputs**:
- Quality score for each frame (0-1)
- Quality flags: `low_confidence`, `off_screen`, `outlier`
- Metadata for debugging

**Algorithm**: Analyzes each frame against motion trends to detect outliers

**Outlier Detection (Trend-Based)**:
- Uses a sliding window of N frames (e.g., 5-7 frames) to establish motion trend
- For each keypoint, fits a line through the positions in the window
- Calculates expected position for current frame based on trend
- If actual position deviates > 30% from expected, marks as outlier
- This ensures smooth motion by detecting frames that break the trajectory

**Example**:
```
Frames: [1, 2, 3, 4, 5]
Trend: Shoulder moving right at ~10px/frame
Frame 4 actual: Shoulder at x=150 (expected x=140 based on trend)
Deviation: 10px / 100px typical motion = 10% → NOT an outlier

Frame 4 actual: Shoulder at x=80 (expected x=140)
Deviation: 60px / 100px = 60% → IS an outlier (breaks smooth motion)
```

### 2. Frame Filter & Interpolator (Backend - TypeScript)

**Location**: `SnowboardingExplained/backend/src/services/frameFilterService.ts`

**Purpose**: Remove bad frames and interpolate outliers

**Inputs**:
- Frame sequence with quality scores
- Quality thresholds

**Outputs**:
- Filtered frame sequence
- Removed and interpolated frame indices

**Algorithm**:
- Remove off-screen frames
- Remove low-confidence frames (or interpolate if gap is small)
- Interpolate outlier frames from neighbors

### 3. Frame Index Mapper (Backend - TypeScript)

**Location**: `SnowboardingExplained/backend/src/services/frameIndexMapper.ts`

**Purpose**: Maintain mapping between original and processed frames

**Inputs**:
- Original frame count
- Removed frame indices
- Interpolated frame indices

**Outputs**:
- Bidirectional mapping for synchronization

## Integration Points

### 1. Pose Service (Python)

```python
# In pose-service/app.py
# Pass 1: Detect poses for all frames
frames_with_poses = []
for frame in video_frames:
    pose = detect_pose(frame)
    frames_with_poses.append({
        'frame_number': frame.number,
        'timestamp': frame.timestamp,
        'keypoints': pose.keypoints,
        'image': frame.image
    })

# Return all frames to backend
return {
    'frames': frames_with_poses,
    'video_dimensions': (width, height),
    'fps': fps
}
```

### 2. Backend (TypeScript)

```typescript
// In meshDataService.saveMeshData()
// Pass 2: Analyze quality with full context
const analyzer = new FrameQualityAnalyzer(videoDimensions);
const qualities = analyzer.analyzeSequence(frames);

// Filter and interpolate
const filterService = new FrameFilterService();
const filtered = filterService.filterAndInterpolate(frames, qualities);

// Create mapping
const mapping = FrameIndexMapper.createMapping(
  videoId,
  frames.length,
  filtered.removedFrames,
  filtered.interpolatedFrames
);

// Store only good frames + mapping
await meshDataService.saveMeshData({
  videoId,
  frames: filtered.frames,
  metadata: {
    frameIndexMapping: FrameIndexMapper.serialize(mapping),
    qualityStats: {
      originalCount: frames.length,
      processedCount: filtered.frames.length,
      removedCount: filtered.removedFrames.length,
      interpolatedCount: filtered.interpolatedFrames.length
    }
  }
});
```

### 3. Frame Retrieval

```typescript
// In meshDataService.getFrame()
const mapping = meshData.metadata.frameIndexMapping;
const processedIndex = mapping.originalToProcessed.get(originalFrameIndex);

if (processedIndex === undefined) {
  // Frame was removed
  return null;
}

const frame = await framesCollection.findOne({
  videoId,
  frameNumber: processedIndex
});
```

## Configuration

**Quality Thresholds** (configurable via environment):

```typescript
const QUALITY_CONFIG = {
  // Confidence filtering
  MIN_CONFIDENCE: 0.6,
  
  // Off-screen detection
  BOUNDARY_THRESHOLD: 0.05,      // 5% of image edge
  OFF_SCREEN_CONFIDENCE: 0.3,
  
  // Outlier detection (trend-based)
  OUTLIER_DEVIATION_THRESHOLD: 0.3, // 30% deviation from trend
  TREND_WINDOW_SIZE: 5,          // Use 5 frames to establish trend
  
  // Interpolation
  MAX_INTERPOLATION_GAP: 10,     // Don't interpolate gaps > 10 frames
  
  // Logging
  DEBUG_MODE: false
};
```

## Performance Considerations

1. **Batch Processing**: Analyze all frames in a batch before filtering
2. **Lazy Interpolation**: Only interpolate when needed (on retrieval)
3. **Caching**: Cache quality scores and mappings in MongoDB metadata
4. **Memory**: Stream large frame sequences to avoid memory overload

## Testing Strategy

1. **Unit Tests**:
   - Frame quality analyzer with various confidence levels
   - Off-screen detection with boundary cases
   - Outlier detection with known deviations
   - Interpolation accuracy

2. **Integration Tests**:
   - Full pipeline with sample videos
   - Frame index mapping correctness
   - Synchronization verification

3. **Visual Tests**:
   - Upload test videos and verify smooth playback
   - Check for jitter elimination
   - Verify off-screen frames are removed

## Rollout Plan

1. **Phase 1**: Implement frame quality analyzer
2. **Phase 2**: Implement frame filter & interpolator
3. **Phase 3**: Implement frame index mapper
4. **Phase 4**: Integrate into mesh data service
5. **Phase 5**: Test with real videos
6. **Phase 6**: Deploy and monitor
