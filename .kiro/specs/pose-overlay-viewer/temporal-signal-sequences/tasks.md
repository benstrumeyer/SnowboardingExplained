# Temporal Signal Sequences - Implementation Tasks

## Overview

This document outlines the implementation plan for the temporal signal sequences feature. Tasks are organized by phase and priority.

## Phase 1: Core Infrastructure (Foundation)

### Task 1.1: Create Type Definitions
**Priority**: P0 (Critical)
**Effort**: 2 hours
**Dependencies**: None

Create comprehensive TypeScript interfaces for temporal signals.

**Deliverables**:
- [ ] `backend/src/types/temporalSignals.ts` - All type definitions
- [ ] Export types from `backend/src/types/index.ts`
- [ ] Add JSDoc comments for all interfaces

**Acceptance Criteria**:
- All types compile without errors
- Types are exported and importable
- Documentation is clear and complete

**Implementation Notes**:
- Include: PoseFrame, Keypoint, TemporalSignals, BodyPartSignal, BodyProportions, PerfectPhase, ComparisonResult, LLMAnalysis
- Use strict typing (no `any`)
- Include examples in JSDoc

---

### Task 1.2: Implement Temporal Signal Extractor
**Priority**: P0 (Critical)
**Effort**: 6 hours
**Dependencies**: Task 1.1

Extract position, velocity, acceleration, jerk for every body part.

**Deliverables**:
- [ ] `backend/src/utils/temporalSignalExtractor.ts` - Core extraction logic
- [ ] Unit tests for extraction algorithm
- [ ] Integration tests with sample pose data

**Acceptance Criteria**:
- Extracts all 4 derivatives (position, velocity, acceleration, jerk)
- Normalizes by FPS
- Applies smoothing filter
- Computes peak values and timing
- Handles edge cases (missing keypoints, short sequences)

**Implementation Notes**:
- Use Savitzky-Golay filter for smoothing
- Compute derivatives using finite differences
- Handle NaN/Infinity values gracefully
- Test with 30fps and 60fps videos

**Algorithm**:
```typescript
function extractTemporalSignals(
  poseFrames: PoseFrame[],
  fps: number
): TemporalSignals {
  // 1. Extract positions for each body part
  // 2. Compute derivatives (velocity, acceleration, jerk)
  // 3. Apply smoothing
  // 4. Compute statistics (peak, timing, smoothness)
  // 5. Compute relationships between body parts
}
```

---

### Task 1.3: Implement Body Proportion Normalizer
**Priority**: P0 (Critical)
**Effort**: 4 hours
**Dependencies**: Task 1.1

Extract and normalize body proportions for fair comparison.

**Deliverables**:
- [ ] `backend/src/utils/bodyProportionNormalizer.ts` - Extraction and normalization
- [ ] Unit tests for proportion computation
- [ ] Integration tests with sample pose data

**Acceptance Criteria**:
- Extracts 6 proportions (height, arm length, leg length, torso length, shoulder width, hip width)
- Computes proportion ratios between riders
- Scales position-based signals correctly
- Flags significant size mismatches (> 15%)
- Handles edge cases (missing keypoints)

**Implementation Notes**:
- Use average of left/right measurements
- Normalize to reference proportions
- Don't scale rotation-based signals
- Return mismatch score for validation

**Algorithm**:
```typescript
function extractBodyProportions(poseFrame: PoseFrame): BodyProportions {
  // 1. Compute distances between keypoints
  // 2. Average left/right measurements
  // 3. Return proportions object
}

function normalizeSignals(
  signals: TemporalSignals,
  riderProportions: BodyProportions,
  referenceProportions: BodyProportions
): TemporalSignals {
  // 1. Compute proportion ratios
  // 2. Scale position-based signals
  // 3. Keep rotation-based signals unchanged
  // 4. Return normalized signals
}
```

---

### Task 1.4: Create Database Schema
**Priority**: P0 (Critical)
**Effort**: 3 hours
**Dependencies**: Task 1.1

Set up PostgreSQL tables for storing temporal signals.

**Deliverables**:
- [ ] Database migration file: `backend/migrations/001_temporal_signals.sql`
- [ ] Drizzle ORM schema: `backend/src/db/temporalSignalsSchema.ts`
- [ ] Database connection tests

**Acceptance Criteria**:
- All 4 tables created (perfect_phases, signal_sequences, comparison_results, body_proportions)
- Indexes created for performance
- Foreign keys configured correctly
- Migration is idempotent (can run multiple times safely)

**Implementation Notes**:
- Use JSONB for flexible signal storage
- Create indexes for common queries
- Include timestamps for auditing
- Test migration on clean database

---

## Phase 2: UI & Data Collection (User Interface)

### Task 2.1: Build Frame Range Selection UI
**Priority**: P1 (High)
**Effort**: 5 hours
**Dependencies**: Task 1.1

Create mobile screen for marking start/end frames.

**Deliverables**:
- [ ] `backend/mobile/src/screens/TemporalSignalTaggingScreen.tsx` - Main screen
- [ ] `backend/mobile/src/components/FrameCarouselForTagging.tsx` - Frame carousel
- [ ] `backend/mobile/src/components/FrameRangeDisplay.tsx` - Range display
- [ ] Unit tests for UI components

**Acceptance Criteria**:
- Displays frame carousel with smooth navigation
- Back/next buttons work correctly
- Mark start/end buttons record frame numbers
- Display shows current frame range (e.g., "Frames 45-78")
- Allow editing frame range by ±1 frame
- Preview of selected frame range

**Implementation Notes**:
- Reuse existing FrameCarousel component if possible
- Add visual highlight for marked frames
- Show frame counter (e.g., "Frame 45 of 120")
- Test with different video lengths

---

### Task 2.2: Build Signal Sequence Definition UI
**Priority**: P1 (High)
**Effort**: 4 hours
**Dependencies**: Task 2.1

Create screen for defining signal metadata.

**Deliverables**:
- [ ] `backend/mobile/src/screens/SignalSequenceDefinitionScreen.tsx` - Main screen
- [ ] `backend/mobile/src/components/PhaseSelector.tsx` - Phase selection
- [ ] `backend/mobile/src/components/SignalNameInput.tsx` - Name input
- [ ] Unit tests for UI components

**Acceptance Criteria**:
- Input fields for name, phases, description
- Phase selector with multiple selection
- Frame range display (from previous screen)
- Validation before submission
- Loading state during extraction
- Error handling and display

**Implementation Notes**:
- Validate name uniqueness
- Require at least one phase
- Description should be 10+ characters
- Show extraction progress

---

### Task 2.3: Create API Endpoints for Perfect Phases
**Priority**: P1 (High)
**Effort**: 4 hours
**Dependencies**: Task 1.4

Create REST API for storing and retrieving perfect phases.

**Deliverables**:
- [ ] `backend/api/perfect-phases.ts` - API endpoints
- [ ] Request/response validation
- [ ] Integration tests

**Acceptance Criteria**:
- POST /api/perfect-phases - Create new perfect phase
- GET /api/perfect-phases - List with filtering
- GET /api/perfect-phases/:id - Get single phase
- PUT /api/perfect-phases/:id - Update metadata
- DELETE /api/perfect-phases/:id - Delete phase
- GET /api/perfect-phases/search - Search by trick name

**Implementation Notes**:
- Validate frame range
- Extract temporal signals on creation
- Compute body proportions
- Store LLM analysis
- Return appropriate HTTP status codes

---

### Task 2.4: Integrate LLM Analysis
**Priority**: P2 (Medium)
**Effort**: 3 hours
**Dependencies**: Task 2.3

Call LLM to analyze signal sequences.

**Deliverables**:
- [ ] `backend/src/services/temporalSignalAnalysisService.ts` - LLM integration
- [ ] LLM prompt templates
- [ ] Unit tests for prompt formatting
- [ ] Integration tests with mock LLM

**Acceptance Criteria**:
- Calls LLM with proper prompt
- Parses LLM response correctly
- Stores analysis in database
- Handles LLM errors gracefully
- Returns structured analysis

**Implementation Notes**:
- Use Gemini API (already integrated)
- Format pose data for LLM
- Parse JSON response
- Add retry logic for failures
- Cache results to avoid duplicate calls

---

## Phase 3: Comparison & Feedback (Core Logic)

### Task 3.1: Implement Comparison Engine
**Priority**: P1 (High)
**Effort**: 6 hours
**Dependencies**: Task 1.2, Task 1.3

Compare rider attempts to perfect references.

**Deliverables**:
- [ ] `backend/src/services/temporalComparisonService.ts` - Comparison logic
- [ ] Unit tests for comparison algorithm
- [ ] Integration tests with sample data

**Acceptance Criteria**:
- Normalizes both sequences to [0, 1] time
- Normalizes rider body proportions
- Computes deltas for every body part
- Generates coaching feedback
- Computes similarity scores
- Identifies deviation types (magnitude, timing, coordination)

**Implementation Notes**:
- Interpolate to same number of samples
- Use curve comparison metrics
- Generate specific feedback (e.g., "15°/frame too slow")
- Handle edge cases (very different video lengths)

**Algorithm**:
```typescript
function compareSequences(
  riderSignals: TemporalSignals,
  perfectSignals: TemporalSignals,
  riderProportions: BodyProportions,
  perfectProportions: BodyProportions
): ComparisonResult {
  // 1. Normalize to [0, 1] time
  // 2. Normalize rider proportions
  // 3. Interpolate to same sample count
  // 4. Compute deltas for each body part
  // 5. Generate feedback
  // 6. Compute similarity scores
}
```

---

### Task 3.2: Build Comparison UI
**Priority**: P1 (High)
**Effort**: 5 hours
**Dependencies**: Task 3.1

Create mobile screen for displaying comparison results.

**Deliverables**:
- [ ] `backend/mobile/src/screens/TemporalComparisonScreen.tsx` - Main screen
- [ ] `backend/mobile/src/components/ComparisonChart.tsx` - Curve visualization
- [ ] `backend/mobile/src/components/CoachingFeedbackPanel.tsx` - Feedback display
- [ ] Unit tests for UI components

**Acceptance Criteria**:
- Display overall similarity score
- Show body part comparisons
- Display coaching feedback
- Visualize signal curves (rider vs perfect)
- Show deviation types
- Allow filtering by body part

**Implementation Notes**:
- Use chart library for curve visualization
- Color-code deviations (red = bad, green = good)
- Make feedback actionable and specific
- Show before/after comparison

---

### Task 3.3: Create Comparison API Endpoints
**Priority**: P1 (High)
**Effort**: 3 hours
**Dependencies**: Task 3.1

Create REST API for comparisons.

**Deliverables**:
- [ ] `backend/api/temporal-comparison.ts` - API endpoints
- [ ] Request/response validation
- [ ] Integration tests

**Acceptance Criteria**:
- POST /api/temporal-comparison - Create comparison
- GET /api/temporal-comparison/:id - Get comparison result
- GET /api/temporal-comparison/rider/:riderId - Get rider's comparisons
- GET /api/temporal-comparison/perfect/:perfectPhaseId - Get comparisons to reference

**Implementation Notes**:
- Validate inputs
- Store results in database
- Return appropriate HTTP status codes
- Include pagination for list endpoints

---

## Phase 4: Refinement & Polish (Quality)

### Task 4.1: Add Curve Comparison Metrics
**Priority**: P2 (Medium)
**Effort**: 4 hours
**Dependencies**: Task 3.1

Implement advanced curve comparison metrics.

**Deliverables**:
- [ ] `backend/src/utils/curveComparisonMetrics.ts` - Metrics computation
- [ ] Unit tests for metrics
- [ ] Documentation of metrics

**Acceptance Criteria**:
- Compute peak magnitude delta
- Compute peak timing delta
- Compute rate-of-change delta
- Compute area-under-curve differences
- Compute smoothness differences
- Compute correlation coefficient

**Implementation Notes**:
- Use mathematical libraries for curve analysis
- Normalize curves before comparison
- Handle edge cases (flat curves, single peak)
- Document formulas used

---

### Task 4.2: Optimize Performance
**Priority**: P2 (Medium)
**Effort**: 4 hours
**Dependencies**: Task 3.1

Optimize extraction and comparison performance.

**Deliverables**:
- [ ] Performance benchmarks
- [ ] Optimized algorithms
- [ ] Caching strategy
- [ ] Performance documentation

**Acceptance Criteria**:
- Temporal signal extraction < 5 seconds for 30-frame sequence
- Comparison < 2 seconds
- Database queries < 1 second
- Memory usage < 500MB for typical operations

**Implementation Notes**:
- Profile code to identify bottlenecks
- Use caching for repeated computations
- Optimize database queries with indexes
- Consider parallel processing for large datasets

---

### Task 4.3: Add Visualization Tools
**Priority**: P2 (Medium)
**Effort**: 5 hours
**Dependencies**: Task 3.2

Create advanced visualization tools.

**Deliverables**:
- [ ] `backend/mobile/src/components/SignalCurveViewer.tsx` - Curve visualization
- [ ] `backend/mobile/src/components/BodyPartHeatmap.tsx` - Deviation heatmap
- [ ] `backend/mobile/src/components/CoordinationDiagram.tsx` - Coordination visualization
- [ ] Unit tests for visualizations

**Acceptance Criteria**:
- Display signal curves (position, velocity, acceleration)
- Show rider vs perfect overlay
- Highlight deviations
- Show body part coordination
- Interactive controls (zoom, pan, filter)

**Implementation Notes**:
- Use chart library (e.g., Chart.js, Recharts)
- Make visualizations responsive
- Add legend and labels
- Support dark mode

---

### Task 4.4: Create Documentation
**Priority**: P2 (Medium)
**Effort**: 3 hours
**Dependencies**: All previous tasks

Create comprehensive documentation.

**Deliverables**:
- [ ] User guide for coaches
- [ ] API documentation
- [ ] Developer guide
- [ ] Troubleshooting guide

**Acceptance Criteria**:
- Clear instructions for uploading perfect phases
- Examples of signal sequences
- API endpoint documentation
- Code examples for developers
- Common issues and solutions

**Implementation Notes**:
- Include screenshots
- Provide example videos
- Document all API endpoints
- Include code snippets

---

## Phase 5: Testing & Validation (Quality Assurance)

### Task 5.1: Unit Tests
**Priority**: P1 (High)
**Effort**: 6 hours
**Dependencies**: All Phase 1 tasks

Write comprehensive unit tests.

**Deliverables**:
- [ ] Tests for temporal signal extractor
- [ ] Tests for body proportion normalizer
- [ ] Tests for comparison engine
- [ ] Tests for curve comparison metrics
- [ ] Minimum 80% code coverage

**Acceptance Criteria**:
- All tests pass
- Code coverage > 80%
- Tests are fast (< 5 seconds total)
- Tests are isolated and repeatable

**Implementation Notes**:
- Use Jest for testing
- Mock external dependencies
- Test edge cases
- Test error handling

---

### Task 5.2: Integration Tests
**Priority**: P1 (High)
**Effort**: 6 hours
**Dependencies**: All Phase 2 & 3 tasks

Write integration tests.

**Deliverables**:
- [ ] End-to-end tests for perfect phase creation
- [ ] End-to-end tests for comparison
- [ ] API endpoint tests
- [ ] Database tests

**Acceptance Criteria**:
- All tests pass
- Tests cover main workflows
- Tests use real database
- Tests clean up after themselves

**Implementation Notes**:
- Use test database
- Create fixtures for test data
- Test error scenarios
- Test concurrent operations

---

### Task 5.3: Performance Tests
**Priority**: P2 (Medium)
**Effort**: 4 hours
**Dependencies**: Task 4.2

Write performance tests.

**Deliverables**:
- [ ] Benchmarks for extraction
- [ ] Benchmarks for comparison
- [ ] Benchmarks for database queries
- [ ] Performance report

**Acceptance Criteria**:
- Extraction < 5 seconds
- Comparison < 2 seconds
- Database queries < 1 second
- Memory usage < 500MB

**Implementation Notes**:
- Use realistic data sizes
- Test with different video lengths
- Measure CPU and memory usage
- Document results

---

### Task 5.4: Validation with Coaches
**Priority**: P1 (High)
**Effort**: 8 hours
**Dependencies**: All previous tasks

Validate with real coaches.

**Deliverables**:
- [ ] Feedback from coaches
- [ ] Bug reports and fixes
- [ ] Refinements to feedback generation
- [ ] Validation report

**Acceptance Criteria**:
- Coaches can upload perfect phases
- Comparisons are accurate
- Feedback is actionable
- UI is intuitive
- No critical bugs

**Implementation Notes**:
- Test with 2-3 coaches
- Collect feedback on accuracy
- Collect feedback on usability
- Iterate based on feedback

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Infrastructure | 2 weeks | Week 1 | Week 2 |
| Phase 2: UI & Collection | 2 weeks | Week 3 | Week 4 |
| Phase 3: Comparison | 2 weeks | Week 5 | Week 6 |
| Phase 4: Refinement | 2 weeks | Week 7 | Week 8 |
| Phase 5: Testing | 2 weeks | Week 9 | Week 10 |
| **Total** | **10 weeks** | | |

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| LLM analysis inaccurate | Medium | Medium | Validate with coaches, add feedback loop |
| Performance issues | Medium | High | Profile early, optimize algorithms |
| Database schema changes | Low | High | Design carefully, test migrations |
| Pose extraction errors | Medium | Medium | Add validation, handle edge cases |
| UI complexity | Medium | Medium | Start simple, iterate based on feedback |

## Success Criteria

1. ✅ All requirements implemented
2. ✅ All tests passing (> 80% coverage)
3. ✅ Performance targets met
4. ✅ Coaches validate accuracy
5. ✅ Documentation complete
6. ✅ No critical bugs
7. ✅ Ready for production deployment

## Next Steps

1. Start with Phase 1 tasks (infrastructure)
2. Implement in order of dependencies
3. Test thoroughly at each phase
4. Get coach feedback early and often
5. Iterate based on feedback
6. Deploy to production when ready
