# Comparison Mode - Quick Reference

## What It Does

Compares a rider's video to a reference video and provides coaching feedback based on signal deltas and detected patterns.

## How to Use

### 1. API Endpoint
```bash
GET /api/comparison/:riderVideoId/:referenceVideoId
```

### 2. Response
```json
{
  "overallSimilarity": "82",
  "topIssues": [
    {
      "phase": "takeoff",
      "archetype": "premature_rotation",
      "coachingTip": "Your shoulders are opening before your legs extend"
    }
  ]
}
```

### 3. Mobile UI
```typescript
<ComparisonScreen
  riderVideoId="video123"
  referenceVideoId="reference456"
  onClose={() => {}}
/>
```

## Core Components

| Component | Purpose | File |
|-----------|---------|------|
| Phase Normalizer | Normalize phases to [0, 1] time | `phaseNormalizer.ts` |
| Delta Computer | Compare signals and compute deltas | `deltaComputer.ts` |
| Archetype Detector | Detect coaching patterns | `coachingArchetypeDetector.ts` |
| Comparison Service | Orchestrate comparison | `comparisonService.ts` |
| API Endpoint | HTTP endpoint | `comparison.ts` |
| Mobile UI | Display results | `ComparisonScreen.tsx` |

## Archetypes

| Phase | Archetype | Trigger |
|-------|-----------|---------|
| Setup | early_extension | Hip velocity peaks early |
| Setup | over_connected | Body stackedness too high |
| Takeoff | premature_rotation | Chest rotation peaks early |
| Takeoff | arm_imbalance | Arm angles differ significantly |
| Takeoff | insufficient_pop | Hip velocity too low |
| Air | excessive_rotation | Chest rotation too high |
| Air | unstable_air | Form variance too high |
| Landing | asymmetric_landing | Ankle Y positions differ |
| Landing | late_compression | Hip velocity peaks late |

## Signal Deltas

For each signal, we compute:
- **Peak Delta** - Difference in peak values
- **Timing Delta** - Difference in when peak occurs (normalized time)
- **Velocity Delta** - Difference in peak velocity

## Workflow

```
1. Fetch rider and reference VideoAnalysis from MongoDB
2. Normalize both phases to [0, 1] time
3. Extract signals from measurements
4. Compare signals using delta computer
5. Detect coaching archetypes
6. Rank issues by confidence
7. Format and return result
```

## Testing

### Quick Test
```bash
# 1. Upload two videos
curl -X POST http://localhost:3001/api/form-analysis/upload \
  -F "video=@rider.mp4"

# 2. Compare them
curl http://localhost:3001/api/comparison/VIDEO_ID_1/VIDEO_ID_2
```

### Expected Results
- Similarity score: 0-100
- Top issues: 1-3 archetypes
- Coaching tips: Clear and actionable

## Debugging

### Check Signals
```typescript
// In comparisonService.ts
console.log('Rider signals:', riderSignals);
console.log('Reference signals:', referenceSignals);
```

### Check Deltas
```typescript
// In deltaComputer.ts
console.log('Deltas:', deltas);
console.log('Top deltas:', topDeltas);
```

### Check Archetypes
```typescript
// In coachingArchetypeDetector.ts
console.log('Archetypes:', archetypes);
console.log('Top archetypes:', topArchetypes);
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "Video not found" | Verify video IDs and that videos are processed |
| "No deltas detected" | Check that signals are being extracted |
| "Similarity is 100%" | Expected for identical videos |
| "Archetypes not detected" | Check delta thresholds |

## Performance

- **Comparison:** <2 seconds
- **Signal Comparison:** O(n) where n = signals
- **Archetype Detection:** O(m) where m = deltas

## Files

**Created:**
- `backend/src/utils/phaseNormalizer.ts`
- `backend/src/utils/deltaComputer.ts`
- `backend/src/utils/coachingArchetypeDetector.ts`
- `backend/src/services/comparisonService.ts`
- `backend/api/comparison.ts`
- `backend/mobile/src/screens/ComparisonScreen.tsx`

**Modified:**
- `backend/src/types/formAnalysis.ts`
- `backend/src/utils/phaseDetectionSignals.ts`
- `backend/src/server.ts`

## Next Steps

1. Test with real videos
2. Refine archetype thresholds
3. Add more archetypes
4. Integrate with LLM
5. Enhance mobile UI

## Documentation

- `IMPLEMENTATION_COMPLETE.md` - Full details
- `TESTING_GUIDE.md` - Testing procedures
- `BACKEND_MAPPING.md` - Signal mapping
- `SUMMARY.md` - Overview

## Key Insights

✅ **Phase Normalization** - Critical for fair comparison
✅ **Signal Deltas** - More meaningful than raw values
✅ **Archetype Detection** - Deterministic and explainable
✅ **Coaching Language** - Maps to real coaching concepts
✅ **Top Issues** - Only show 1-2 to avoid overload

## Example Flow

```
User uploads rider video → Pose service processes → VideoAnalysis stored
User uploads reference video → Pose service processes → VideoAnalysis stored
User taps "Compare" → API fetches both videos
API normalizes phases → Compares signals → Detects archetypes
Results displayed in mobile UI → User sees coaching tips
```

## Similarity Score Interpretation

- **90-100%** - Nearly identical form
- **75-90%** - Minor differences
- **60-75%** - Moderate differences
- **<60%** - Significant differences

## Archetype Confidence

- **>80%** - High confidence, likely accurate
- **60-80%** - Medium confidence, worth noting
- **<60%** - Low confidence, may be false positive

## Coaching Tips Format

Each archetype includes:
- **Tip** - What the rider is doing wrong
- **Fix** - How to correct it
- **Severity** - critical/moderate/minor

## Integration Points

1. **Mobile App** - Add comparison button to video analysis screen
2. **LLM** - Use comparison results as context for Gemini
3. **Reference Library** - Build library of perfect phases
4. **Progression Tracking** - Compare multiple attempts

## Future Enhancements

- Heatmaps showing where differences occur
- Video overlay with deltas highlighted
- Trick-specific archetype patterns
- AI-generated coaching advice
- Progression tracking over time
