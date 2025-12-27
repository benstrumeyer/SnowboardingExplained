# Design: Frame Interpolation for Missing Poses

## Overview

This design implements frame interpolation to fill gaps where pose detection failed. When a video has 140 frames but only 90 poses were extracted, the system will interpolate the missing 50 frames by smoothly blending keypoints and mesh vertices between adjacent source frames.

**Key Principle**: Interpolation happens during frame retrieval, not storage. This keeps the database clean while providing smooth playback.

## Architecture

```
Video (140 frames)
    ↓
Pose Detection (extracts 90 frames)
    ↓
Frame Gap Analysis (identifies 50 missing frames)
    ↓
On-Demand Interpolation (when frame is requested)
    ↓
Smooth Playback (140 frames total)
```

## Components and Interfaces

### 1. Frame Gap Analyzer

**Purpose**: Identify which frames are missing and calculate interpolation parameters.

```typescript
interface FrameGap {
  startFrame: number;      // Last frame with pose data
  endFrame: number;        // Next frame with pose data
  missingFrames: number[]; // Indices of missing frames
  gapSize: number;         // Number of missing frames
}

class FrameGapAnalyzer {
  // Analyze mesh data and identify gaps
  analyzeGaps(meshData: MeshData): FrameGap[]
  
  // Get interpolation factor for a frame within a gap
  getInterpolationFactor(frameIndex: number, gap: FrameGap): number
  
  // Check if a frame needs interpolation
  isInterpolatedFrame(frameIndex: number, gaps: FrameGap[]): boolean
}
```

### 2. Keypoint Interpolator

**Purpose**: Interpolate keypoint positions between source frames.

```typescript
interface InterpolatedKeypoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
  name: string;
  interpolated: true;
  sourceFrames: [number, number]; // [before, after]
}

class KeypointInterpolator {
  // Interpolate a single keypoint between two frames
  interpolateKeypoint(
    beforeKp: Keypoint,
    afterKp: Keypoint,
    factor: number
  ): InterpolatedKeypoint
  
  // Interpolate all keypoints for a frame
  interpolateFrame(
    beforeKeypoints: Keypoint[],
    afterKeypoints: Keypoint[],
    factor: number
  ): InterpolatedKeypoint[]
}
```

### 3. Mesh Vertex Interpolator

**Purpose**: Interpolate mesh vertex positions between source frames.

```typescript
interface InterpolatedMeshData {
  vertices: number[][];
  faces: number[][];
  interpolated: true;
  sourceFrames: [number, number];
}

class MeshVertexInterpolator {
  // Interpolate mesh vertices between two frames
  interpolateMesh(
    beforeMesh: MeshData,
    afterMesh: MeshData,
    factor: number
  ): InterpolatedMeshData
  
  // Handle vertex count mismatches
  alignVertexCounts(
    beforeVertices: number[][],
    afterVertices: number[][]
  ): [number[][], number[][]]
}
```

### 4. Frame Interpolation Service

**Purpose**: Orchestrate interpolation and provide interpolated frames on demand.

```typescript
class FrameInterpolationService {
  private gaps: FrameGap[];
  private cache: Map<number, SyncedFrame>;
  
  // Initialize with mesh data
  initialize(meshData: MeshData): void
  
  // Get a frame (interpolated if necessary)
  getFrame(frameIndex: number): SyncedFrame | null
  
  // Get frame range (with interpolation)
  getFrameRange(startFrame: number, endFrame: number): SyncedFrame[]
  
  // Get interpolation statistics
  getStatistics(): {
    totalFrames: number;
    sourceFrames: number;
    interpolatedFrames: number;
    interpolationPercentage: number;
  }
}
```

## Data Models

### Interpolated Frame Structure

```typescript
interface SyncedFrame {
  frameIndex: number;
  timestamp: number;
  meshData: {
    keypoints: Keypoint[];
    skeleton: SkeletonData;
    vertices: number[][];
    faces: number[][];
  };
  interpolated?: {
    enabled: true;
    sourceFrames: [number, number];
    factor: number;
  };
}
```

### Frame Gap Metadata

```typescript
interface FrameGapMetadata {
  totalFrames: number;
  sourceFrames: number;
  missingFrames: number;
  gaps: {
    startFrame: number;
    endFrame: number;
    size: number;
  }[];
  interpolationPercentage: number;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Frame Continuity

**For any** video with missing frames, after interpolation, the frame sequence SHALL be continuous with no gaps.

**Validates: Requirements 1, 6**

### Property 2: Interpolation Factor Correctness

**For any** missing frame within a gap, the interpolation factor SHALL be between 0 and 1, where 0 represents the source frame and 1 represents the next source frame.

**Validates: Requirements 2, 4**

### Property 3: Keypoint Position Smoothness

**For any** interpolated keypoint, the position SHALL be a linear blend of the two source keypoints, and SHALL lie on the line segment between them.

**Validates: Requirements 2, 5**

### Property 4: Timestamp Consistency

**For any** interpolated frame, the timestamp SHALL be consistent with its frame index and the video's FPS: `timestamp = frameIndex / fps`.

**Validates: Requirements 6**

### Property 5: Mesh Data Integrity

**For any** interpolated frame, the mesh data SHALL have the same structure as source frames (same vertex count, face connectivity).

**Validates: Requirements 3, 5**

### Property 6: Edge Case Handling

**For any** missing frame at the start of the video, THE system SHALL duplicate the first source frame.
**For any** missing frame at the end of the video, THE system SHALL duplicate the last source frame.

**Validates: Requirements 4**

### Property 7: Interpolation Metadata Accuracy

**For any** interpolated frame, the `interpolated` flag SHALL be true, and the source frame indices SHALL be correct.

**Validates: Requirements 8**

### Property 8: Frame Count Correctness

**For any** video, after interpolation, the total frame count SHALL equal the video's frame count (based on duration and FPS).

**Validates: Requirements 1, 6**

## Error Handling

### Missing Source Frames
- If no source frames exist before a missing frame, duplicate the first source frame
- If no source frames exist after a missing frame, duplicate the last source frame

### Vertex Count Mismatch
- Use the source frame with more vertices as reference
- Pad the other frame's vertices with duplicates if needed

### Invalid Interpolation Factor
- Clamp factor to [0, 1] range
- Log warning if factor is outside expected range

### Corrupted Mesh Data
- Skip interpolation for that frame
- Log error and return null
- Fall back to nearest source frame

## Testing Strategy

### Unit Tests
- Test keypoint interpolation with various positions
- Test mesh vertex interpolation
- Test frame gap analysis
- Test edge cases (start/end of video, large gaps)
- Test timestamp calculations

### Property-Based Tests
- **Property 1**: Generate random frame sequences and verify continuity
- **Property 2**: Generate random gaps and verify interpolation factors
- **Property 3**: Generate random keypoint pairs and verify linear interpolation
- **Property 4**: Generate random frame indices and verify timestamp consistency
- **Property 5**: Generate random mesh data and verify structure preservation
- **Property 6**: Generate edge case scenarios and verify handling
- **Property 7**: Generate interpolated frames and verify metadata
- **Property 8**: Generate videos with various frame counts and verify totals

### Integration Tests
- Test with real video data (140 frames, 90 poses)
- Test playback synchronization
- Test performance with large videos
- Test caching behavior

## Performance Considerations

- **Interpolation on-demand**: Don't pre-compute all frames, interpolate when requested
- **Caching**: Cache interpolated frames to avoid recalculation
- **Linear interpolation**: Use simple math, no complex algorithms
- **Memory**: Store only source frames in database, interpolate during retrieval

## Implementation Order

1. Implement FrameGapAnalyzer
2. Implement KeypointInterpolator
3. Implement MeshVertexInterpolator
4. Implement FrameInterpolationService
5. Integrate with meshDataService.getFrame()
6. Add unit tests
7. Add property-based tests
8. Performance testing and optimization
