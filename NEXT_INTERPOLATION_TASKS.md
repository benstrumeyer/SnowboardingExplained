# Next Frame Interpolation Tasks

## Current Status
✅ Tasks 1-5 Complete:
- Frame Gap Analyzer
- Keypoint Interpolator
- Mesh Vertex Interpolator
- Frame Interpolation Service
- MeshDataService Integration

## Task 6: Add Interpolation Metadata

**Goal**: Mark interpolated frames with metadata about their source and interpolation factor.

**What to do**:
1. Update `InterpolatedFrame` interface to include metadata
2. Modify `getFrame()` to include:
   - `interpolated: boolean` flag
   - `sourceFrames: [number, number]` - indices of source frames used
   - `interpolationFactor: number` - blend factor (0-1)
3. Update database frame structure to store this metadata
4. Add logging for interpolation operations

**Files to modify**:
- `backend/src/services/frameInterpolation/frameInterpolationService.ts` (already has metadata)
- `backend/src/services/meshDataService.ts` (ensure metadata is preserved)

**Acceptance Criteria**:
- Every interpolated frame has `interpolated: true`
- Source frame indices are correctly stored
- Interpolation factor is between 0 and 1
- Metadata is logged for debugging

---

## Task 7: Handle Edge Cases

**Goal**: Handle special cases like start/end of video and large gaps.

**What to do**:
1. **Start of video**: If frames before first source frame are missing
   - Duplicate first source frame
   - Mark as edge case in metadata
2. **End of video**: If frames after last source frame are missing
   - Duplicate last source frame
   - Mark as edge case in metadata
3. **Large gaps** (>10 frames):
   - Log warning
   - Consider using different interpolation strategy
4. **Vertex count mismatches**:
   - Already handled in MeshVertexInterpolator
   - Verify it works correctly

**Files to modify**:
- `backend/src/services/frameInterpolation/frameGapAnalyzer.ts` (already handles edge cases)
- `backend/src/services/frameInterpolation/frameInterpolationService.ts` (verify edge case handling)

**Acceptance Criteria**:
- Start-of-video gaps are filled with first frame
- End-of-video gaps are filled with last frame
- Large gaps are logged with warnings
- Vertex mismatches don't cause errors

---

## Task 8: Checkpoint - Ensure All Tests Pass

**Goal**: Verify all components work correctly.

**What to do**:
1. Run TypeScript compiler: `npm run build`
2. Check for any compilation errors
3. Verify no runtime errors in interpolation service
4. Test with sample data

**Files to check**:
- All files in `backend/src/services/frameInterpolation/`
- `backend/src/services/meshDataService.ts`

**Acceptance Criteria**:
- No TypeScript errors
- No compilation warnings
- Service initializes without errors
- Interpolation produces valid frames

---

## Task 9: Performance Testing

**Goal**: Ensure interpolation is fast enough for real-time playback.

**What to do**:
1. Test with 140-frame video (90 poses)
   - Measure interpolation time per frame
   - Verify cache effectiveness
2. Test with larger videos (1000+ frames)
   - Check memory usage
   - Verify cache doesn't grow unbounded
3. Benchmark different scenarios:
   - First frame access (cache miss)
   - Subsequent frame access (cache hit)
   - Range queries

**Expected Performance**:
- Single frame interpolation: < 1ms
- Cache hit rate: > 90% for sequential playback
- Memory usage: < 100MB for 1000-frame video

**Files to create**:
- `backend/tests/frameInterpolation.performance.test.ts`

---

## Task 10: Integration Testing

**Goal**: Test with real video data.

**What to do**:
1. Upload a 720p 60 FPS video
2. Extract poses (should get ~90 frames from 140 total)
3. Test playback:
   - Verify mesh plays smoothly
   - Verify frame count is correct (140)
   - Verify mesh completes full 360° rotation
4. Compare with/without interpolation

**Test Scenarios**:
- Play from start to end
- Seek to middle of video
- Play backward
- Change playback speed

**Expected Results**:
- Smooth playback without jitter
- Mesh completes full rotation
- No frame skipping
- Synchronized with video

**Files to create**:
- `backend/tests/frameInterpolation.integration.test.ts`

---

## Task 11: Final Checkpoint

**Goal**: Verify everything works end-to-end.

**What to do**:
1. Run complete test suite
2. Verify all properties hold
3. Check for regressions
4. Validate with real video data
5. Document any issues

**Acceptance Criteria**:
- All tests pass
- No regressions
- Real video plays smoothly
- Mesh data is correct

---

## Quick Start for Next Task

To start Task 6 (Add Interpolation Metadata):

1. The metadata structure is already in place in `frameInterpolationService.ts`
2. Just need to ensure it's properly preserved through the system
3. Update `convertInterpolatedFrameToDatabase()` to include metadata
4. Add logging to track interpolation operations

```typescript
// Example of what metadata should look like:
{
  frameNumber: 1,
  interpolated: true,
  interpolationMetadata: {
    sourceFrames: [0, 2],
    interpolationFactor: 0.5
  },
  // ... other frame data
}
```

---

## Testing Commands

```bash
# Build the project
npm run build

# Run tests (when created)
npm test

# Run specific test file
npm test -- frameInterpolation.test.ts

# Run with coverage
npm test -- --coverage
```

---

## Debugging Tips

1. **Enable debug logging**:
   ```typescript
   FrameGapAnalyzer.logGapAnalysis(metadata);
   ```

2. **Check interpolation statistics**:
   ```typescript
   const stats = meshDataService.getInterpolationStatistics();
   console.log(stats);
   ```

3. **Verify cache performance**:
   ```typescript
   const cacheStats = interpolationService.getCacheStats();
   console.log(cacheStats);
   ```

4. **Check frame data**:
   ```typescript
   const frame = await meshDataService.getFrame(videoId, frameNumber);
   console.log('Frame:', frame);
   console.log('Interpolated:', frame.interpolated);
   console.log('Metadata:', frame.interpolationMetadata);
   ```
