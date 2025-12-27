# Frame Quality Filtering - Quick Reference Guide

## What It Does

Automatically improves pose detection quality by:
1. **Removing** low-confidence frames (< 0.6 average confidence)
2. **Removing** off-screen frames (rider left the frame)
3. **Interpolating** outlier frames (frames that break smooth motion)
4. **Maintaining** frame synchronization with original video

## How It Works

The system uses a **trend-based outlier detection** algorithm:
- Analyzes 5-7 frame sliding window to establish motion trend
- Detects frames deviating > 30% from expected trajectory
- Interpolates outliers using linear interpolation
- Maintains frame index mapping for video sync

## Configuration

### Default Thresholds

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `MIN_CONFIDENCE` | 0.6 | Minimum average keypoint confidence |
| `BOUNDARY_THRESHOLD` | 0.05 | 5% of image edge for boundary detection |
| `OFF_SCREEN_CONFIDENCE` | 0.3 | Threshold for off-screen detection |
| `OUTLIER_DEVIATION_THRESHOLD` | 0.3 | 30% deviation from trend |
| `TREND_WINDOW_SIZE` | 5 | Frames for trend analysis |
| `MAX_INTERPOLATION_GAP` | 10 | Max frames to interpolate |

### Adjusting Configuration

Set environment variables before starting the backend:

```bash
# Stricter filtering (remove more frames)
export FRAME_QUALITY_MIN_CONFIDENCE=0.7
export FRAME_QUALITY_OUTLIER_DEVIATION_THRESHOLD=0.25

# Looser filtering (keep more frames)
export FRAME_QUALITY_MIN_CONFIDENCE=0.5
export FRAME_QUALITY_OUTLIER_DEVIATION_THRESHOLD=0.4

# Enable debug logging
export FRAME_QUALITY_DEBUG_MODE=true
```

## Usage

### Automatic Filtering

Frame quality filtering is **automatic** when saving mesh data:

```typescript
// Filtering happens automatically inside saveMeshData()
await meshDataService.saveMeshData({
  videoId: 'video123',
  frames: rawFrames,
  fps: 60,
  videoDuration: 10,
  // ... other data
});
```

### Retrieving Frames

Frame index mapping is **transparent** to callers:

```typescript
// Get single frame - automatically uses frame index mapping
const frame = await meshDataService.getFrame(videoId, frameNumber);

// Get frame range - automatically uses frame index mapping
const frames = await meshDataService.getFrameRange(videoId, startFrame, endFrame);
```

### Checking Quality Statistics

Quality statistics are stored in metadata:

```typescript
const meshData = await meshDataService.getMeshData(videoId);

console.log(meshData.metadata?.qualityStats);
// Output:
// {
//   originalCount: 1800,
//   processedCount: 1620,
//   removedCount: 180,
//   interpolatedCount: 45,
//   removalPercentage: "10.0",
//   interpolationPercentage: "2.5"
// }
```

## Troubleshooting

### Too Many Frames Removed

**Problem**: Quality statistics show > 20% removal rate

**Solutions**:
1. Increase `MIN_CONFIDENCE` threshold:
   ```bash
   export FRAME_QUALITY_MIN_CONFIDENCE=0.5
   ```
2. Increase `OUTLIER_DEVIATION_THRESHOLD`:
   ```bash
   export FRAME_QUALITY_OUTLIER_DEVIATION_THRESHOLD=0.4
   ```
3. Check video quality - may be genuinely poor

### Jittery Motion Still Visible

**Problem**: Mesh still has jerky motion after filtering

**Solutions**:
1. Decrease `OUTLIER_DEVIATION_THRESHOLD` to catch more outliers:
   ```bash
   export FRAME_QUALITY_OUTLIER_DEVIATION_THRESHOLD=0.2
   ```
2. Increase `TREND_WINDOW_SIZE` for better trend detection:
   ```bash
   export FRAME_QUALITY_TREND_WINDOW_SIZE=7
   ```
3. Enable Kalman smoothing in addition to filtering

### Off-Screen Frames Not Removed

**Problem**: Mesh still visible when rider is off-screen

**Solutions**:
1. Decrease `OFF_SCREEN_CONFIDENCE` threshold:
   ```bash
   export FRAME_QUALITY_OFF_SCREEN_CONFIDENCE=0.2
   ```
2. Decrease `BOUNDARY_THRESHOLD` to detect boundary frames earlier:
   ```bash
   export FRAME_QUALITY_BOUNDARY_THRESHOLD=0.03
   ```

### Interpolation Gaps Too Large

**Problem**: Large gaps between good frames, interpolation looks wrong

**Solutions**:
1. Decrease `MAX_INTERPOLATION_GAP`:
   ```bash
   export FRAME_QUALITY_MAX_INTERPOLATION_GAP=5
   ```
2. This will remove frames instead of interpolating them

## Performance Impact

- **Processing Time**: ~50-100ms per 1000 frames (negligible)
- **Storage**: Reduced by ~10-20% due to frame removal
- **Memory**: Minimal impact (streaming approach)
- **Retrieval**: Slightly slower due to index mapping lookup (< 1ms)

## Monitoring

### Enable Debug Logging

```bash
export FRAME_QUALITY_DEBUG_MODE=true
```

This will log:
- Frame quality analysis results
- Removed frame indices
- Interpolated frame indices
- Quality statistics

### Check Logs

Look for messages like:
```
[MESH-SERVICE] 🔍 Applying frame quality filtering for video123
[MESH-SERVICE] 📊 Analyzing quality of 1800 frames
[MESH-SERVICE] 🔧 Filtering and interpolating frames
[MESH-SERVICE] ✅ Frame quality filtering complete:
  originalCount: 1800
  processedCount: 1620
  removedCount: 180
  interpolatedCount: 45
```

## Advanced Usage

### Custom Analyzer Configuration

```typescript
import FrameQualityAnalyzer from './services/frameQualityAnalyzer';

const analyzer = new FrameQualityAnalyzer(
  { width: 1920, height: 1080 },
  {
    minConfidence: 0.7,
    boundaryThreshold: 0.03,
    offScreenConfidence: 0.2,
    outlierDeviationThreshold: 0.25,
    trendWindowSize: 7
  }
);

const qualities = analyzer.analyzeSequence(frames);
```

### Custom Filter Configuration

```typescript
import FrameFilterService from './services/frameFilterService';

const filterService = new FrameFilterService({
  maxInterpolationGap: 5,
  debugMode: true
});

const filtered = filterService.filterAndInterpolate(frames, qualities);
```

## FAQ

**Q: Does filtering affect video playback?**
A: No. Frame index mapping ensures video playback stays synchronized with filtered mesh data.

**Q: Can I disable filtering?**
A: Not currently. Filtering is always applied. To disable, set very loose thresholds:
```bash
export FRAME_QUALITY_MIN_CONFIDENCE=0.0
export FRAME_QUALITY_OUTLIER_DEVIATION_THRESHOLD=1.0
```

**Q: What if filtering fails?**
A: System gracefully falls back to unfiltered frames and logs a warning.

**Q: Can I adjust thresholds per video?**
A: Currently only global configuration is supported. Per-video tuning would require code changes.

**Q: How does this interact with Kalman smoothing?**
A: They work independently. Filtering removes bad frames, Kalman smoothing smooths good frames.

## Related Documentation

- [Frame Quality Filtering Implementation](./FRAME_QUALITY_FILTERING_IMPLEMENTATION.md)
- [Spec: Pose Frame Quality Filtering](./SnowboardingExplained/.kiro/specs/pose-frame-quality-filtering/)
