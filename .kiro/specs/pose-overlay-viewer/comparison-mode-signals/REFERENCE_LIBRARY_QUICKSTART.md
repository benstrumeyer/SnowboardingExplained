# Reference Library Quick Start

## 5-Minute Setup

### 1. Upload Coach Video
```bash
curl -X POST http://localhost:3001/api/form-analysis/upload \
  -F "video=@coach_backside_360.mp4" \
  -F "intendedTrick=backside_360" \
  -F "stance=regular"
```

Response:
```json
{
  "videoId": "coach_bs360_123",
  "status": "processing"
}
```

### 2. Wait for Processing
```bash
curl http://localhost:3001/api/video/job_status/coach_bs360_123
```

When `status: "fully_analyzed"`, proceed to step 3.

### 3. Create Reference Signal Set
```bash
curl -X POST http://localhost:3001/api/reference-library/create \
  -H "Content-Type: application/json" \
  -d '{
    "trick": "backside_360",
    "phase": "takeoff",
    "stance": "regular",
    "sourceVideoId": "coach_bs360_123",
    "startFrame": 30,
    "endFrame": 55,
    "coachName": "Coach John",
    "description": "Perfect takeoff - explosive pop with clean rotation",
    "quality": 5,
    "tags": ["explosive", "reference"]
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "_id": "ref_set_123",
    "trick": "backside_360",
    "phase": "takeoff",
    "signals": { ... },
    "stackedPosition": { ... },
    "statistics": {
      "frameCount": 26,
      "averageConfidence": 0.94,
      "signalQuality": 94
    }
  }
}
```

### 4. Use for Comparison
```bash
curl http://localhost:3001/api/comparison/rider_video_456/coach_bs360_123
```

Done! You now have a reference and can compare riders to it.

## Common Tasks

### Get All References for a Trick
```bash
curl http://localhost:3001/api/reference-library/trick/backside_360
```

### Get Best Reference for a Phase
```bash
curl http://localhost:3001/api/reference-library/best/backside_360/takeoff/regular
```

### Get Library Statistics
```bash
curl http://localhost:3001/api/reference-library/stats
```

### Search by Tags
```bash
curl "http://localhost:3001/api/reference-library/search/tags?tags=explosive,reference"
```

### Update Reference Notes
```bash
curl -X PUT http://localhost:3001/api/reference-library/ref_set_123 \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated notes about this reference",
    "quality": 5
  }'
```

## Frame Selection Tips

### How to Find Frame Ranges

1. **Upload video and get pose data**
2. **Use frame viewer to identify phases:**
   - Setup: Rider carving into the feature
   - Takeoff: From last edge contact to liftoff
   - Air: From liftoff to landing
   - Landing: From first contact to ride away

3. **Note the frame numbers**
4. **Use those in reference creation**

### Example: Backside 360

```
Frame 0-25:   Setup carve (light heel pressure)
Frame 26-50:  Takeoff (explosive pop)
Frame 51-80:  Air (rotation)
Frame 81-110: Landing (absorption)
```

## Building Your Library

### Week 1: One Trick
- Upload 1 coach video
- Extract 4 reference sets (setup, takeoff, air, landing)
- Quality: 5/5

### Week 2: Add Variations
- Upload 2 more coach videos of same trick
- Extract reference sets for each
- Different styles (aggressive, smooth)

### Week 3: Add More Tricks
- Upload videos for 2-3 other tricks
- Extract reference sets for each
- Build comprehensive library

### Week 4+: Expand and Refine
- Add more tricks
- Add different stances (goofy)
- Refine quality ratings based on feedback

## Quality Checklist

Before marking a reference as quality 5:

- [ ] Video has clear lighting
- [ ] Pose detection is accurate (>90% confidence)
- [ ] Form is textbook perfect
- [ ] No major body occlusions
- [ ] Smooth motion (no jitter)
- [ ] Complete phase captured
- [ ] Consistent with coaching principles

## Troubleshooting

### "Video not found"
- Verify videoId is correct
- Check that video was fully processed

### "No frames found in range"
- Verify startFrame < endFrame
- Check that frames exist in video
- Use frame viewer to find correct range

### "Low signal quality"
- Check video lighting
- Verify pose detection worked
- Try different frame range
- Use different video

### "Inconsistent results"
- Use quality 5 references only
- Ensure consistent stance
- Verify trick classification
- Check frame range captures full phase

## Next Steps

1. ✅ Upload first coach video
2. ✅ Create reference signal sets
3. ✅ Compare rider to reference
4. ✅ View coaching feedback
5. Build comprehensive library
6. Track rider progress over time
7. Integrate with mobile app

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/reference-library/create` | POST | Create new reference |
| `/api/reference-library/:id` | GET | Get reference by ID |
| `/api/reference-library/trick/:trick` | GET | Get all for trick |
| `/api/reference-library/best/:trick/:phase/:stance` | GET | Get best reference |
| `/api/reference-library/coach/:coachName` | GET | Get all by coach |
| `/api/reference-library/list` | GET | List all |
| `/api/reference-library/stats` | GET | Get statistics |
| `/api/reference-library/search/tags` | GET | Search by tags |
| `/api/reference-library/quality/:minQuality` | GET | Filter by quality |
| `/api/reference-library/:id` | PUT | Update reference |
| `/api/reference-library/:id` | DELETE | Delete reference |

## Example: Complete Workflow

```bash
# 1. Upload coach video
VIDEO_ID=$(curl -s -X POST http://localhost:3001/api/form-analysis/upload \
  -F "video=@coach.mp4" \
  -F "intendedTrick=backside_360" \
  -F "stance=regular" | jq -r '.videoId')

# 2. Wait for processing (check status)
curl http://localhost:3001/api/video/job_status/$VIDEO_ID

# 3. Create reference for takeoff phase
REF_ID=$(curl -s -X POST http://localhost:3001/api/reference-library/create \
  -H "Content-Type: application/json" \
  -d "{
    \"trick\": \"backside_360\",
    \"phase\": \"takeoff\",
    \"stance\": \"regular\",
    \"sourceVideoId\": \"$VIDEO_ID\",
    \"startFrame\": 30,
    \"endFrame\": 55,
    \"coachName\": \"Coach John\",
    \"description\": \"Perfect takeoff\",
    \"quality\": 5,
    \"tags\": [\"reference\"]
  }" | jq -r '.data._id')

# 4. Compare rider to reference
curl http://localhost:3001/api/comparison/rider_video_123/$VIDEO_ID

# 5. View results
# Returns: deltas, archetypes, coaching feedback
```

## Tips for Success

1. **Start Simple**
   - One trick, one stance
   - Build from there

2. **Quality First**
   - Better to have 1 perfect reference than 10 mediocre ones
   - Use quality 5 for ground truth

3. **Consistent Tagging**
   - Use same tag names
   - Makes searching easier

4. **Document Everything**
   - Add detailed descriptions
   - Include coaching notes
   - Help future you understand

5. **Regular Updates**
   - Add new tricks as you learn
   - Refine existing references
   - Keep library fresh

## Support

For issues or questions:
1. Check REFERENCE_LIBRARY_GUIDE.md for detailed docs
2. Review API endpoint documentation
3. Check troubleshooting section
4. Verify video was fully processed
5. Check frame ranges are correct

## What's Next?

Once you have references:
1. Upload rider videos
2. Compare to references
3. Get coaching feedback
4. Track progress over time
5. Build comprehensive coaching system

Your reference library is the foundation for everything else!
