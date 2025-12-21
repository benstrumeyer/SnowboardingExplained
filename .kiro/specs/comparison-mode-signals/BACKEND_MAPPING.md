# Backend Function Mapping

This document maps the 9 MVP signals to your existing backend functions in `phaseDetectionSignals.ts`.

## Existing Backend Functions (Already Implemented)

Your `calculatePhaseDetectionSignals()` function already computes:

### Setup Phase
- ✅ **edgeAngle** - `calculateEdgeAngle()` - Heel/toe pressure
- ✅ **chestRotation** - `calculateChestRotation()` - Chest angle relative to board

### Takeoff Phase
- ✅ **armPosition** - `detectArmPositions()` - Arm angles and direction
- ✅ **chestRotationVelocity** - `calculateVelocity(chestRotation)` - Rotation speed
- ✅ **chestRotation** - Already computed above

### Air Phase
- ✅ **headRotation** - `calculateHeadRotation()` - Head rotation relative to body
- ✅ **bodyStackedness** - `calculateBodyStackedness()` - Upper/lower body alignment
- ✅ **formVariance** - `calculateFormVariance()` - Rate of body position change

### Landing Phase
- ✅ **edgeAngle** - Already computed (for landing edge pressure)
- ⚠️ **ankleToHipRatio** - `calculateAncleToHipRatio()` - Airborne detection (can be used for landing sync)

## Mapping: Coaching Language → Backend Functions

### Setup Phase

**Coaching**: "Light heel pressure, weight primarily set over board"
- **Signal**: `heel_edge_pressure(t)`
- **Backend Function**: `calculateEdgeAngle()` 
- **Location**: `phaseDetectionSignals.ts:63-75`
- **How it works**: Uses ankle positions to infer edge angle (positive = toeside, negative = heelside)

**Coaching**: "Chest and hips pointed towards corner, hips open"
- **Signal**: `chest_hip_angle_to_corner(t)`
- **Backend Function**: `calculateChestRotation()`
- **Location**: `phaseDetectionSignals.ts:192-207`
- **How it works**: Calculates shoulder vector angle relative to forward direction (Z-axis)

### Takeoff Phase

**Coaching**: "Arms around chest high, arms too high or too low affects axis"
- **Signal**: `arm_height_relative_to_chest(t)`
- **Backend Function**: `detectArmPositions()`
- **Location**: `phaseDetectionSignals.ts:244-283`
- **How it works**: Calculates left/right arm angles and detects if arms are toward tail/nose

**Coaching**: "Maintain rotational momentum, snap on one axis"
- **Signal**: `upper_body_rotation_velocity(t)`
- **Backend Function**: `calculateVelocity(chestRotation)`
- **Location**: `phaseDetectionSignals.ts:147-155`
- **How it works**: Calculates velocity from chest rotation timeline

**Coaching**: "Finish snap as tail leaves, maintain consistent motion"
- **Signal**: `torso_yaw_rotation(t)`
- **Backend Function**: `calculateChestRotation()`
- **Location**: `phaseDetectionSignals.ts:192-207`
- **How it works**: Already computed above

### Air Phase

**Coaching**: "Upper body leading rotation, counter-rotation for micro adjustments"
- **Signal**: `upper_lower_body_separation(t)`
- **Backend Function**: `bodyStackedness` (inverse) + `formVariance`
- **Location**: `phaseDetectionSignals.ts:356-385` and `phaseDetectionSignals.ts:388-420`
- **How it works**: 
  - `bodyStackedness`: Measures distance between hip and shoulder centers (lower = more stacked)
  - `formVariance`: Measures rate of body position change

**Coaching**: "Keep head in general area, stable head position"
- **Signal**: `head_position_stability(t)`
- **Backend Function**: `calculateHeadRotation()` + `formVariance`
- **Location**: `phaseDetectionSignals.ts:344-354` and `phaseDetectionSignals.ts:388-420`
- **How it works**: 
  - `headRotation`: Calculates head rotation relative to body
  - `formVariance`: Measures stability (low variance = stable)

### Landing Phase

**Coaching**: "Land both feet at same time"
- **Signal**: `left_right_foot_landing_sync(t)`
- **Backend Function**: `calculateAncleToHipRatio()` (for airborne detection)
- **Location**: `phaseDetectionSignals.ts:158-175`
- **How it works**: Calculates ankle-to-hip ratio (>1 = airborne, <1 = grounded)
- **Note**: Need to add left/right ankle comparison for symmetry

**Coaching**: "Land with toe pressure or flat base, dig in toe edge"
- **Signal**: `edge_pressure_at_landing(t)`
- **Backend Function**: `calculateEdgeAngle()` + `detectEdgeTransitions()`
- **Location**: `phaseDetectionSignals.ts:63-75` and `phaseDetectionSignals.ts:80-115`
- **How it works**: 
  - `edgeAngle`: Calculates edge angle at landing
  - `edgeTransitions`: Detects transitions between heelside/toeside

## What Needs to Be Added

To complete the MVP, you need to add:

1. **Left/Right Foot Landing Sync**
   - Compare left ankle Y position vs right ankle Y position at landing
   - Calculate time difference between when each foot reaches ground
   - Add to `PhaseDetectionSignals` interface

2. **Phase-Normalized Time Mapping**
   - Map frame indices to [0, 1] within each phase
   - Allows fair comparison across different video lengths
   - Add `phaseNormalizer.ts` utility

3. **Delta Computation**
   - Compare rider signals to reference signals
   - Compute: peak magnitude (Δmax), peak timing (Δt_peak), velocity peak (Δv_peak)
   - Add `deltaComputer.ts` utility

4. **Coaching Archetype Detection**
   - Map deltas to coaching patterns (early extension, late compression, etc.)
   - Add `coachingArchetypeDetector.ts` utility

## Implementation Plan

### Phase 1: Extend Existing Functions (1-2 hours)
- [ ] Add left/right foot landing sync to `phaseDetectionSignals.ts`
- [ ] Add phase-normalized time mapping utility
- [ ] Add delta computation utility

### Phase 2: Build Comparison Service (2-3 hours)
- [ ] Create `ComparisonService.ts` to orchestrate comparison
- [ ] Implement coaching archetype detection
- [ ] Create API endpoint for comparison

### Phase 3: Wire to Mobile (1-2 hours)
- [ ] Create comparison UI component
- [ ] Add comparison screen to mobile app
- [ ] Display top 1–2 deltas per phase

## Files to Modify

**Existing:**
- `backend/src/utils/phaseDetectionSignals.ts` - Add left/right foot sync
- `backend/src/types/formAnalysis.ts` - Update `PhaseDetectionSignals` interface

**New:**
- `backend/src/utils/phaseNormalizer.ts` - Phase-normalize time
- `backend/src/utils/deltaComputer.ts` - Compute deltas
- `backend/src/services/comparisonService.ts` - Orchestrate comparison
- `backend/src/utils/coachingArchetypeDetector.ts` - Detect patterns
- `backend/api/comparison.ts` - API endpoint
- `backend/mobile/src/screens/ComparisonScreen.tsx` - Mobile UI

## Next Steps

1. Review this mapping with your backend team
2. Decide if you want to extend existing functions or create new ones
3. Implement Phase 1 (extend existing functions)
4. Test with real backside 360 videos
5. Iterate on coaching archetype detection rules
