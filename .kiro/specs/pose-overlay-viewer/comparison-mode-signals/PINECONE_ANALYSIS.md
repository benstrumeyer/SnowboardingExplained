# Pinecone Analysis: Extracting Signals from Real Coaching

## Source Data

**File**: `data-pipeline/data/pinecone-dump.json`
**Content**: Transcribed coaching videos from YouTube snowboarding tutorials
**Example**: "Backside 360s Fully Explained!" - 1627 seconds of detailed coaching breakdown

## Key Coaching Concepts Extracted

### 1. Setup Phase
**Coach says**: "Light heel pressure, weight primarily set over board"
- Coaches emphasize **pressure distribution** and **balance**
- Too much heel pressure → turns too much, loses control
- Too little → loses edge grip

**Coach says**: "Chest and hips pointed towards corner, hips open, upper body open"
- Coaches emphasize **body angle** and **range of motion**
- Opening up hips/chest → more room to snap
- Not opening enough → limited rotation range

### 2. Takeoff Phase
**Coach says**: "Arms around chest high, arms too high or too low affects axis rotation"
- Coaches emphasize **arm positioning** and **axis control**
- Arms too high → dips and tosses the spin
- Arms too low → corking the spin (angling it down)

**Coach says**: "Maintain rotational momentum, snap on one axis, leading with upper body"
- Coaches emphasize **consistency** and **upper body leadership**
- Snap should be smooth, not jerky
- Upper body leads, lower body follows

**Coach says**: "Finish snap as tail leaves, maintain consistent range of motion"
- Coaches emphasize **timing** and **momentum**
- Snap should finish as tail leaves takeoff
- Momentum carries through to landing

### 3. Air Phase
**Coach says**: "Upper body leading rotation, counter-rotation for micro adjustments"
- Coaches emphasize **separation** and **control**
- Upper body leads → enables counter-rotation
- Counter-rotation → micro adjustments for landing

**Coach says**: "Keep head in general area, stable head position, track takeoff"
- Coaches emphasize **head stability** and **spotting**
- Head movement affects body angle
- Spotting underneath arm is fastest way to spot

### 4. Landing Phase
**Coach says**: "Land both feet at same time, maintain strong powerful position"
- Coaches emphasize **synchronization** and **strength**
- Both feet landing together → balanced landing
- Strong position → absorbs impact

**Coach says**: "Land with toe pressure or flat base, dig in toe edge"
- Coaches emphasize **edge control** and **momentum management**
- Toe/flat base → properly rotated
- Heel edge → under-rotated

---

## Signal Design Principles (From Coaching Language)

### 1. Timing is Everything
Coaches repeatedly mention **when** things happen:
- "Finish snap as tail leaves"
- "Spot before 180 degrees"
- "Land both feet at same time"

**Signal Design**: Compute **peak timing** deltas (Δt_peak)

### 2. Consistency Matters
Coaches emphasize **smooth, consistent motion**:
- "Maintain consistent range of motion"
- "Smooth rotation"
- "Stable head position"

**Signal Design**: Compute **velocity profiles** and **variance**

### 3. Separation Enables Control
Coaches emphasize **upper/lower body separation**:
- "Upper body leading"
- "Counter-rotation"
- "Micro adjustments"

**Signal Design**: Compute **upper_lower_body_separation** angle

### 4. Symmetry is Coachable
Coaches mention **left-right balance**:
- "Land both feet at same time"
- "One arm higher than the other"

**Signal Design**: Compute **left-right deltas**

### 5. Pressure/Force Matters
Coaches mention **how hard** things are done:
- "Light heel pressure"
- "Snap hard"
- "Dig in toe edge"

**Signal Design**: Compute **velocity peaks** (proxy for force)

---

## Coaching Archetypes (Patterns Coaches Identify)

From the Pinecone data, coaches identify these recurring problems:

### Early Extension
**Coach observation**: "You're extending your legs too early, before your shoulders are ready"
**Signals**: 
- `upper_body_rotation_velocity` peaks early
- `torso_yaw_rotation` peaks early
- `heel_edge_pressure` drops too early

### Late Compression
**Coach observation**: "You're holding your compression too long, delaying your snap"
**Signals**:
- `heel_edge_pressure` stays high too long
- `upper_body_rotation_velocity` starts late
- `torso_yaw_rotation` peaks late

### Arm Imbalance
**Coach observation**: "One arm is higher than the other, affecting your axis"
**Signals**:
- `arm_height_relative_to_chest` asymmetric left-right
- `torso_yaw_rotation` slightly corked

### Premature Rotation
**Coach observation**: "You're rotating before you've fully snapped"
**Signals**:
- `torso_yaw_rotation` peaks before `upper_body_rotation_velocity` peaks
- `upper_lower_body_separation` too small early

### Over-Connected
**Coach observation**: "You're too connected, you don't have micro control for landing adjustments"
**Signals**:
- `upper_lower_body_separation` too small throughout air phase
- `edge_pressure_at_landing` off (can't adjust)

### Asymmetric Landing
**Coach observation**: "You're landing one foot before the other, affecting your balance"
**Signals**:
- `left_right_foot_landing_sync` > 2 frames
- `edge_pressure_at_landing` asymmetric

---

## Why This Approach Works

1. **Grounded in Reality**: Signals come from what coaches actually say, not theoretical biomechanics
2. **Actionable**: Each signal maps to specific coaching feedback
3. **Measurable**: All signals derive from pose data (joint angles, positions, velocities)
4. **Scalable**: Same approach works for other tricks (frontside 360, 540, etc.)
5. **Honest**: We're not claiming to measure physics, just movement patterns coaches care about

---

## Next Steps

1. Implement all 9 signals in Python
2. Test on 10–20 real backside 360 videos from Pinecone
3. Compute confidence scores for each signal
4. Define archetype detection rules
5. Build comparison UI showing top 1–2 deltas per phase
6. Validate with real coaches
