# Summary for ChatGPT: Signal Definitions for Comparison Mode

## What We Did

We analyzed the Pinecone knowledge base (real snowboarding coaching videos) to extract signals for the comparison mode feature. Instead of guessing what signals matter, we extracted them from what coaches actually say.

**IMPORTANT**: You already have most of these signals implemented in `backend/src/utils/phaseDetectionSignals.ts`! We're mapping coaching language to your existing backend functions.

## The 9 MVP Signals (Based on Real Coaching Language + Your Backend)

### Setup Phase (2 signals)
1. **heel_edge_pressure(t)** - Coach says: "Light heel pressure, weight primarily set over board"
2. **chest_hip_angle_to_corner(t)** - Coach says: "Chest and hips pointed towards corner, hips open"

### Takeoff Phase (3 signals)
3. **arm_height_relative_to_chest(t)** - Coach says: "Arms around chest high, arms too high or too low affects axis"
4. **upper_body_rotation_velocity(t)** - Coach says: "Maintain rotational momentum, snap on one axis"
5. **torso_yaw_rotation(t)** - Coach says: "Finish snap as tail leaves, maintain consistent motion"

### Air Phase (2 signals)
6. **upper_lower_body_separation(t)** - Coach says: "Upper body leading rotation, counter-rotation for micro adjustments"
7. **head_position_stability(t)** - Coach says: "Keep head in general area, stable head position"

### Landing Phase (2 signals)
8. **left_right_foot_landing_sync(t)** - Coach says: "Land both feet at same time"
9. **edge_pressure_at_landing(t)** - Coach says: "Land with toe pressure or flat base, dig in toe edge"

## Coaching Archetypes (Patterns to Detect)

These are recurring problems coaches identify:

1. **Early Extension** - "You're extending your legs too early, before your shoulders are ready"
   - Signals: rotation_velocity peaks early, torso_yaw peaks early

2. **Late Compression** - "You're holding your compression too long, delaying your snap"
   - Signals: heel_edge_pressure stays high too long, rotation_velocity starts late

3. **Arm Imbalance** - "One arm is higher than the other, affecting your axis"
   - Signals: arm_height asymmetric left-right

4. **Premature Rotation** - "You're rotating before you've fully snapped"
   - Signals: torso_yaw peaks before rotation_velocity peaks

5. **Over-Connected** - "You're too connected, you don't have micro control"
   - Signals: upper_lower_body_separation too small throughout air

6. **Asymmetric Landing** - "You're landing one foot before the other"
   - Signals: left_right_foot_landing_sync > threshold

## Why This Approach Works

✅ **Grounded in Reality** - Signals come from what coaches actually say
✅ **Actionable** - Each signal maps to specific coaching feedback
✅ **Measurable** - All signals derive from pose data (joint angles, velocities)
✅ **Scalable** - Same approach works for other tricks
✅ **Honest** - We measure movement patterns, not physics

## Questions for You

1. **Are these the right signals?** Do they match what you'd expect coaches to care about?

2. **Should we add/remove any?** Are there other coaching concepts we missed?

3. **Arm occlusion** - In snowboarding videos, how often are arms hidden by the body or board? Should we have a fallback?

4. **Head tracking** - Is head position stable enough to measure, or should we use shoulder/hip angles as proxy?

5. **Landing sync threshold** - What's acceptable? 1 frame? 2 frames? 3 frames?

6. **Reference data** - How many "perfect" examples do we need per trick/phase?

7. **Other tricks** - Should we validate this approach on frontside 360 or other tricks?

## Next Steps

1. Get your feedback on the signals
2. Implement signal extraction in Python
3. Test on 10–20 real backside 360 videos
4. Compute confidence scores
5. Define archetype detection rules
6. Build comparison UI

## Files to Review

- `requirements.md` - Formal spec
- `SIGNAL_BRAINSTORM.md` - Detailed signal analysis
- `COACHING_LANGUAGE_TO_SIGNALS.md` - Mapping from coaching to signals
- `PINECONE_ANALYSIS.md` - Analysis of Pinecone knowledge base
- `README.md` - Overview

All files are in: `.kiro/specs/comparison-mode-signals/`
