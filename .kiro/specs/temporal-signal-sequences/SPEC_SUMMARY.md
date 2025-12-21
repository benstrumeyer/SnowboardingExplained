# Temporal Signal Sequences - Specification Summary

## What We're Building

A system to capture and compare the mathematical foundation of perfect trick execution. Coaches upload short (0-3 second) perfect videos of each trick phase, and the system extracts complete pose mathematics (position, velocity, acceleration, jerk for EVERY body part). These become "north star" references that all rider attempts are compared against, enabling specific, measurable coaching feedback like "Your arm snap is 15°/frame too slow" or "Your upper body rotation peaks 120ms too early."

## Key Insight

Signals like counter-rotation aren't single frames - they're sequences where upper body slows while lower body speeds up. We need to capture these temporal patterns, not just static poses.

## Core Components

### 1. Frame Range Selection UI
- Mobile interface for marking start/end frames of a signal sequence
- Frame-by-frame navigation with visual indicators
- Allows coaches to precisely define when a movement pattern occurs

### 2. Temporal Signal Extraction
- Computes position, velocity, acceleration, jerk for EVERY body part
- Normalizes by FPS for consistency across different video frame rates
- Applies smoothing filters to reduce noise
- Computes peak values, timing of peaks, and smoothness of curves
- Stores complete curve (all frame values), not just summary statistics

### 3. Body Proportion Normalization
- Extracts body proportions (height, arm length, leg length, etc.)
- Normalizes rider body proportions to match reference proportions
- Scales position-based signals by proportion ratio
- Keeps rotation-based signals unchanged (proportion-independent)
- Flags significant size mismatches (> 15%)

### 4. Perfect Pose Database
- Stores complete pose mathematics for perfect trick execution
- Includes: trick name, phase, stance, frame range, pose timeline, mesh data, temporal signals, body proportions
- Allows querying by: trick, phase, stance, body part, tags
- Computes quality metrics (confidence, consistency, smoothness)

### 5. LLM-Assisted Signal Analysis
- Analyzes uploaded signal sequences to identify body parts and movement patterns
- Returns: body parts involved, movement type, coaching insights
- Suggests signal names and descriptions
- Identifies which body parts are accelerating vs decelerating
- Suggests related signal sequences

### 6. Comparison Engine
- Aligns rider and perfect sequences to [0, 1] normalized time
- Computes deltas for EVERY body part (position, velocity, acceleration, timing)
- Generates specific coaching feedback
- Computes similarity scores (0-100) for each body part and overall
- Identifies if deviations are timing-based or magnitude-based

## Requirements

### Requirement 1: Frame Range Selection UI
- Display frame-by-frame video player with back/next navigation
- Mark start/end frames with visual indicators
- Display frame range and allow editing
- No mesh overlays (pose visualization only)

### Requirement 2: Signal Sequence Definition
- Require: name, phase(s), description, frame range
- Allow multiple phases per signal
- Validate frame range is within video bounds
- Extract all temporal signals for that frame range

### Requirement 3: Complete Body Part Temporal Analysis
- Compute for EVERY body part: position, velocity, acceleration, jerk
- Track: joint angles, distances between joints, rotation rates
- Normalize by FPS
- Compute peak values, timing of peaks, smoothness of curves
- Store complete curve (all frame values)
- Compute body part relationships
- Identify which body parts are accelerating vs decelerating

### Requirement 4: Curve Comparison Metrics
- Compute: peak magnitude delta, peak timing delta, rate-of-change delta
- Measure how shape differs (smooth vs jerky acceleration)
- Measure timing differences (e.g., "rider peaks 150ms earlier")
- Compute area-under-curve differences
- Normalize both curves to [0, 1] time before comparison

### Requirement 5: LLM-Assisted Signal Analysis
- Send pose data to LLM for analysis
- Return: body parts involved, movement type, coaching insights
- Suggest signal names and descriptions
- Identify which body parts are accelerating vs decelerating
- Suggest related signal sequences

### Requirement 6: Perfect Pose Database
- Save: trick name, phase, stance, frame range, source video ID
- Save: complete pose timeline, mesh data, all computed temporal signals
- Compute and save for EVERY body part: position curves, velocity curves, acceleration curves, jerk curves
- Compute and save: body part relationships, symmetry metrics, coordination patterns
- Allow querying by: trick, phase, stance, body part
- Compute quality metrics (confidence, consistency, smoothness)
- Allow tagging and notes

### Requirement 7: Rider to Perfect Comparison
- Align both sequences to [0, 1] normalized time
- Compute for EVERY body part: position delta, velocity delta, acceleration delta, timing offset
- Identify which body parts deviate most from perfect
- Generate specific coaching feedback (e.g., "Your arm snap is 15°/frame too slow")
- Compute similarity score (0-100) for each body part and overall
- Identify if deviations are timing-based or magnitude-based

### Requirement 8: Body Part Movement Analysis
- Track: upper body rotation, lower body rotation, arm movement, head position
- Compute: acceleration, deceleration, peak velocity for each body part
- Identify coordination patterns (e.g., "upper body leads, lower body follows")
- Detect if body parts are moving in sync or offset
- Flag asymmetries (e.g., "left arm moves faster than right")

### Requirement 9: Body Proportion Normalization
- Compute body proportions: height, arm length, leg length, torso length, shoulder width
- Use pose keypoints to calculate distances
- Save reference body proportions from coach's video
- Normalize rider's body proportions to match reference proportions
- Scale position-based signals by proportion ratio
- Don't scale rotation-based signals
- Compute proportion mismatch score
- Allow manual override of proportion scaling

## Design Principles

1. **Temporal First**: Measure how things change, not just what they are
2. **Normalized Comparison**: All sequences normalized to [0, 1] time for fair comparison
3. **Curve-Based**: Compare shapes and timing, not just peak values
4. **LLM-Assisted**: Use AI to understand movement patterns, not to make coaching decisions
5. **Database-Driven**: Build library of perfect sequences, not hardcoded rules
6. **Rate of Change**: Focus on acceleration/deceleration, not just position
7. **Body Proportion Aware**: Account for individual differences in body size

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

## Data Flow

```
Coach uploads perfect video
  ↓
System extracts frames
  ↓
Coach marks frame range (Req 1)
  ↓
Coach defines signal sequence (Req 2)
  ↓
System extracts temporal signals (Req 3)
  ↓
System normalizes body proportions (Req 9)
  ↓
System stores in perfect pose database (Req 6)
  ↓
LLM analyzes signal (Req 5)
  ↓
Perfect phase ready for comparison

---

Rider uploads attempt video
  ↓
System extracts frames and pose
  ↓
System extracts temporal signals (Req 3)
  ↓
System normalizes rider body proportions (Req 9)
  ↓
System compares to perfect reference (Req 7)
  ↓
System generates coaching feedback
  ↓
Rider sees specific, measurable feedback
```

## Implementation Phases

### Phase 1: Core Infrastructure (2 weeks)
- Create type definitions
- Implement temporal signal extractor
- Implement body proportion normalizer
- Create database schema

### Phase 2: UI & Data Collection (2 weeks)
- Build frame range selection UI
- Build signal sequence definition UI
- Create API endpoints for storing perfect phases
- Integrate LLM analysis

### Phase 3: Comparison & Feedback (2 weeks)
- Implement comparison engine
- Build comparison UI
- Generate coaching feedback
- Create comparison API endpoints

### Phase 4: Refinement (2 weeks)
- Add curve comparison metrics
- Optimize performance
- Add visualization tools
- Create documentation

### Phase 5: Testing & Validation (2 weeks)
- Unit tests (> 80% coverage)
- Integration tests
- Performance tests
- Validation with coaches

**Total: 10 weeks**

## Key Files

### Specification Documents
- `requirements.md` - Detailed requirements with acceptance criteria
- `design.md` - Architecture and component design
- `llm-prompt-design.md` - LLM prompt design and integration
- `database-schema.md` - Database schema and queries
- `tasks.md` - Implementation tasks and timeline

### Implementation Files (To Be Created)
- `backend/src/types/temporalSignals.ts` - Type definitions
- `backend/src/utils/temporalSignalExtractor.ts` - Signal extraction
- `backend/src/utils/bodyProportionNormalizer.ts` - Proportion normalization
- `backend/src/services/temporalComparisonService.ts` - Comparison engine
- `backend/src/services/temporalSignalAnalysisService.ts` - LLM integration
- `backend/src/db/temporalSignalsSchema.ts` - Database schema
- `backend/api/perfect-phases.ts` - API endpoints
- `backend/api/temporal-comparison.ts` - Comparison API
- `backend/mobile/src/screens/TemporalSignalTaggingScreen.tsx` - Frame selection UI
- `backend/mobile/src/screens/SignalSequenceDefinitionScreen.tsx` - Signal definition UI
- `backend/mobile/src/screens/TemporalComparisonScreen.tsx` - Comparison UI

## Success Criteria

1. ✅ All 9 requirements implemented
2. ✅ All tests passing (> 80% coverage)
3. ✅ Performance targets met (extraction < 5s, comparison < 2s)
4. ✅ Coaches validate accuracy of comparisons
5. ✅ Specific, measurable feedback generated
6. ✅ Documentation complete
7. ✅ No critical bugs
8. ✅ Ready for production deployment

## Next Steps

1. Review and approve specification
2. Start Phase 1 implementation (infrastructure)
3. Implement in order of dependencies
4. Test thoroughly at each phase
5. Get coach feedback early and often
6. Iterate based on feedback
7. Deploy to production when ready

## Related Documentation

- `.kiro/specs/comparison-mode-signals/` - Previous comparison mode work
- `.kiro/specs/comparison-mode-signals/REFERENCE_LIBRARY_GUIDE.md` - Reference library context
- `backend/src/utils/phaseDetectionSignals.ts` - Existing signal extraction (will be extended)
- `backend/src/types/formAnalysis.ts` - Type definitions (will be extended)

## Questions & Clarifications

**Q: Should we extract all signals from coach videos?**
A: No. Only store the perfect reference. Focus on small, perfect subset (0-3 second videos per phase).

**Q: How many perfect references per phase?**
A: One perfect reference per phase should work (with body proportion normalization).

**Q: What about riders with very different body sizes?**
A: Body proportion normalization handles this. We scale position-based signals but keep rotation-based signals unchanged.

**Q: How do we handle different video frame rates?**
A: Normalize by FPS during extraction. Interpolate to same number of samples during comparison.

**Q: What if pose extraction is noisy?**
A: Apply Savitzky-Golay smoothing filter. Validate with coaches.

**Q: Can we use the LLM to make coaching decisions?**
A: No. LLM analyzes and understands patterns. Coaching feedback comes from mathematical comparison.

## Glossary

- **Signal Sequence**: A named movement pattern that spans multiple frames (e.g., "counter_rotation")
- **Temporal Signal**: A measurement of how a body part or relationship changes over time
- **Frame Range**: Start and end frames that define when a signal sequence occurs
- **Rate of Change**: How fast a signal is changing (derivative of the signal curve)
- **Peak Magnitude**: The maximum value reached during the sequence
- **Peak Timing**: When (normalized to [0,1]) the peak occurs
- **Body Part Relationship**: How two body parts move relative to each other
- **Curve Comparison**: Comparing the shape and timing of signal curves, not just individual values
- **Body Proportion Normalization**: Scaling signals based on rider body size
- **Similarity Score**: 0-100 score indicating how similar rider is to perfect reference
