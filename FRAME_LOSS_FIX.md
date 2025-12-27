# Frame Loss Fix - Mesh Playback

## Problem
Video playback was smooth but the mesh was only displaying some frames - appearing to skip frames even though 79 frames existed in the dataset.

## Root Cause
Frame quality filtering was too strict with these thresholds:
- `MIN_CONFIDENCE: 0.6` - Filtered out frames with confidence < 60%
- `OFF_SCREEN_CONFIDENCE: 0.3` - Filtered frames with off-screen keypoints below 30% confidence
- `OUTLIER_DEVIATION_THRESHOLD: 0.3` - Filtered frames deviating >30% from motion trend
- `MAX_INTERPOLATION_GAP: 10` - Wouldn't interpolate gaps > 10 frames

These strict thresholds were dropping many valid frames during the mesh data save process.

## Solution
Adjusted frame quality thresholds in `frameQualityConfig.ts` to be more lenient:

| Parameter | Old Value | New Value | Reason |
|-----------|-----------|-----------|--------|
| `MIN_CONFIDENCE` | 0.6 | 0.3 | Only filter very low confidence frames |
| `OFF_SCREEN_CONFIDENCE` | 0.3 | 0.15 | Only filter if most keypoints are off-screen |
| `OUTLIER_DEVIATION_THRESHOLD` | 0.3 | 0.5 | Only filter extreme outliers |
| `MAX_INTERPOLATION_GAP` | 10 | 20 | Allow interpolation across larger gaps |

## How It Works
1. When mesh data is saved, frames are analyzed for quality
2. Low-quality frames are removed, outliers are interpolated
3. With the new thresholds, many more frames will be kept
4. Frames with 30%+ confidence are now kept (vs 60%+ before)
5. Larger gaps can be interpolated, filling in missing frames

## Testing
After restarting the backend:
1. Upload a new video or re-process an existing one
2. Check mesh playback - should see significantly more frames
3. Motion should be smoother with fewer visible gaps

## Environment Variables
You can override these thresholds via environment variables:
```
FRAME_QUALITY_MIN_CONFIDENCE=0.3
FRAME_QUALITY_OFF_SCREEN_CONFIDENCE=0.15
FRAME_QUALITY_OUTLIER_DEVIATION_THRESHOLD=0.5
FRAME_QUALITY_MAX_INTERPOLATION_GAP=20
```

## Next Steps
1. Restart the backend service
2. Re-upload or re-process a video
3. Verify mesh playback shows all frames smoothly
4. If still losing frames, can lower thresholds further or disable filtering entirely
