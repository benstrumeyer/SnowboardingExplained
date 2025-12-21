# Comparison Mode: Signal Definitions for Snowboarding

## Introduction

This spec defines the measurable signals we extract from pose data to enable meaningful trick comparison and coaching feedback. The goal is to identify 1–3 signals per body region that are:
- **Interpretable**: Coaches understand them immediately
- **Stable**: Pose models reliably measure them
- **Actionable**: Riders can improve them

We are NOT trying to measure physics or predict outcomes. We are measuring movement patterns that coaches care about.

## Glossary

- **Signal**: A derived metric computed from joint angles (not raw coordinates)
- **Phase**: A distinct part of a trick (approach, takeoff, rotation, landing)
- **Phase-normalized time**: Time mapped to [0, 1] within a phase, independent of clip length
- **Velocity**: Rate of change of a signal over time (ds/dt)
- **Acceleration**: Rate of change of velocity (d²s/dt²)
- **Delta**: Difference between rider's signal and reference signal
- **Coaching archetype**: A named pattern (e.g., "early extension") that maps to coaching feedback

## Requirements

### Requirement 1: Define Core Body Region Signals

**User Story:** As a coach, I want to understand what the rider's body is doing in each phase, so that I can give specific, actionable feedback.

#### Acceptance Criteria

1. WHEN extracting signals from pose data THEN the system SHALL define 1–3 signals per body region (hands/arms, chest/torso, legs)
2. WHEN a signal is defined THEN it SHALL be derived from joint angles, not raw (x, y, z) coordinates
3. WHEN comparing signals THEN the system SHALL compute velocity and acceleration curves for each signal
4. WHEN ranking signals for coaching THEN the system SHALL prioritize signals that coaches use in real feedback
5. WHERE a signal is ambiguous or unstable THEN the system SHALL be excluded from the initial MVP

### Requirement 2: Hands & Arms Signals

**User Story:** As a coach analyzing arm position, I want to know if the rider's arms are moving at the right time and in the right way, so I can correct timing and symmetry issues.

#### Acceptance Criteria

1. WHEN analyzing hand position THEN the system SHALL measure hand_height_relative_to_hips(t) as a normalized vertical distance
2. WHEN analyzing arm symmetry THEN the system SHALL measure left_right_hand_height_delta(t) to detect imbalances
3. WHEN analyzing arm extension THEN the system SHALL measure arm_extension_angle(t) as the angle between shoulder and wrist
4. WHERE hand position is occluded or unreliable THEN the system SHALL mark confidence < 0.7 and deprioritize in coaching output

### Requirement 3: Chest & Torso Signals

**User Story:** As a coach analyzing upper body rotation, I want to know if the rider is rotating at the right time and speed, so I can correct premature or delayed rotation.

#### Acceptance Criteria

1. WHEN analyzing torso rotation THEN the system SHALL measure torso_yaw_rotation(t) as the angle between shoulders and hips
2. WHEN analyzing torso pitch THEN the system SHALL measure torso_pitch_angle(t) to detect forward/backward lean
3. WHEN analyzing rotation speed THEN the system SHALL compute rotation_velocity(t) = d(torso_yaw)/dt to detect speedups/slowdowns
4. WHERE torso rotation is ambiguous THEN the system SHALL validate against shoulder and hip joint angles

### Requirement 4: Legs & Lower Body Signals

**User Story:** As a coach analyzing leg mechanics, I want to know if the rider is compressing and extending at the right time, so I can correct timing and range of motion issues.

#### Acceptance Criteria

1. WHEN analyzing leg compression THEN the system SHALL measure knee_flexion_angle(t) as the angle at the knee joint
2. WHEN analyzing hip extension THEN the system SHALL measure hip_extension_angle(t) as the angle at the hip
3. WHEN analyzing leg symmetry THEN the system SHALL measure left_right_knee_angle_delta(t) to detect imbalances
4. WHEN analyzing extension speed THEN the system SHALL compute knee_extension_velocity(t) = d(knee_flexion)/dt to detect explosive vs slow extension

### Requirement 5: Phase-Specific Signal Relevance

**User Story:** As a system, I want to know which signals matter in each phase, so I can surface only relevant coaching facts.

#### Acceptance Criteria

1. WHEN in takeoff phase THEN the system SHALL prioritize: knee_extension_velocity, torso_yaw_rotation, hand_height_relative_to_hips
2. WHEN in rotation phase THEN the system SHALL prioritize: torso_yaw_rotation, rotation_velocity, left_right_knee_angle_delta
3. WHEN in landing phase THEN the system SHALL prioritize: knee_flexion_angle, torso_pitch_angle, left_right_hand_height_delta
4. WHERE a signal has low confidence in a phase THEN the system SHALL deprioritize it in coaching output

### Requirement 6: Signal Stability & Validation

**User Story:** As a system, I want to ensure signals are reliable before using them for coaching, so I don't give bad feedback.

#### Acceptance Criteria

1. WHEN computing a signal THEN the system SHALL validate that all constituent joints have confidence > 0.6
2. WHEN a signal is computed THEN the system SHALL smooth it using Savitzky–Golay filter (window=5, order=2) to reduce noise
3. WHEN comparing signals THEN the system SHALL compute confidence as the minimum confidence of constituent joints
4. WHERE a signal has confidence < 0.7 THEN the system SHALL mark it as "low confidence" in coaching output

### Requirement 7: Delta Computation & Ranking

**User Story:** As a coach, I want to see only the 1–2 most important differences, so I'm not overwhelmed with data.

#### Acceptance Criteria

1. WHEN comparing rider to reference THEN the system SHALL compute delta metrics: peak magnitude (Δmax), peak timing (Δt_peak), velocity peak (Δv_peak)
2. WHEN ranking deltas THEN the system SHALL score each as: |Δ| × confidence × coaching_weight
3. WHEN surfacing coaching facts THEN the system SHALL show only top 1–2 deltas per phase
4. WHERE a delta is below a threshold THEN the system SHALL suppress it to avoid noise

### Requirement 8: Mapping Deltas to Coaching Archetypes

**User Story:** As a coach, I want to understand what the numbers mean in coaching language, so I can give actionable feedback.

#### Acceptance Criteria

1. WHEN a delta is detected THEN the system SHALL map it to a coaching archetype (e.g., "early_extension", "arm_imbalance")
2. WHEN mapping to archetype THEN the system SHALL include supporting metrics (e.g., "knee_extension_delta: +15°, timing_offset: -120ms")
3. WHEN an archetype is detected THEN the system SHALL include confidence score and phase context
4. WHERE multiple archetypes apply THEN the system SHALL rank by coaching importance and surface top 1–2

## Signal Definitions (From Real Coaching Language)

### Setup Phase
- **heel_edge_pressure(t)**: Normalized pressure on heel edge during setup carve
- **chest_hip_angle_to_corner(t)**: Angle of chest/hips relative to jump corner

### Takeoff Phase
- **arm_height_relative_to_chest(t)**: Vertical position of arms during wind-up
- **upper_body_rotation_velocity(t)**: Speed of upper body rotation during snap
- **torso_yaw_rotation(t)**: Total rotation angle of torso

### Air Phase
- **upper_lower_body_separation(t)**: Angle between upper body and lower body rotation
- **head_position_stability(t)**: Variance in head position

### Landing Phase
- **left_right_foot_landing_sync(t)**: Time difference between left and right foot landing
- **edge_pressure_at_landing(t)**: Toe vs heel edge pressure ratio at landing

## Open Questions for Refinement

1. **Arm occlusion**: How often are arms occluded in snowboarding videos? Should we have a fallback signal?
2. **Head tracking**: Is head position stable enough to measure, or should we use shoulder/hip angles as proxy?
3. **Foot landing sync**: What's the acceptable threshold for "synchronized" landing (1 frame? 2 frames?)?
4. **Phase boundaries**: How do we handle transitions between phases? Should we smooth across boundaries?
5. **Reference data**: How many "perfect" examples do we need per trick/phase to establish reliable reference curves?

## Next Steps

1. Validate signal definitions with real snowboarding videos
2. Compute confidence scores for each signal across 10–20 test videos
3. Define coaching archetypes and their detection rules
4. Implement signal extraction and delta computation
5. Build comparison UI with top 1–2 deltas per phase
