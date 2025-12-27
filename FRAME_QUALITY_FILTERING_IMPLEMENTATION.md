# Frame Quality Filtering Implementation Summary

## Overview

Implemented a comprehensive frame quality filtering system that automatically improves pose detection quality by filtering low-confidence frames, detecting off-screen riders, and interpolating outliers for smooth mesh overlay.

## Architecture

**Two-Pass Approach**:
1. **Pass 1 (Pose Service)**: Detects poses for all frames, returns raw data
2. **Pass 2 (Backend)**: Analyzes quality with full context, filters, and interpolates

This design allows outlier detection with neighbor context and intelligent interpolation across gaps.

## Components Implemented

### 1. Frame Quality Analyzer (`frameQualityAnalyzer.ts`)

Evaluates pose quality using trend-based outlier detection with a sliding window approach.

**Key Features**:
- **Confidence Filtering**: Marks frames with average keypoint confidence < 0.6
- **Off-Screen Detection**: 
  - Detects keypoints clustered at image boundaries (within 5% of edges)
  - Marks frames with average confidence < 0.3 as off-screen
- **Trend-Based Outlier Detection**:
  - Uses 5-7 frame sliding window to establish motion trend
  - Fits linear regression through keypoint positions
  - Detects frames deviating > 30% from expected trajectory
  - Ensures smooth motion by catching frames that break trajectory

**Methods**:
- `analyzeFrame()`: Analyze single frame with neighbor context
- `analyzeSequence()`: Batch analyze complete frame sequence

### 2. Frame Filter Service (`frameFilterService.ts`)

Removes low-quality frames and interpolates outliers.

**Key Features**:
- **Low-Confidence Removal**: Removes frames below confidence threshold
- **Off-Screen Removal**: Removes frames where rider is off-screen
- **Consecutive Block Removal**: Removes contiguous sequences of bad frames
- **Outlier Interpolation**: Linear interpolation between good frames
- **Gap Validation**: Only interpolates gaps ≤ 10 frames

**Methods**:
- `filterAndInterpolate()`: Main filtering and interpolation pipeline

**Output**:
- Filtered frame sequence
- Removed frame indices
- Interpolated frame indices
- Frame index mapping

### 3. Frame Index Mapper (`frameIndexMapper.ts`)

Maintains bidirectional mapping between original and processed frame indices for synchronization.

**Key Features**:
- **Bidirectional Mapping**: Original ↔ Processed indices
- **Serialization**: Convert to/from MongoDB storage format
- **Status Checking**: Query if frame was removed or interpolated
- **Statistics**: Calculate retention and removal percentages

**Methods**:
- `createMapping()`: Create mapping from filtering results
- `getProcessedIndex()`: Look up processed index from original
- `getOriginalIndex()`: Look up original index from processed
- `serialize()`: Convert to MongoDB format
- `deserialize()`: Convert from MongoDB format
- `getStatistics()`: Calculate quality statistics

### 4. Configuration (`frameQualityConfig.ts`)

Environment-driven configuration with validation.

**Parameters**:
- `MIN_CONFIDENCE`: 0.6 (minimum average keypoint confidence)
- `BOUNDARY_THRESHOLD`: 0.05 (5% of image edge)
- `OFF_SCREEN_CONFIDENCE`: 0.3 (off-screen detection threshold)
- `OUTLIER_DEVIATION_THRESHOLD`: 0.3 (30% deviation from trend)
- `TREND_WINDOW_SIZE`: 5 (frames for trend analysis)
- `MAX_INTERPOLATION_GAP`: 10 (max frames to interpolate)
- `DEBUG_MODE`: false (enable detailed logging)

All parameters can be overridden via environment variables:
- `FRAME_QUALITY_MIN_CONFIDENCE`
- `FRAME_QUALITY_BOUNDARY_THRESHOLD`
- `FRAME_QUALITY_OFF_SCREEN_CONFIDENCE`
- `FRAME_QUALITY_OUTLIER_DEVIATION_THRESHOLD`
- `FRAME_QUALITY_TREND_WINDOW_SIZE`
- `FRAME_QUALITY_MAX_INTERPOLATION_GAP`
- `FRAME_QUALITY_DEBUG_MODE`

### 5. Mesh Data Service Integration (`meshDataService.ts`)

Integrated frame quality filtering into the mesh data save pipeline.

**Changes**:
- Added `applyFrameQualityFiltering()` private method
- Updated `saveMeshData()` to apply filtering before saving
- Updated `getFrame()` to use frame index mapping
- Updated `getFrameRange()` to use frame index mapping
- Store frame index mapping in metadata
- Store quality statistics in metadata

**Metadata Storage**:
```typescript
metadata: {
  frameIndexMapping: SerializedFrameIndexMapping,
  qualityStats: {
    originalCount: number,
    processedCount: number,
    removedCount: number,
    interpolatedCount: number,
    removalPercentage: string,
    interpolationPercentage: string
  }
}
```

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

## Algorithm Details

### Trend-Based Outlier Detection

The system uses a sliding window approach to detect frames that break smooth motion patterns:

1. **Establish Trend**: For each keypoint, collect positions from 5-7 neighboring frames
2. **Fit Line**: Use linear regression to fit a line through the positions
3. **Calculate Expected Position**: Predict where keypoint should be at current frame
4. **Measure Deviation**: Compare actual vs expected position
5. **Mark Outlier**: If deviation > 30%, mark frame as outlier

**Example**:
```
Frames: [1, 2, 3, 4, 5]
Trend: Shoulder moving right at ~10px/frame
Frame 4 actual: Shoulder at x=150 (expected x=140)
Deviation: 10px / 100px = 10% → NOT an outlier

Frame 4 actual: Shoulder at x=80 (expected x=140)
Deviation: 60px / 100px = 60% → IS an outlier
```

### Off-Screen Detection

Combines two signals:
1. **Boundary Clustering**: > 50% of keypoints within 5% of image edge
2. **Low Confidence**: Average keypoint confidence < 0.3

### Interpolation

Uses linear interpolation for keypoint positions:
```
interpolated_position = before_position + (after_position - before_position) * t
where t = frameOffset / totalGap
```

## Integration Points

### Automatic Filtering on Save

When `saveMeshData()` is called:
1. Frames are analyzed for quality
2. Low-quality frames are removed
3. Outliers are interpolated
4. Frame index mapping is created
5. Only filtered frames are stored
6. Mapping is stored in metadata

### Frame Retrieval with Mapping

When `getFrame()` or `getFrameRange()` is called:
1. Check if frame index mapping exists
2. Map original frame index to processed index
3. Return processed frame (or null if removed)
4. Apply Kalman smoothing if enabled

## Performance Characteristics

- **Batch Processing**: All frames analyzed in one pass
- **Memory Efficient**: Streaming approach for large videos
- **Caching**: Quality scores and mappings cached in MongoDB
- **Graceful Fallback**: If filtering fails, continues with unfiltered frames

## Testing Recommendations

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

## Configuration Examples

### Default Configuration
```typescript
// Uses built-in defaults
const analyzer = new FrameQualityAnalyzer(videoDimensions);
```

### Custom Configuration
```typescript
const analyzer = new FrameQualityAnalyzer(videoDimensions, {
  minConfidence: 0.7,
  outlierDeviationThreshold: 0.25,
  trendWindowSize: 7
});
```

### Environment Variables
```bash
FRAME_QUALITY_MIN_CONFIDENCE=0.7
FRAME_QUALITY_OUTLIER_DEVIATION_THRESHOLD=0.25
FRAME_QUALITY_TREND_WINDOW_SIZE=7
FRAME_QUALITY_DEBUG_MODE=true
```

## Files Created/Modified

### Created:
- `SnowboardingExplained/backend/src/services/frameQualityAnalyzer.ts`
- `SnowboardingExplained/backend/src/services/frameFilterService.ts`
- `SnowboardingExplained/backend/src/services/frameIndexMapper.ts`
- `SnowboardingExplained/backend/src/config/frameQualityConfig.ts`

### Modified:
- `SnowboardingExplained/backend/src/services/meshDataService.ts`
- `SnowboardingExplained/.kiro/specs/pose-frame-quality-filtering/tasks.md`

### Already Existed:
- `SnowboardingExplained/backend/src/types/frameQuality.ts` (all types already defined)

## Next Steps

1. **Testing**: Run integration tests with real videos
2. **Monitoring**: Track quality statistics in production
3. **Tuning**: Adjust thresholds based on real-world performance
4. **Documentation**: Create user guide if needed

## Notes

- Frame quality filtering is applied automatically during mesh data save
- No changes needed to existing code that calls `saveMeshData()`
- Frame index mapping is transparent to frontend - synchronization is automatic
- Graceful fallback ensures system continues working even if filtering fails
- All configuration is environment-driven for easy tuning
