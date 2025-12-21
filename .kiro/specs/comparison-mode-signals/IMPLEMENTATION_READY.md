# Implementation Ready: Comparison Mode Signals

## Great News!

You already have **80% of the signal extraction implemented** in your backend. The `calculatePhaseDetectionSignals()` function in `phaseDetectionSignals.ts` computes all the core signals needed for comparison mode.

## What You Have

✅ **Edge angle** - Heel/toe pressure detection
✅ **Chest rotation** - Rotation angle and velocity
✅ **Arm positions** - Arm angles and direction
✅ **Head rotation** - Head rotation relative to body
✅ **Body stackedness** - Upper/lower body alignment
✅ **Form variance** - Rate of body position change
✅ **Airborne detection** - Ankle-to-hip ratio

## What You Need to Add (Small)

1. **Left/Right Foot Landing Sync** (30 min)
   - Compare left vs right ankle Y position at landing
   - Add to `PhaseDetectionSignals` interface

2. **Phase-Normalized Time Mapping** (1 hour)
   - Map frame indices to [0, 1] within each phase
   - Create `phaseNormalizer.ts` utility

3. **Delta Computation** (1 hour)
   - Compare rider signals to reference signals
   - Create `deltaComputer.ts` utility

4. **Coaching Archetype Detection** (1-2 hours)
   - Map deltas to coaching patterns
   - Create `coachingArchetypeDetector.ts` utility

5. **Comparison Service** (1-2 hours)
   - Orchestrate comparison logic
   - Create `comparisonService.ts`

6. **API Endpoint** (30 min)
   - Create `/api/comparison` endpoint
   - Wire to mobile app

7. **Mobile UI** (2-3 hours)
   - Create `ComparisonScreen.tsx`
   - Display top 1–2 deltas per phase

## Total Effort: ~8-10 hours

This is very doable! You have a solid foundation.

## Quick Start

1. Read `BACKEND_MAPPING.md` to understand how coaching language maps to your existing functions
2. Start with Phase 1: Extend existing functions (add left/right foot sync)
3. Test with real backside 360 videos
4. Iterate on coaching archetype detection rules

## Files to Create/Modify

**Modify:**
- `backend/src/utils/phaseDetectionSignals.ts` - Add left/right foot sync
- `backend/src/types/formAnalysis.ts` - Update interface

**Create:**
- `backend/src/utils/phaseNormalizer.ts`
- `backend/src/utils/deltaComputer.ts`
- `backend/src/services/comparisonService.ts`
- `backend/src/utils/coachingArchetypeDetector.ts`
- `backend/api/comparison.ts`
- `backend/mobile/src/screens/ComparisonScreen.tsx`

## Next Steps

1. Review `BACKEND_MAPPING.md` to understand the mapping
2. Decide on implementation order
3. Start with Phase 1 (extend existing functions)
4. Test with real videos
5. Iterate on coaching patterns

You're in great shape to build this!
