# Comparison Mode: Signal Definitions Spec

## Overview

This spec defines the measurable signals for the comparison mode feature. Signals are derived from real coaching language extracted from the Pinecone knowledge base (YouTube snowboarding tutorials).

## Files in This Spec

1. **requirements.md** - Formal EARS-compliant requirements
   - 8 requirements covering signal definition, body regions, phase relevance, stability, and delta computation
   - Open questions for refinement

2. **SIGNAL_BRAINSTORM.md** - Detailed brainstorm of all candidate signals
   - 20+ candidate signals evaluated for coach-relevance, stability, measurability
   - MVP signal set selected (9 signals across 4 phases)
   - Phase-specific relevance mapping

3. **COACHING_LANGUAGE_TO_SIGNALS.md** - Mapping from coaching language to signals
   - Real coaching language from Pinecone
   - How each signal maps to coaching feedback
   - Coaching archetypes (patterns coaches identify)

4. **PINECONE_ANALYSIS.md** - Analysis of Pinecone knowledge base
   - Key coaching concepts extracted
   - Signal design principles
   - Why this approach works

## MVP Signal Set (9 Signals)

### Setup Phase
- `heel_edge_pressure(t)` - Normalized pressure on heel edge
- `chest_hip_angle_to_corner(t)` - Angle of chest/hips relative to jump corner

### Takeoff Phase
- `arm_height_relative_to_chest(t)` - Vertical position of arms
- `upper_body_rotation_velocity(t)` - Speed of upper body rotation
- `torso_yaw_rotation(t)` - Total rotation angle of torso

### Air Phase
- `upper_lower_body_separation(t)` - Angle between upper/lower body rotation
- `head_position_stability(t)` - Variance in head position

### Landing Phase
- `left_right_foot_landing_sync(t)` - Time difference between foot landings
- `edge_pressure_at_landing(t)` - Toe vs heel edge pressure ratio

## Key Design Principles

1. **Grounded in Reality**: Signals come from what coaches actually say
2. **Actionable**: Each signal maps to specific coaching feedback
3. **Measurable**: All signals derive from pose data
4. **Scalable**: Same approach works for other tricks
5. **Honest**: We measure movement patterns, not physics

## Coaching Archetypes (Patterns to Detect)

- Early Extension
- Late Compression
- Arm Imbalance
- Premature Rotation
- Over-Connected
- Asymmetric Landing

## Next Steps

1. **Implement signal extraction** - Python code to compute all 9 signals
2. **Test on real videos** - Validate on 10–20 backside 360 videos
3. **Compute confidence scores** - Determine reliability of each signal
4. **Define archetype rules** - Create detection rules for coaching patterns
5. **Build comparison UI** - Display top 1–2 deltas per phase
6. **Validate with coaches** - Get feedback from real snowboarding coaches

## Status

✅ Requirements defined
✅ Signals identified from Pinecone
✅ Coaching language mapped to signals
✅ Archetypes defined
✅ **Backend functions mapped** - Most signals already exist in `phaseDetectionSignals.ts`!
⏳ Implementation (next phase)

## Key Discovery

You already have most of the signal extraction implemented in `backend/src/utils/phaseDetectionSignals.ts`! The `calculatePhaseDetectionSignals()` function computes:
- Edge angle (heel/toe pressure)
- Chest rotation and rotation velocity
- Arm positions
- Head rotation
- Body stackedness
- Form variance

See `BACKEND_MAPPING.md` for the complete mapping of coaching language to your existing backend functions.

## Questions for ChatGPT

1. Are these the right signals for snowboarding?
2. Should we add/remove any signals?
3. How to handle arm occlusion?
4. What's the acceptable threshold for "synchronized" landing?
5. How many reference examples per trick/phase?
