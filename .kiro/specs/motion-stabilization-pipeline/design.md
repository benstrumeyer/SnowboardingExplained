# Motion Stabilization Pipeline Design

## Overview

This design implements a lightweight, composable motion stabilization pipeline for snowboarding pose data from 4DHumans (HMR2). The pipeline applies five complementary techniques in sequence to smooth joint trajectories while preserving motion fidelity and avoiding data loss.

**Note**: This pipeline operates on 4DHumans output, which includes 3D joint positions, confidence scores, joint angles, and mesh vertices. The term "keypoints" in the code refers to 4DHumans joints, not MediaPipe landmarks.

1. **Confidence-Based Filtering**: Ignore or interpolate low-confidence joints
2. **Temporal Median Filtering**: Smooth outlier spikes with a 5-frame sliding window
3. **Skeleton Normalization**: Scale coordinates relative to body dimensions (torso length)
4. **Limb Length Constraints**: Enforce realistic joint distances
5. **Velocity-Based Interpolation**: Generate synthetic frames between 30 FPS input to create smooth 60 FPS output

The pipeline is optional, configurable, and introduces minimal latency (2 frames at 30 FPS = 67ms) while maintaining < 2ms per-frame processing overhead. It operates on 4DHumans pose data and produces both stabilized and original coordinates for comparison.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Raw 4DHumans Frame                        │
│  Joints: [shoulder, elbow, wrist, hip, knee, ankle...]     │
│  Confidence: [0.95, 0.87, 0.42, 0.91, 0.88, 0.76...]       │
│  3D Positions: [[x,y,z], [x,y,z], ...]                     │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  1. Confidence Filtering        │
        │  - Skip confidence < 0.5        │
        │  - Interpolate from history     │
        │  - Mark occlusions              │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  2. Temporal Median Filter      │
        │  - 5-frame sliding window       │
        │  - Per-coordinate (x, y, z)    │
        │  - Introduces 2-frame lag       │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  3. Skeleton Normalization      │
        │  - Calculate torso length       │
        │  - Divide all coords by torso   │
        │  - Store original + normalized  │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  4. Limb Length Constraints     │
        │  - Measure joint distances      │
        │  - Flag deviations > 20%        │
        │  - Adjust child joint positions │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │  5. Velocity Interpolation      │
        │  - Calculate velocity per joint │
        │  - Generate synthetic frames    │
        │  - 30 FPS → 60 FPS output       │
        └────────────────┬────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Stabilized Frame                            │
│  Original: [raw joints]                                     │
│  Stabilized: [filtered, smoothed, normalized, constrained] │
│  Interpolated: [synthetic frames at 60 FPS]                │
│  Metrics: {filtered_count, median_deltas, corrections}      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. MotionStabilizationPipeline (Main Service)

Orchestrates the four stabilization techniques in sequence.

```typescript
interface StabilizationConfig {
  // Confidence filtering
  confidenceThreshold: number; // default: 0.5
  interpolateOccluded: boolean; // default: true
  occlusionFrameThreshold: number; // default: 3
  
  // Temporal median filtering
  medianWindowSize: number; // default: 5
  enableMedianFilter: boolean; // default: true
  
  // Skeleton normalization
  enableNormalization: boolean; // default: true
  referenceBodyPart: 'torso' | 'shoulder'; // default: 'torso'
  
  // Limb length constraints
  enableConstraints: boolean; // default: true
  constraintTolerance: number; // default: 0.2 (20%)
  
  // Latency mode
  latencyMode: 'real-time' | 'smooth' | 'analysis'; // default: 'smooth'
}

interface StabilizationMetrics {
  frameIndex: number;
  timestamp: number;
  filteredKeypointCount: number;
  medianAdjustments: number;
  constraintCorrections: number;
  averageDelta: number; // avg distance between original and stabilized
  maxDelta: number;
}

interface StabilizedFrame {
  frameIndex: number;
  timestamp: number;
  original: {
    keypoints: Keypoint[];
    skeleton: Skeleton;
  };
  stabilized: {
    keypoints: Keypoint[];
    skeleton: Skeleton;
    normalized?: {
      keypoints: Keypoint[];
      torsoLength: number;
    };
  };
  metrics: StabilizationMetrics;
}

class MotionStabilizationPipeline {
  constructor(config: StabilizationConfig);
  
  // Process a single frame through the pipeline
  processFrame(frame: RawFrame): StabilizedFrame;
  
  // Process multiple frames (batch)
  processFrames(frames: RawFrame[]): StabilizedFrame[];
  
  // Update configuration
  updateConfig(config: Partial<StabilizationConfig>): void;
  
  // Get current configuration
  getConfig(): StabilizationConfig;
  
  // Reset internal state (call when loading new video)
  reset(): void;
  
  // Get diagnostics
  getDiagnostics(): PipelineDiagnostics;
}
```

### 2. ConfidenceFilter

Filters and interpolates low-confidence keypoints.

```typescript
interface ConfidenceFilterConfig {
  threshold: number; // default: 0.5
  interpolateOccluded: boolean; // default: true
  occlusionFrameThreshold: number; // default: 3
}

class ConfidenceFilter {
  constructor(config: ConfidenceFilterConfig);
  
  // Filter keypoints, marking unreliable ones
  filter(keypoints: Keypoint[]): FilteredKeypoints;
  
  // Interpolate occluded keypoints from history
  interpolate(keypoints: Keypoint[], history: Keypoint[][]): Keypoint[];
  
  // Update configuration
  updateConfig(config: Partial<ConfidenceFilterConfig>): void;
}

interface FilteredKeypoints {
  keypoints: Keypoint[];
  filtered: Set<number>; // indices of filtered keypoints
  occluded: Set<number>; // indices marked as occluded
}
```

### 3. TemporalMedianFilter

Applies 5-frame sliding window median filtering.

```typescript
interface TemporalMedianFilterConfig {
  windowSize: number; // default: 5
  enabled: boolean; // default: true
}

class TemporalMedianFilter {
  constructor(config: TemporalMedianFilterConfig);
  
  // Add frame to history and return smoothed frame
  smooth(keypoints: Keypoint[]): Keypoint[];
  
  // Get current history
  getHistory(): Keypoint[][];
  
  // Reset history (call when loading new video)
  reset(): void;
  
  // Update configuration
  updateConfig(config: Partial<TemporalMedianFilterConfig>): void;
}
```

### 4. SkeletonNormalizer

Normalizes skeleton coordinates by body dimensions.

```typescript
interface SkeletonNormalizerConfig {
  enabled: boolean; // default: true
  referenceBodyPart: 'torso' | 'shoulder'; // default: 'torso'
}

interface NormalizationResult {
  normalized: Keypoint[];
  torsoLength: number;
  referenceUsed: 'torso' | 'shoulder' | 'none';
}

class SkeletonNormalizer {
  constructor(config: SkeletonNormalizerConfig);
  
  // Normalize keypoints by torso length or shoulder width
  normalize(keypoints: Keypoint[]): NormalizationResult;
  
  // Calculate torso length (hip center to shoulder center)
  calculateTorsoLength(keypoints: Keypoint[]): number;
  
  // Calculate shoulder width
  calculateShoulderWidth(keypoints: Keypoint[]): number;
  
  // Update configuration
  updateConfig(config: Partial<SkeletonNormalizerConfig>): void;
}
```

#### 5. VelocityInterpolator

Generates synthetic frames between keyframes using velocity-based linear interpolation.

```typescript
interface VelocityInterpolatorConfig {
  enabled: boolean; // default: true
  outputFrameRate: number; // default: 60 (generates 60 FPS from 30 FPS input)
  velocityDampingThreshold: number; // default: 100 (units/frame, triggers damping)
  dampingFactor: number; // default: 0.8 (reduces velocity by 20% if threshold exceeded)
}

class VelocityInterpolator {
  constructor(config: VelocityInterpolatorConfig);
  
  // Generate synthetic frames between two keyframes
  interpolate(frame1: Joint[], frame2: Joint[], dt: number): Joint[][];
  
  // Calculate velocity for a joint between two frames
  calculateVelocity(joint1: Joint, joint2: Joint, dt: number): [number, number, number];
  
  // Apply damping to velocity if it exceeds threshold
  applyVelocityDamping(velocity: [number, number, number]): [number, number, number];
  
  // Update configuration
  updateConfig(config: Partial<VelocityInterpolatorConfig>): void;
}
```

**Key Formula**:
```
velocity = (frame[n+1] - frame[n]) / dt
interpolated[t] = frame[n] + velocity * t, where t ∈ [0, 1]
```

For 30 FPS → 60 FPS: generates 1 synthetic frame between each pair of keyframes (t = 0.5)

## 5. LimbLengthConstraint

Enforces realistic joint distances.

```typescript
interface LimbLengthConstraintConfig {
  enabled: boolean; // default: true
  tolerance: number; // default: 0.2 (20%)
}

interface ConstraintResult {
  keypoints: Keypoint[];
  corrections: Array<{
    limbName: string;
    originalLength: number;
    correctedLength: number;
    magnitude: number;
  }>;
}

class LimbLengthConstraint {
  constructor(config: LimbLengthConstraintConfig);
  
  // Apply limb length constraints
  constrain(keypoints: Keypoint[]): ConstraintResult;
  
  // Measure limb length between two keypoints
  measureLimbLength(kp1: Keypoint, kp2: Keypoint): number;
  
  // Get baseline limb lengths (from first frame)
  getBaselineLengths(): Map<string, number>;
  
  // Reset baseline (call when loading new video)
  reset(): void;
  
  // Update configuration
  updateConfig(config: Partial<LimbLengthConstraintConfig>): void;
}
```

## Data Models

### Keypoint

```typescript
interface Keypoint {
  index: number; // 0-32 for MediaPipe pose
  name: string; // 'nose', 'left_shoulder', etc.
  position: [number, number, number]; // [x, y, z]
  confidence: number; // 0-1
  isFiltered?: boolean; // marked as unreliable
  isOccluded?: boolean; // marked as occluded
}
```

### RawFrame

```typescript
interface RawFrame {
  frameIndex: number;
  timestamp: number;
  keypoints: Keypoint[];
  skeleton: Skeleton;
}
```

### Skeleton

```typescript
interface Skeleton {
  connections: Array<[number, number]>; // pairs of keypoint indices
}
```

## Processing Pipeline

### Step 1: Confidence Filtering

```
Input: Raw joints with confidence scores
Process:
  1. For each joint:
     - If confidence < threshold: mark as filtered
     - If filtered for N+ consecutive frames: mark as occluded
     - If interpolateOccluded: use previous frame's position
  2. Return filtered joints with metadata

Output: Joints with low-confidence ones marked/interpolated
Latency: 0 frames (uses current + previous frame only)
```

### Step 2: Temporal Median Filtering

```
Input: Filtered joints
Process:
  1. Maintain 5-frame sliding window history
  2. For each joint coordinate (x, y, z):
     - Calculate median of window
     - Replace coordinate with median
  3. At sequence start (< 2 frames): use available history
  4. Return smoothed joints

Output: Smoothed joints
Latency: 2 frames (67ms at 30 FPS)
Note: Introduces lag but eliminates outlier spikes
```

### Step 3: Skeleton Normalization

```
Input: Smoothed joints
Process:
  1. Calculate reference dimension:
     - If torso mode: distance from hip center to shoulder center
     - If shoulder mode: distance between shoulders
  2. If reference is valid (> 0):
     - Divide all joint coordinates by reference
     - Store both original and normalized
  3. Return normalized joints

Output: Normalized joints (scale-invariant)
Latency: 0 frames (stateless)
```

### Step 4: Limb Length Constraints

```
Input: Normalized joints
Process:
  1. On first frame: establish baseline limb lengths
  2. For each limb (connected pair):
     - Measure current length
     - If deviation > tolerance:
       - Flag as anomalous
       - Adjust child joint to restore baseline length
       - Preserve parent joint position
  3. Process limbs in parent-to-child order
  4. Return constrained joints

Output: Constrained joints (anatomically plausible)
Latency: 0 frames (stateless)
```

### Step 5: Velocity-Based Interpolation

```
Input: Constrained joints from frame N and frame N+1
Process:
  1. For each joint:
     - Calculate velocity: v = (joint[n+1] - joint[n]) / dt
     - If velocity magnitude > damping threshold: apply damping
  2. Generate synthetic frames at output frame rate:
     - For t in [0, 1] with step = 1 / (output_fps / input_fps):
       - interpolated[t] = joint[n] + velocity * t
  3. Return synthetic frames with original frame indices preserved

Output: Synthetic frames (30 FPS → 60 FPS)
Latency: 0 frames (computed on-the-fly or cached)
Note: Fills gaps with smooth motion, respects velocity direction
```

## Latency Modes

### Real-Time Mode
- Techniques: Confidence filtering + Skeleton normalization + Limb constraints
- Interpolation: None (30 FPS output)
- Latency: 0 frames
- Use case: Live playback, real-time analysis
- Trade-off: Less smoothing, more jitter, no interpolation

### Smooth Mode (Default)
- Techniques: All four (confidence + median + normalization + constraints) + velocity interpolation
- Interpolation: 30 FPS → 60 FPS
- Latency: 2 frames (67ms at 30 FPS)
- Use case: Playback, motion analysis
- Trade-off: Smoother motion, slight lag, 60 FPS output

### Analysis Mode
- Techniques: All five + enhanced diagnostics
- Interpolation: 30 FPS → 60 FPS (or higher if configured)
- Latency: 2 frames (67ms at 30 FPS)
- Use case: Detailed motion analysis, debugging
- Trade-off: Maximum smoothing, detailed metrics, 60 FPS output

## Integration with MeshDataService

The pipeline integrates with the existing `meshDataService` by processing frames before they're returned to the frontend:

```typescript
// In meshDataService.getFrame()
async getFrame(videoId: string, frameNumber: number): Promise<any | null> {
  const frame = await this.framesCollection.findOne({ videoId, frameNumber });
  
  if (frame && this.stabilizationEnabled && frame.keypoints) {
    // Apply motion stabilization pipeline
    const stabilized = this.stabilizationPipeline.processFrame({
      frameIndex: frame.frameNumber,
      timestamp: frame.timestamp,
      keypoints: frame.keypoints,
      skeleton: frame.skeleton
    });
    
    return {
      ...frame,
      keypoints: stabilized.stabilized.keypoints,
      original_keypoints: stabilized.original.keypoints,
      metrics: stabilized.metrics
    };
  }
  
  return frame;
}
```

## Performance Characteristics

| Technique | CPU Time | Memory | Latency |
|-----------|----------|--------|---------|
| Confidence Filtering | 0.1ms | 1KB | 0 frames |
| Temporal Median | 0.8ms | 5KB | 2 frames |
| Skeleton Normalization | 0.1ms | 1KB | 0 frames |
| Limb Constraints | 0.2ms | 2KB | 0 frames |
| Velocity Interpolation | 0.1ms | 1KB | 0 frames |
| **Total** | **~1.3ms** | **~10KB** | **2 frames** |

Compared to:
- Pose detection: 100-500ms
- Rendering: 5-20ms
- Network latency: 10-100ms

**Conclusion**: Motion stabilization overhead is negligible (< 2% of total pipeline). Velocity interpolation adds minimal cost while dramatically improving visual smoothness.

## Configuration Examples

### Real-Time Playback
```typescript
const config: StabilizationConfig = {
  confidenceThreshold: 0.5,
  interpolateOccluded: true,
  occlusionFrameThreshold: 3,
  medianWindowSize: 5,
  enableMedianFilter: false, // Skip median for 0 lag
  enableNormalization: true,
  enableConstraints: true,
  constraintTolerance: 0.2,
  latencyMode: 'real-time'
};
```

### Motion Analysis
```typescript
const config: StabilizationConfig = {
  confidenceThreshold: 0.6, // Stricter filtering
  interpolateOccluded: true,
  occlusionFrameThreshold: 2,
  medianWindowSize: 5,
  enableMedianFilter: true, // Full smoothing
  enableNormalization: true,
  enableConstraints: true,
  constraintTolerance: 0.15, // Tighter constraints
  latencyMode: 'analysis'
};
```

### Minimal Smoothing
```typescript
const config: StabilizationConfig = {
  confidenceThreshold: 0.3, // Permissive
  interpolateOccluded: false,
  occlusionFrameThreshold: 5,
  medianWindowSize: 3, // Smaller window
  enableMedianFilter: true,
  enableNormalization: false,
  enableConstraints: false,
  latencyMode: 'real-time'
};
```

## Error Handling

| Error | Handling |
|-------|----------|
| Invalid confidence score | Treat as 0 (unreliable) |
| Missing keypoint | Interpolate from previous frame or skip |
| Zero torso length | Fall back to shoulder width |
| Invalid limb length | Clamp to ±20% of baseline |
| Insufficient history | Use available frames for median |
| Performance timeout | Log warning, return unfiltered frame |

## Testing Strategy

### Unit Tests
- Confidence filtering with various thresholds
- Temporal median filter edge cases (start of sequence, gaps)
- Skeleton normalization with different reference dimensions
- Limb constraint correction with various deviations
- Pipeline composition and ordering

### Property-Based Tests
- Confidence filtering correctness
- Temporal median consistency
- Normalization idempotence
- Limb constraint preservation
- Pipeline ordering consistency
- Performance bounds
- Latency mode correctness
- Configuration atomicity

### Integration Tests
- Full pipeline with real MediaPipe data
- Latency mode switching during playback
- Configuration updates during processing
- Performance profiling with various frame rates
- Comparison with original vs. stabilized output

### Acceptance Tests
- Rider-in-air sequences maintain mesh frames (no data loss)
- Fast flips produce smooth skeleton motion
- Occlusions are handled gracefully
- Performance overhead is negligible
- Latency trade-offs are acceptable for use case

## Correctness Properties

### Property 1: Confidence Filtering Correctness
*For any* keypoint with confidence < 0.5, the system SHALL either skip it or interpolate from history, never using the unreliable detection directly.

### Property 2: Temporal Median Consistency
*For any* frame with sufficient history (≥ 2 prior frames), the median filter SHALL produce identical results regardless of processing order.

### Property 3: Normalization Idempotence
*For any* skeleton normalized twice with the same torso length, the result SHALL be identical.

### Property 4: Limb Constraint Preservation
*For any* limb corrected by the constraint system, the corrected limb length SHALL be within 20% of baseline.

### Property 5: Pipeline Ordering Consistency
*For any* frame processed through the pipeline, applying techniques in order (confidence → median → normalization → constraints) SHALL produce identical results.

### Property 6: Performance Bound
*For any* frame, stabilization SHALL complete in < 2ms on standard hardware.

### Property 7: Latency Mode Correctness
*For any* latency mode, the system SHALL apply exactly the techniques specified for that mode without deviation.

### Property 8: Configuration Atomicity
*For any* configuration change, the system SHALL apply it atomically to subsequent frames without partial application.
