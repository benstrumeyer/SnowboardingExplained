# Signal Brainstorm: Snowboarding-Specific Metrics

This document lists all candidate signals for comparison mode, extracted from real coaching language in the Pinecone knowledge base. We'll evaluate each for stability, coach-relevance, and measurability.

## Real Coaching Language from Pinecone (Backside 360 Example)

Key coaching concepts extracted from real videos:
- **Setup carve**: "light heel pressure", "weight primarily set over board", "chest and hips pointed towards corner"
- **Wind-up**: "arms around chest high", "hips open", "upper body open"
- **Snap**: "maintain rotational momentum", "snap on one axis rotation", "finish snap as tail leaves"
- **Spotting**: "spot underneath arm", "keep head in general area", "track takeoff"
- **Counter-rotation**: "lead with upper body", "use counter rotation to speed up or slow down", "micro adjustments"
- **Landing**: "land both feet at same time", "dig in toe edge", "maintain strong powerful position"

These coaching concepts map directly to measurable signals.

## Hands & Arms Region

### Candidate Signals

| Signal | Definition | Coach Relevance | Stability | Notes |
|--------|-----------|-----------------|-----------|-------|
| `hand_height_relative_to_hips(t)` | Vertical distance from hand to hip center, normalized by rider height | HIGH - Coaches watch arm position constantly | MEDIUM - Depends on hand detection | Can detect "arms up too early" or "arms not high enough" |
| `left_right_hand_height_delta(t)` | Difference between left and right hand height | HIGH - Asymmetry is coachable | HIGH - Relative measurement is robust | Detects "one arm higher than the other" |
| `arm_extension_angle(t)` | Angle between shoulder and wrist (elbow as pivot) | MEDIUM - Less direct than height | MEDIUM - Requires 3 joints | Useful for "arms bent vs straight" |
| `hand_distance_from_torso(t)` | Distance from hand to torso center | LOW - Less coach-relevant | MEDIUM - Depends on torso stability | Might be redundant with height |
| `hand_velocity(t)` | Speed of hand movement (magnitude of velocity vector) | MEDIUM - Shows "snappy" vs "slow" arms | LOW - Raw coordinates are noisy | Risky without smoothing |
| `hand_acceleration(t)` | Acceleration of hand movement | LOW - Too noisy | LOW - Double derivative amplifies noise | Avoid for MVP |

### MVP Selection
- ✅ `hand_height_relative_to_hips(t)` - Core signal
- ✅ `left_right_hand_height_delta(t)` - Symmetry check
- ❌ `arm_extension_angle(t)` - Too complex for MVP
- ❌ Others - Too noisy or redundant

---

## Chest & Torso Region

### Candidate Signals

| Signal | Definition | Coach Relevance | Stability | Notes |
|--------|-----------|-----------------|-----------|-------|
| `torso_yaw_rotation(t)` | Rotation angle around vertical axis (shoulders relative to hips) | HIGH - Rotation timing is critical | MEDIUM - Depends on shoulder/hip stability | "Spinning too early" or "spinning too late" |
| `torso_pitch_angle(t)` | Forward/backward lean (shoulders relative to hips) | MEDIUM - Affects balance | MEDIUM - Depends on shoulder/hip stability | "Leaning forward" vs "upright" |
| `torso_roll_angle(t)` | Side-to-side tilt (shoulder height difference) | LOW - Less coach-relevant | HIGH - Easy to measure | Might be useful for edge control |
| `rotation_velocity(t)` | Speed of torso rotation (d(yaw)/dt) | HIGH - "Explosive" vs "slow" rotation | MEDIUM - Derivative of yaw | Detects "spinning too fast" or "spinning too slow" |
| `rotation_acceleration(t)` | Acceleration of rotation (d²(yaw)/dt²) | MEDIUM - Shows "snappy" vs "gradual" | LOW - Double derivative is noisy | Risky for MVP |
| `shoulder_hip_distance(t)` | Distance between shoulder and hip centers | LOW - Not coach-relevant | HIGH - Stable measurement | Might indicate compression/extension |

### MVP Selection
- ✅ `torso_yaw_rotation(t)` - Core signal
- ✅ `rotation_velocity(t)` - Detects speedups/slowdowns
- ❌ `torso_pitch_angle(t)` - Secondary for MVP
- ❌ Others - Too noisy or less relevant

---

## Legs & Lower Body Region

### Candidate Signals

| Signal | Definition | Coach Relevance | Stability | Notes |
|--------|-----------|-----------------|-----------|-------|
| `knee_flexion_angle(t)` | Angle at knee joint (0° = straight, 90° = bent) | HIGH - Core compression metric | HIGH - Stable joint angle | "Bending knees" vs "staying straight" |
| `hip_extension_angle(t)` | Angle at hip joint | HIGH - Shows hip pop | HIGH - Stable joint angle | "Hips extended" vs "hips bent" |
| `left_right_knee_angle_delta(t)` | Difference between left and right knee angles | HIGH - Asymmetry is coachable | HIGH - Relative measurement | "One leg more bent than the other" |
| `knee_extension_velocity(t)` | Speed of knee extension (d(knee_flexion)/dt) | HIGH - "Explosive" vs "slow" pop | MEDIUM - Derivative of angle | Detects "popping hard" vs "weak pop" |
| `ankle_flexion_angle(t)` | Angle at ankle joint | LOW - Hard to measure, less relevant | LOW - Ankle detection is unreliable | Skip for MVP |
| `leg_symmetry_score(t)` | Overall left-right symmetry (combined knees + hips) | MEDIUM - Holistic view | HIGH - Composite of stable signals | Useful for "balanced" vs "lopsided" |
| `hip_extension_velocity(t)` | Speed of hip extension (d(hip_angle)/dt) | MEDIUM - Shows "snappy" hips | MEDIUM - Derivative of angle | Secondary signal |

### MVP Selection
- ✅ `knee_flexion_angle(t)` - Core signal
- ✅ `hip_extension_angle(t)` - Core signal
- ✅ `left_right_knee_angle_delta(t)` - Symmetry check
- ✅ `knee_extension_velocity(t)` - Detects speedups/slowdowns
- ❌ `ankle_flexion_angle(t)` - Unreliable
- ❌ Others - Secondary for MVP

---

## Cross-Body Signals (Advanced, Post-MVP)

| Signal | Definition | Coach Relevance | Stability | Notes |
|--------|-----------|-----------------|-----------|-------|
| `upper_lower_body_sync(t)` | Timing alignment between arm and leg movements | HIGH - "Pop and arms together" | LOW - Requires cross-body correlation | Post-MVP |
| `center_of_mass_height(t)` | Estimated vertical position of center of mass | MEDIUM - Shows "air awareness" | LOW - Requires full body model | Post-MVP |
| `board_angle_relative_to_body(t)` | Angle between board and torso | HIGH - Shows "tweaking" | LOW - Requires board detection | Post-MVP |

---

## Summary: MVP Signal Set (Based on Real Coaching Language)

### Setup Phase Signals
1. **`heel_edge_pressure(t)`** - Normalized pressure on heel edge during setup carve
   - Coach language: "light heel pressure", "weight primarily set over board"
   - Detects: "too much heel pressure" (turning too much), "not enough pressure" (losing edge)

2. **`chest_hip_angle_to_corner(t)`** - Angle of chest/hips relative to jump corner
   - Coach language: "chest and hips pointed towards corner", "hips open", "upper body open"
   - Detects: "not opening up enough", "opening too much"

### Takeoff Phase Signals
3. **`arm_height_relative_to_chest(t)`** - Vertical position of arms during wind-up
   - Coach language: "arms around chest high", "arms too high or too low"
   - Detects: "arms too high" (affects axis), "arms too low" (causes cork)

4. **`upper_body_rotation_velocity(t)`** - Speed of upper body rotation during snap
   - Coach language: "maintain rotational momentum", "snap on one axis", "leading with upper body"
   - Detects: "snapping too fast", "snapping too slow", "not maintaining momentum"

5. **`torso_yaw_rotation(t)`** - Total rotation angle of torso
   - Coach language: "rotation", "counter-rotation", "leading rotation"
   - Detects: "under-rotating", "over-rotating", "rotation not smooth"

### Air Phase Signals
6. **`upper_lower_body_separation(t)`** - Angle between upper body and lower body rotation
   - Coach language: "upper body leading", "counter-rotation", "micro adjustments"
   - Detects: "too connected" (no micro control), "too separated" (losing balance)

7. **`head_position_stability(t)`** - Variance in head position (should be minimal)
   - Coach language: "keep head in general area", "stable head position", "track takeoff"
   - Detects: "head moving too much", "looking wrong direction"

### Landing Phase Signals
8. **`left_right_foot_landing_sync(t)`** - Time difference between left and right foot landing
   - Coach language: "land both feet at same time", "maintain strong position"
   - Detects: "landing one foot first", "asymmetric landing"

9. **`edge_pressure_at_landing(t)`** - Toe vs heel edge pressure during landing
   - Coach language: "land with toe pressure or flat base", "dig in toe edge"
   - Detects: "landing on heel edge" (under-rotating), "landing on toe edge" (over-rotating)

**Total: 9 signals across 4 phases**

### Why These Signals Work
- ✅ Directly map to real coaching language from Pinecone
- ✅ Measurable from pose data (joint angles, positions, velocities)
- ✅ Phase-specific (different signals matter in different phases)
- ✅ Actionable (riders can improve each one)
- ✅ Stable (derived from joint angles, not raw coordinates)

---

## Phase-Specific Relevance

### Approach Phase
- Relevant: `torso_yaw_rotation`, `knee_flexion_angle`, `hand_height_relative_to_hips`
- Why: Setting up for takeoff, establishing rhythm

### Takeoff Phase
- Relevant: `knee_extension_velocity`, `torso_yaw_rotation`, `hand_height_relative_to_hips`, `hip_extension_angle`
- Why: Pop timing, arm timing, rotation initiation

### Rotation Phase
- Relevant: `torso_yaw_rotation`, `rotation_velocity`, `left_right_knee_angle_delta`, `left_right_hand_height_delta`
- Why: Spin speed, body alignment, symmetry

### Landing Phase
- Relevant: `knee_flexion_angle`, `torso_pitch_angle`, `left_right_hand_height_delta`, `hip_extension_angle`
- Why: Absorption, balance, symmetry

---

## Open Questions

1. **Hand occlusion**: In snowboarding, hands are often occluded by the body or board. How do we handle this?
   - Option A: Mark as low confidence and deprioritize
   - Option B: Use shoulder position as proxy
   - Option C: Skip hand signals if confidence < 0.7

2. **Torso stability**: Is torso rotation stable enough, or should we use shoulder/hip angles separately?
   - Need to test on 10–20 real videos

3. **Velocity smoothing**: How much smoothing is too much? (Savitzky–Golay vs EMA vs raw)
   - Need to test on real data

4. **Reference data**: How many "perfect" examples per trick/phase?
   - Estimate: 3–5 high-quality reference videos per trick

5. **Confidence thresholds**: What's the right threshold for "good enough"?
   - Estimate: 0.7 for individual joints, 0.6 for composite signals

---

## Next Steps

1. Implement signal extraction for all 8 MVP signals
2. Test on 10–20 real snowboarding videos
3. Compute confidence scores and identify unstable signals
4. Refine thresholds based on real data
5. Define coaching archetypes (e.g., "early_extension" = knee_extension_velocity peak occurs early + torso_yaw_rotation peak occurs late)
