# Temporal Signal Sequences - Requirements Document

## Introduction

Temporal Signal Sequences are the mathematical foundation for understanding perfect trick execution. By uploading short (0-3 second) perfect videos of each trick phase, we extract precise measurements of how every body part moves over time. These become the "north star" reference that all rider attempts are compared against.

The goal is to create a database of perfect pose mathematics - not just positions, but the exact rates of change, accelerations, and body part coordination that define flawless execution. For example: "In a perfect backside 360 takeoff, the arms snap at 45°/frame, the upper body rotates at 8°/frame, and the lower body extends at 2°/frame."

This allows us to tell riders exactly what needs to change: "Your arm snap is 15°/frame too slow" or "Your upper body rotation is 120ms too early."

## Glossary

- **Signal Sequence**: A named movement pattern that spans multiple frames (e.g., "counter_rotation", "arm_snap")
- **Temporal Signal**: A measurement of how a body part or relationship changes over time (e.g., upper body rotation velocity)
- **Frame Range**: Start and end frames that define when a signal sequence occurs
- **Rate of Change**: How fast a signal is changing (derivative of the signal curve)
- **Peak Magnitude**: The maximum value reached during the sequence
- **Peak Timing**: When (normalized to [0,1]) the peak occurs
- **Body Part Relationship**: How two body parts move relative to each other (e.g., upper vs lower body)
- **Curve Comparison**: Comparing the shape and timing of signal curves, not just individual values

## Requirements

### Requirement 1: Frame Range Selection UI

**User Story:** As a coach, I want to mark the start and end frames of a signal sequence by navigating through video frames, so that I can precisely define when a movement pattern occurs.

#### Acceptance Criteria

1. WHEN a coach uploads a video and enters signal tagging mode THEN the system SHALL display a frame-by-frame video player with back/next navigation
2. WHEN a coach clicks "Mark Start" on a frame THEN the system SHALL record that frame number as the sequence start
3. WHEN a coach clicks "Mark End" on a frame THEN the system SHALL record that frame number as the sequence end
4. WHEN a coach marks start and end frames THEN the system SHALL display the frame range (e.g., "Frames 45-78") and allow editing
5. WHEN a coach marks frames THEN the system SHALL NOT render mesh overlays (pose visualization only)

### Requirement 2: Signal Sequence Definition

**User Story:** As a coach, I want to define a signal sequence type (e.g., "counter_rotation") and associate it with specific phases, so that I can categorize movement patterns.

#### Acceptance Criteria

1. WHEN creating a signal sequence THEN the system SHALL require: name, phase(s), description, and frame range
2. WHEN a coach specifies phases THEN the system SHALL allow multiple phases (e.g., "air" and "landing" for counter-rotation)
3. WHEN a coach provides a description THEN the system SHALL store it for reference (e.g., "Upper body slows, lower body speeds up")
4. WHEN a coach saves a signal sequence THEN the system SHALL validate that frame range is within video bounds
5. WHEN a coach saves a signal sequence THEN the system SHALL extract all temporal signals for that frame range

### Requirement 3: Complete Body Part Temporal Analysis

**User Story:** As a system, I want to extract precise measurements of how every body part moves during a phase, so that I can create a mathematical model of perfect execution.

#### Acceptance Criteria

1. WHEN extracting temporal signals from a perfect video THEN the system SHALL compute for EVERY body part: position, velocity, acceleration, and jerk (rate of acceleration change)
2. WHEN computing body part metrics THEN the system SHALL track: joint angles, distances between joints, and rotation rates
3. WHEN computing metrics THEN the system SHALL normalize by FPS to ensure consistency across different video frame rates
4. WHEN computing metrics THEN the system SHALL compute peak values, timing of peaks, and smoothness of curves
5. WHEN extracting signals THEN the system SHALL store the complete curve (all frame values), not just summary statistics
6. WHEN extracting signals THEN the system SHALL compute body part relationships (e.g., upper body rotation vs lower body rotation)
7. WHEN extracting signals THEN the system SHALL identify which body parts are accelerating vs decelerating at each frame

### Requirement 4: Curve Comparison Metrics

**User Story:** As a coach, I want to compare the shape and timing of movement curves, not just individual values, so that I can identify subtle differences in technique.

#### Acceptance Criteria

1. WHEN comparing two signal sequences THEN the system SHALL compute: peak magnitude delta, peak timing delta, and rate-of-change delta
2. WHEN comparing curves THEN the system SHALL measure how the shape differs (e.g., smooth vs jerky acceleration)
3. WHEN comparing curves THEN the system SHALL measure timing differences (e.g., "rider peaks 150ms earlier")
4. WHEN comparing curves THEN the system SHALL compute area-under-curve differences to measure overall magnitude
5. WHEN comparing curves THEN the system SHALL normalize both curves to [0, 1] time before comparison

### Requirement 5: LLM-Assisted Signal Analysis

**User Story:** As a coach, I want the system to analyze uploaded signal sequences and suggest what body parts are moving, so that I can quickly understand the movement pattern.

#### Acceptance Criteria

1. WHEN a coach uploads a signal sequence THEN the system SHALL send pose data to an LLM for analysis
2. WHEN the LLM analyzes a sequence THEN the system SHALL return: body parts involved, movement type, and coaching insights
3. WHEN the LLM provides analysis THEN the system SHALL suggest signal names and descriptions
4. WHEN the LLM provides analysis THEN the system SHALL identify which body parts are accelerating vs decelerating
5. WHEN the LLM provides analysis THEN the system SHALL suggest related signal sequences (e.g., "similar to arm_snap")

### Requirement 6: Perfect Pose Database

**User Story:** As a coach, I want to store complete pose mathematics for perfect trick execution, so that I have a reference database to compare all rider attempts against.

#### Acceptance Criteria

1. WHEN storing a perfect phase THEN the system SHALL save: trick name, phase, stance, frame range, and source video ID
2. WHEN storing a phase THEN the system SHALL save: complete pose timeline (all frames), mesh data, and all computed temporal signals
3. WHEN storing a phase THEN the system SHALL compute and save for EVERY body part: position curves, velocity curves, acceleration curves, and jerk curves
4. WHEN storing a phase THEN the system SHALL compute and save: body part relationships, symmetry metrics, and coordination patterns
5. WHEN storing a phase THEN the system SHALL allow querying by: trick, phase, stance, and body part
6. WHEN storing a phase THEN the system SHALL compute quality metrics (confidence, consistency, smoothness)
7. WHEN storing a phase THEN the system SHALL allow tagging (e.g., "explosive", "smooth", "reference") and notes

### Requirement 7: Rider to Perfect Comparison

**User Story:** As a system, I want to compare a rider's body part movements to the perfect reference, so that I can identify exactly what needs to change.

#### Acceptance Criteria

1. WHEN comparing rider to perfect reference THEN the system SHALL align both sequences to [0, 1] normalized time
2. WHEN comparing sequences THEN the system SHALL compute for EVERY body part: position delta, velocity delta, acceleration delta, and timing offset
3. WHEN comparing sequences THEN the system SHALL identify which body parts deviate most from perfect
4. WHEN comparing sequences THEN the system SHALL generate specific coaching feedback (e.g., "Your arm snap is 15°/frame too slow" or "Your upper body rotation peaks 120ms too early")
5. WHEN comparing sequences THEN the system SHALL compute a similarity score (0-100) for each body part and overall movement
6. WHEN comparing sequences THEN the system SHALL identify if deviations are timing-based or magnitude-based

### Requirement 8: Body Part Movement Analysis

**User Story:** As a coach, I want to understand which body parts are moving during a signal sequence, so that I can provide targeted coaching feedback.

#### Acceptance Criteria

1. WHEN analyzing a signal sequence THEN the system SHALL track: upper body rotation, lower body rotation, arm movement, head position
2. WHEN analyzing movement THEN the system SHALL compute: acceleration, deceleration, and peak velocity for each body part
3. WHEN analyzing movement THEN the system SHALL identify coordination patterns (e.g., "upper body leads, lower body follows")
4. WHEN analyzing movement THEN the system SHALL detect if body parts are moving in sync or offset
5. WHEN analyzing movement THEN the system SHALL flag asymmetries (e.g., "left arm moves faster than right")

### Requirement 9: Body Proportion Normalization

**User Story:** As a system, I want to normalize temporal signals by body proportions (height, arm length, leg length), so that I can fairly compare riders with different body sizes.

#### Acceptance Criteria

1. WHEN extracting temporal signals THEN the system SHALL compute body proportions: height, arm length, leg length, torso length, shoulder width
2. WHEN computing body proportions THEN the system SHALL use pose keypoints to calculate distances (e.g., shoulder-to-wrist for arm length)
3. WHEN storing a perfect phase THEN the system SHALL save the reference body proportions (from the coach's video)
4. WHEN comparing rider to perfect reference THEN the system SHALL normalize rider's body proportions to match reference proportions
5. WHEN normalizing proportions THEN the system SHALL scale position-based signals (e.g., joint distances) by the proportion ratio
6. WHEN normalizing proportions THEN the system SHALL NOT scale rotation-based signals (e.g., joint angles, rotation rates) - these are proportion-independent
7. WHEN normalizing proportions THEN the system SHALL compute a proportion mismatch score to flag significant size differences
8. WHEN normalizing proportions THEN the system SHALL allow manual override of proportion scaling if needed

## Acceptance Criteria Summary

| Requirement | Key Metrics | Testable |
|-------------|------------|----------|
| 1. Frame Selection | Frame range accuracy, UI responsiveness | Yes - example |
| 2. Signal Definition | Metadata storage, phase validation | Yes - property |
| 3. Temporal Extraction | Peak magnitude, timing, rate of change | Yes - property |
| 4. Curve Comparison | Delta computation, normalization | Yes - property |
| 5. LLM Analysis | Body part identification, suggestions | Yes - example |
| 6. Database Storage | Query performance, filtering | Yes - property |
| 7. Sequence Comparison | Alignment, similarity score | Yes - property |
| 8. Body Part Analysis | Movement tracking, coordination | Yes - property |
| 9. Body Proportion Normalization | Proportion scaling, mismatch detection | Yes - property |

## Design Principles

1. **Temporal First**: Measure how things change, not just what they are
2. **Normalized Comparison**: All sequences normalized to [0, 1] time for fair comparison
3. **Curve-Based**: Compare shapes and timing, not just peak values
4. **LLM-Assisted**: Use AI to understand movement patterns, not to make coaching decisions
5. **Database-Driven**: Build library of perfect sequences, not hardcoded rules
6. **Rate of Change**: Focus on acceleration/deceleration, not just position

## Example: Counter-Rotation Signal

```
Signal Name: counter_rotation
Phases: air, landing
Description: Upper body slows rotation, lower body speeds up to straighten for landing

Frame Range: 56-85 (30 frames)
Normalized Time: [0, 1]

Temporal Signals:
- upper_body_rotation: [45°, 42°, 38°, 32°, 25°, 18°, 12°, 8°, 5°, 3°]
  - Peak: 45° at t=0
  - Rate of change: -4.2°/frame average
  - Deceleration: smooth curve

- lower_body_rotation: [0°, 2°, 5°, 9°, 14°, 20°, 26°, 31°, 35°, 38°]
  - Peak: 38° at t=1
  - Rate of change: +4.2°/frame average
  - Acceleration: smooth curve

- separation: [45°, 40°, 33°, 23°, 11°, -2°, -14°, -23°, -30°, -35°]
  - Starts at 45° (upper leading)
  - Ends at -35° (lower leading)
  - Smooth transition

Body Parts Involved:
- Upper body: decelerating rotation
- Lower body: accelerating rotation
- Coordination: inverse relationship (one speeds up as other slows down)
```

## Next Steps

1. Clarify frame selection UI requirements
2. Define LLM prompt for signal analysis
3. Specify temporal signal extraction algorithms
4. Design curve comparison metrics
5. Plan database schema for signal sequences
