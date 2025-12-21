# Comparison Mode Testing Guide

## Quick Start

### 1. Ensure Backend is Running
```bash
# Terminal 1: Start backend server
cd SnowboardingExplained/backend
npm run dev

# Terminal 2: Start pose service
cd SnowboardingExplained/backend/pose-service
python app.py
```

### 2. Upload Two Videos
- Upload a rider video (your attempt)
- Upload a reference video (perfect form)
- Note the video IDs from the response

### 3. Test Comparison Endpoint

**Using cURL:**
```bash
curl -X GET "http://localhost:3001/api/comparison/VIDEO_ID_1/VIDEO_ID_2"
```

**Using Postman:**
- Method: GET
- URL: `http://localhost:3001/api/comparison/VIDEO_ID_1/VIDEO_ID_2`
- Headers: `Content-Type: application/json`

**Using JavaScript:**
```javascript
const response = await fetch(
  'http://localhost:3001/api/comparison/VIDEO_ID_1/VIDEO_ID_2'
);
const result = await response.json();
console.log(result);
```

### 4. Verify Response Structure

Expected response should include:
```json
{
  "riderVideoId": "...",
  "referenceVideoId": "...",
  "overallSimilarity": "82",
  "phases": {
    "setupCarve": { ... },
    "takeoff": { ... },
    "air": { ... },
    "landing": { ... }
  },
  "topIssues": [ ... ]
}
```

## Testing Scenarios

### Scenario 1: Perfect Match
- Upload the same video twice
- Expected: ~95-100% similarity
- Expected: No top issues

### Scenario 2: Early Extension
- Upload a video where rider extends too early
- Expected: `early_extension` archetype detected in setup phase
- Expected: Negative `peakTimingDelta` for hipVelocity

### Scenario 3: Premature Rotation
- Upload a video where rider rotates shoulders before extending
- Expected: `premature_rotation` archetype detected in takeoff phase
- Expected: Negative `peakTimingDelta` for chestRotationVelocity

### Scenario 4: Asymmetric Landing
- Upload a video where rider lands feet at different times
- Expected: `asymmetric_landing` archetype detected in landing phase
- Expected: High `peakDelta` for ankleLandingSync

## Debugging

### Check Signal Extraction
Add logging to `comparisonService.ts`:
```typescript
console.log('Rider signals:', riderSignals);
console.log('Reference signals:', referenceSignals);
```

### Check Delta Computation
Add logging to `deltaComputer.ts`:
```typescript
console.log('Deltas:', deltas);
console.log('Top deltas:', topDeltas);
```

### Check Archetype Detection
Add logging to `coachingArchetypeDetector.ts`:
```typescript
console.log('Archetypes:', archetypes);
console.log('Top archetypes:', topArchetypes);
```

### Verify Phase Normalization
Add logging to `phaseNormalizer.ts`:
```typescript
console.log('Normalized frames:', normalizedFrames.length);
console.log('Normalized times:', normalizedFrames.map(f => f.normalizedTime));
```

## Common Issues

### Issue: "Video not found"
- Verify video IDs are correct
- Check that videos have been fully processed (status = "fully_analyzed")
- Check MongoDB connection

### Issue: "No deltas detected"
- Verify both videos have measurements
- Check that signals are being extracted correctly
- Verify phase boundaries are correct

### Issue: "Similarity score is 100%"
- This is expected if comparing identical videos
- Try comparing different videos
- Check that delta computation is working

### Issue: "Archetypes not detected"
- Verify deltas are being computed
- Check archetype detection thresholds
- Add logging to see which conditions are being evaluated

## Performance Testing

### Test with Different Video Lengths
- Short video (5 seconds)
- Medium video (15 seconds)
- Long video (30 seconds)
- Expected: Consistent results regardless of length

### Test with Different Tricks
- Straight air
- Frontside 360
- Backside 360
- Expected: Appropriate archetypes for each trick

### Test with Different Stances
- Regular stance
- Goofy stance
- Expected: Consistent results

## Mobile App Testing

### 1. Add Comparison Button to Video Analysis Screen
```typescript
<TouchableOpacity onPress={() => {
  // Open comparison screen
  navigation.navigate('Comparison', {
    riderVideoId: videoId,
    referenceVideoId: referenceVideoId
  });
}}>
  <Text>Compare to Reference</Text>
</TouchableOpacity>
```

### 2. Test on Device
- Upload rider video
- Select reference video
- Tap "Compare"
- Verify results display correctly

### 3. Test Error Handling
- Try comparing non-existent videos
- Try comparing videos without measurements
- Verify error messages are clear

## Acceptance Criteria

- [ ] Comparison endpoint returns valid JSON
- [ ] Overall similarity score is between 0-100
- [ ] Top issues are ranked by confidence
- [ ] Coaching tips are clear and actionable
- [ ] Mobile UI displays results correctly
- [ ] Error handling works as expected
- [ ] Performance is acceptable (<2 seconds)
- [ ] Results make sense for test videos

## Next Steps After Testing

1. **Refine Thresholds**
   - Adjust archetype detection thresholds based on test results
   - Fine-tune confidence calculations

2. **Add More Archetypes**
   - Based on real coaching feedback
   - Trick-specific patterns

3. **Improve Coaching Tips**
   - Make tips more specific
   - Add fix instructions

4. **Optimize Performance**
   - Cache reference signals
   - Pre-compute common comparisons

5. **Integrate with LLM**
   - Use comparison results as context
   - Generate personalized coaching advice

## Test Data

### Sample Backside 360 Videos
- Reference: Perfect form backside 360
- Rider 1: Early extension
- Rider 2: Premature rotation
- Rider 3: Asymmetric landing

### Expected Results
- Rider 1 vs Reference: ~70% similarity, early_extension detected
- Rider 2 vs Reference: ~65% similarity, premature_rotation detected
- Rider 3 vs Reference: ~75% similarity, asymmetric_landing detected

## Troubleshooting Checklist

- [ ] Backend server is running
- [ ] Pose service is running
- [ ] MongoDB is connected
- [ ] Videos are fully processed
- [ ] API endpoint is accessible
- [ ] Response format is correct
- [ ] Similarity scores are reasonable
- [ ] Archetypes are being detected
- [ ] Mobile UI is rendering correctly
- [ ] Error handling is working

## Support

If you encounter issues:
1. Check the backend logs
2. Check the pose service logs
3. Verify MongoDB connection
4. Add logging to debug functions
5. Check that videos have measurements
6. Verify phase boundaries are correct
