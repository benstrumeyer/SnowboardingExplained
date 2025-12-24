# Motion Stabilization Pipeline Requirements

## Introduction

This feature implements a lightweight, high-impact motion stabilization pipeline for snowboarding pose data from 4DHumans (HMR2). The pipeline addresses jitter, occlusions, and scaling issues in 3D pose detection without introducing data loss or excessive latency. Four complementary techniques work together to smooth joint trajectories while preserving motion fidelity: confidence-based filtering, temporal median filtering, skeleton normalization, and limb length constraints.

## Glossary

- **Joint**: A detected 3D body position (e.g., left shoulder, right knee) with x, y, z coordinates and confidence score from 4DHumans
- **Keypoint**: Synonym for joint in pose detection terminology
- **Skeleton**: The set of connections between joints (e.g., shoulder-to-elbow)
- **Confidence Score**: 4DHumans' estimate of detection reliability (0-1 range)
- **Jitter**: High-frequency noise in joint coordinates frame-to-frame
- **Occlusion**: When a body part leaves the camera view or is hidden behind another part
- **Normalization**: Scaling skeleton coordinates relative to a reference body dimension (e.g., torso length)
- **Limb Length Constraint**: Enforcing realistic joint distances (e.g., upper arm length shouldn't change)
- **Temporal Median Filter**: A 5-frame sliding window that replaces each coordinate with the median of the window
- **Confidence Threshold**: Minimum confidence score to accept a joint (default: 0.5)
- **4DHumans**: HMR2 model that outputs 3D pose with joint angles and mesh vertices

## Requirements

### Requirement 1: Confidence-Based Filtering

**User Story:** As a motion analyst, I want low-confidence joints to be ignored or interpolated, so that unreliable 4DHumans detections don't introduce spikes in the skeleton.

#### Acceptance Criteria

1. WHEN a joint has confidence < 0.5, THE system SHALL mark it as unreliable
2. WHEN a joint is marked unreliable, THE system SHALL either skip it or interpolate from neighboring frames
3. WHEN interpolating, THE system SHALL use the previous frame's position if available
4. WHEN a joint is unreliable for 3+ consecutive frames, THE system SHALL treat it as occluded
5. WHEN displaying a skeleton, THE system SHALL not draw connections to unreliable joints
6. WHERE confidence filtering is applied, THE system SHALL log the count of filtered joints per frame

### Requirement 2: Temporal Median Filtering

**User Story:** As a motion analyst, I want outlier spikes in joint positions to be smoothed out, so that the skeleton motion appears fluid without losing fast movements.

#### Acceptance Criteria

1. WHEN processing a frame, THE system SHALL apply a 5-frame sliding window median filter to each joint coordinate
2. WHEN a frame is at the start of a sequence (< 2 frames of history), THE system SHALL use available history without padding
3. WHEN the median filter is applied, THE system SHALL replace each x, y, z coordinate independently
4. WHEN filtering is complete, THE system SHALL introduce a 2-frame lag (67ms at 30 FPS) for smoother output
5. WHERE median filtering is applied, THE system SHALL preserve the original unfiltered data for comparison
6. WHEN a joint is unreliable (confidence < 0.5), THE system SHALL exclude it from the median calculation

### Requirement 3: Skeleton Normalization

**User Story:** As a motion analyst, I want skeleton coordinates to be normalized by body dimensions, so that I can compare motion across different camera distances and body sizes.

#### Acceptance Criteria

1. WHEN a skeleton is loaded, THE system SHALL calculate the torso length (distance from hip center to shoulder center)
2. WHEN torso length is calculated, THE system SHALL use it as the reference dimension for normalization
3. WHEN normalizing, THE system SHALL divide all keypoint coordinates by the torso length
4. WHEN a skeleton is normalized, THE system SHALL store both original and normalized coordinates
5. WHEN torso length is zero or invalid, THE system SHALL fall back to shoulder width as reference
6. WHEN shoulder width is also invalid, THE system SHALL skip normalization for that frame

### Requirement 4: Limb Length Constraints

**User Story:** As a motion analyst, I want unrealistic joint distances to be corrected, so that the skeleton maintains anatomically plausible proportions.

#### Acceptance Criteria

1. WHEN a skeleton is processed, THE system SHALL measure the distance between connected joints (e.g., shoulder-to-elbow)
2. WHEN a limb length deviates > 20% from the baseline, THE system SHALL flag it as anomalous
3. WHEN an anomaly is detected, THE system SHALL adjust the child joint position to restore realistic limb length
4. WHEN adjusting, THE system SHALL preserve the parent joint position and move the child joint
5. WHEN multiple limbs are anomalous, THE system SHALL process them in order (parent to child)
6. WHEN a limb length is corrected, THE system SHALL log the correction magnitude

### Requirement 5: Pipeline Integration

**User Story:** As a developer, I want the four stabilization techniques to work together seamlessly, so that I can apply them in sequence without manual coordination.

#### Acceptance Criteria

1. WHEN a frame is processed, THE system SHALL apply techniques in order: confidence filtering → temporal median → normalization → limb constraints
2. WHEN the pipeline processes a frame, THE system SHALL return both stabilized and original data
3. WHEN stabilization is applied, THE system SHALL be optional (can be toggled on/off)
4. WHEN stabilization is disabled, THE system SHALL return original keypoints unchanged
5. WHEN the pipeline is initialized, THE system SHALL accept configuration for each technique (thresholds, window sizes, etc.)
6. WHERE the pipeline is applied, THE system SHALL maintain performance overhead < 2ms per frame

### Requirement 6: Performance and Latency

**User Story:** As a system, I want motion stabilization to be cheap to compute, so that it doesn't impact real-time playback or analysis.

#### Acceptance Criteria

1. WHEN processing a frame, THE system SHALL complete stabilization in < 2ms
2. WHEN temporal median filtering is applied, THE system SHALL introduce 2-frame lag (67ms at 30 FPS)
3. WHEN stabilization is applied, THE system SHALL use < 10KB of memory per video
4. WHEN preloading frames, THE system SHALL prioritize stabilized frames for cache efficiency
5. WHEN comparing performance, THE system SHALL be negligible compared to pose detection (100-500ms) and rendering (5-20ms)

### Requirement 5: Velocity-Based Frame Interpolation

**User Story:** As a motion analyst, I want to fill gaps between 30 FPS frames with synthetic intermediate frames, so that fast snowboarding motion appears smooth and fluid.

#### Acceptance Criteria

1. WHEN two consecutive frames are available, THE system SHALL calculate joint velocity: velocity = (frame[n+1] - frame[n]) / dt
2. WHEN interpolating, THE system SHALL generate synthetic frames at configurable resolution (e.g., 60 FPS from 30 FPS input)
3. WHEN generating synthetic frames, THE system SHALL use: interpolated = frame[n] + velocity * t, where t ∈ [0, 1]
4. WHEN interpolation is complete, THE system SHALL preserve original frame indices and add synthetic frames between them
5. WHEN velocity is very high (> threshold), THE system SHALL optionally apply damping to prevent overshoot
6. WHERE interpolation is applied, THE system SHALL maintain performance overhead < 0.1ms per joint

### Requirement 6: Pipeline Integration

**User Story:** As a developer, I want the stabilization and interpolation techniques to work together seamlessly, so that I can apply them in sequence without manual coordination.

#### Acceptance Criteria

1. WHEN a frame is processed, THE system SHALL apply techniques in order: confidence filtering → temporal median → normalization → limb constraints → velocity interpolation
2. WHEN the pipeline processes a frame, THE system SHALL return both stabilized and original data
3. WHEN stabilization is applied, THE system SHALL be optional (can be toggled on/off)
4. WHEN stabilization is disabled, THE system SHALL return original joints unchanged
5. WHEN the pipeline is initialized, THE system SHALL accept configuration for each technique (thresholds, window sizes, interpolation factor, etc.)
6. WHERE the pipeline is applied, THE system SHALL maintain performance overhead < 2ms per frame (including interpolation)

### Requirement 7: Configuration and Control

**User Story:** As a developer, I want to configure stabilization parameters, so that I can tune the pipeline for different use cases (real-time vs. analysis).

#### Acceptance Criteria

1. WHEN initializing the pipeline, THE system SHALL accept a configuration object with all parameters
2. WHEN a parameter is updated, THE system SHALL apply it to subsequent frames without reprocessing history
3. WHEN confidence threshold is adjusted, THE system SHALL immediately affect filtering behavior
4. WHEN median window size is changed, THE system SHALL recalculate with the new window
5. WHEN limb constraint tolerance is adjusted, THE system SHALL apply new thresholds to subsequent frames
6. WHERE configuration is applied, THE system SHALL log all parameter changes

### Requirement 8: Latency Modes

**User Story:** As a user, I want to choose between real-time responsiveness and smoother motion, so that I can optimize for my use case.

#### Acceptance Criteria

1. WHEN latency mode is "real-time", THE system SHALL skip temporal median filtering and interpolation (0 lag)
2. WHEN latency mode is "smooth", THE system SHALL apply temporal median filtering + velocity interpolation (2-frame lag)
3. WHEN latency mode is "analysis", THE system SHALL apply all techniques including normalization + interpolation (2-frame lag)
4. WHEN mode is switched, THE system SHALL apply the new mode to subsequent frames
5. WHEN mode is switched, THE system SHALL not retroactively reprocess historical frames

### Requirement 9: Monitoring and Diagnostics

**User Story:** As a developer, I want to monitor stabilization effectiveness, so that I can verify the pipeline is working correctly.

#### Acceptance Criteria

1. WHEN stabilization is applied, THE system SHALL track metrics: filtered keypoints, median adjustments, constraint corrections
2. WHEN a frame is processed, THE system SHALL calculate the delta between original and stabilized coordinates
3. WHEN diagnostics are requested, THE system SHALL return per-frame and aggregate statistics
4. WHERE diagnostics are enabled, THE system SHALL log anomalies (high deltas, constraint violations, etc.)
5. WHEN comparing original vs. stabilized, THE system SHALL provide visualization data for debugging

## Correctness Properties

### Property 1: Confidence Filtering Correctness

*For any* keypoint with confidence < 0.5, the system SHALL either skip it or interpolate from history, never using the unreliable detection directly.

**Validates: Requirement 1.1, 1.2, 1.3**

### Property 2: Temporal Median Consistency

*For any* frame with sufficient history (≥ 2 prior frames), the median filter SHALL produce identical results regardless of processing order.

**Validates: Requirement 2.1, 2.2, 2.3**

### Property 3: Normalization Idempotence

*For any* skeleton normalized twice with the same torso length, the result SHALL be identical.

**Validates: Requirement 3.1, 3.2, 3.3**

### Property 4: Limb Constraint Preservation

*For any* limb corrected by the constraint system, the corrected limb length SHALL be within 20% of baseline.

**Validates: Requirement 4.1, 4.2, 4.3**

### Property 5: Velocity-Based Interpolation Correctness

*For any* two consecutive frames with joint positions, the interpolated intermediate frame SHALL have joint positions that lie on the linear path between the two frames.

**Validates: Requirement 5.1, 5.2, 5.3**

### Property 6: Pipeline Ordering Consistency

*For any* frame processed through the pipeline, applying techniques in order (confidence → median → normalization → constraints → interpolation) SHALL produce identical results.

**Validates: Requirement 6.1, 6.2**

### Property 7: Performance Bound

*For any* frame, stabilization and interpolation SHALL complete in < 2ms on standard hardware.

**Validates: Requirement 6.6**

### Property 8: Latency Mode Correctness

*For any* latency mode, the system SHALL apply exactly the techniques specified for that mode without deviation.

**Validates: Requirement 8.1, 8.2, 8.3**

### Property 8: Configuration Atomicity

*For any* configuration change, the system SHALL apply it atomically to subsequent frames without partial application.

**Validates: Requirement 7.1, 7.2**

## Error Handling

- **Invalid Confidence Score**: Treat as 0 (unreliable)
- **Missing Keypoint**: Interpolate from previous frame or skip
- **Zero Torso Length**: Fall back to shoulder width
- **Invalid Limb Length**: Clamp to ±20% of baseline
- **Insufficient History**: Use available frames for median (don't pad)
- **Performance Timeout**: Log warning and return unfiltered frame

## Testing Strategy

### Unit Tests
- Confidence filtering with various thresholds
- Temporal median filter with edge cases (start of sequence, gaps)
- Skeleton normalization with different reference dimensions
- Limb constraint correction with various deviations
- Pipeline ordering and composition

### Property-Based Tests
- Confidence filtering correctness (Property 1)
- Temporal median consistency (Property 2)
- Normalization idempotence (Property 3)
- Limb constraint preservation (Property 4)
- Pipeline ordering consistency (Property 5)
- Performance bounds (Property 6)
- Latency mode correctness (Property 7)
- Configuration atomicity (Property 8)

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
