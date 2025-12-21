# Coaching Language → Signals Mapping

This document maps real coaching language from the Pinecone knowledge base to measurable signals.

## Backside 360 Coaching Breakdown

### Setup Phase

**Coaching Language**: "Light heel pressure, weight primarily set over board"
- **Signal**: `heel_edge_pressure(t)`
- **Measurement**: Normalized pressure on heel edge (0-1 scale)
- **Coaching Feedback**: 
  - If too high: "You're leaning back too much, losing balance"
  - If too low: "You're not engaging the heel edge enough"

**Coaching Language**: "Chest and hips pointed towards corner, hips open, upper body open"
- **Signal**: `chest_hip_angle_to_corner(t)`
- **Measurement**: Angle between chest/hip line and jump corner (degrees)
- **Coaching Feedback**:
  - If too small: "You're not opening up enough, limiting your range of motion"
  - If too large: "You're opening too much, losing control"

---

### Takeoff Phase

**Coaching Language**: "Arms around chest high, arms too high or too low affects axis rotation"
- **Signal**: `arm_height_relative_to_chest(t)`
- **Measurement**: Vertical distance from arm to chest center (normalized)
- **Coaching Feedback**:
  - If too high: "Your arms are too high, you're affecting your axis"
  - If too low: "Your arms are too low, you're corking the spin"

**Coaching Language**: "Maintain rotational momentum, snap on one axis, leading with upper body"
- **Signal**: `upper_body_rotation_velocity(t)`
- **Measurement**: Angular velocity of upper body (degrees/frame)
- **Coaching Feedback**:
  - If too fast: "You're snapping too hard, losing control"
  - If too slow: "You're not snapping hard enough, weak rotation"
  - If inconsistent: "Your snap is jerky, not smooth"

**Coaching Language**: "Finish snap as tail leaves, maintain consistent range of motion"
- **Signal**: `torso_yaw_rotation(t)`
- **Measurement**: Total rotation angle of torso (degrees)
- **Coaching Feedback**:
  - If peaks early: "You're finishing your snap too early"
  - If peaks late: "You're finishing your snap too late"

---

### Air Phase

**Coaching Language**: "Upper body leading rotation, counter-rotation for micro adjustments"
- **Signal**: `upper_lower_body_separation(t)`
- **Measurement**: Angle between upper body and lower body rotation (degrees)
- **Coaching Feedback**:
  - If too small: "You're too connected, no micro control"
  - If too large: "You're too separated, losing balance"
  - If timing is off: "Your upper body isn't leading the rotation"

**Coaching Language**: "Keep head in general area, stable head position, track takeoff"
- **Signal**: `head_position_stability(t)`
- **Measurement**: Variance in head position (pixels or normalized distance)
- **Coaching Feedback**:
  - If high variance: "Your head is moving too much, affecting balance"
  - If looking wrong direction: "You're spotting in the wrong direction"

---

### Landing Phase

**Coaching Language**: "Land both feet at same time, maintain strong powerful position"
- **Signal**: `left_right_foot_landing_sync(t)`
- **Measurement**: Time difference between left and right foot landing (frames)
- **Coaching Feedback**:
  - If left lands first: "Your left foot is landing early"
  - If right lands first: "Your right foot is landing early"
  - If synchronized: "Perfect landing sync!"

**Coaching Language**: "Land with toe pressure or flat base, dig in toe edge"
- **Signal**: `edge_pressure_at_landing(t)`
- **Measurement**: Toe vs heel edge pressure ratio at landing
- **Coaching Feedback**:
  - If too much heel: "You're landing on your heels, you're under-rotating"
  - If too much toe: "You're landing on your toes, you're over-rotating"
  - If balanced: "Perfect edge pressure at landing!"

---

## Coaching Archetypes (Patterns to Detect)

### Early Extension
**Signals**: `upper_body_rotation_velocity` peaks early + `torso_yaw_rotation` peaks early
**Coaching**: "You're extending your legs too early, before your shoulders are ready"

### Late Compression
**Signals**: `heel_edge_pressure` stays high too long + `upper_body_rotation_velocity` starts late
**Coaching**: "You're holding your compression too long, delaying your snap"

### Arm Imbalance
**Signals**: `arm_height_relative_to_chest` asymmetric left-right
**Coaching**: "One arm is higher than the other, affecting your axis"

### Premature Rotation
**Signals**: `torso_yaw_rotation` peaks before `upper_body_rotation_velocity` peaks
**Coaching**: "You're rotating before you've fully snapped"

### Over-Connected
**Signals**: `upper_lower_body_separation` too small throughout air phase
**Coaching**: "You're too connected, you don't have micro control for landing adjustments"

### Asymmetric Landing
**Signals**: `left_right_foot_landing_sync` > 2 frames
**Coaching**: "You're landing one foot before the other, affecting your balance"

---

## Implementation Notes

1. **Phase Boundaries**: Signals should be computed per-phase (setup, takeoff, air, landing)
2. **Smoothing**: All signals should be smoothed with Savitzky–Golay filter (window=5, order=2)
3. **Confidence**: Compute confidence as minimum confidence of constituent joints
4. **Normalization**: Phase-normalize time to [0, 1] for cross-video comparison
5. **Ranking**: Score deltas as |Δ| × confidence × coaching_weight, surface top 1–2 per phase

---

## Next Steps

1. Implement signal extraction for all 9 signals
2. Test on 10–20 real backside 360 videos
3. Compute confidence scores and identify unstable signals
4. Define coaching archetype detection rules
5. Build comparison UI with top 1–2 deltas per phase
