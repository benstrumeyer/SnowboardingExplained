# Reference Library Guide

## Overview

The Reference Library is a comprehensive database of coach form signals extracted from your coach's videos. It serves as the ground truth for all comparisons and coaching feedback.

## Architecture

```
Coach Videos (uploaded)
    ↓
Pose Service (extracts pose data)
    ↓
Reference Library Service (extracts all signals)
    ↓
MongoDB (stores reference signal sets)
    ↓
Comparison Service (uses references for comparison)
    ↓
Mobile App (displays coaching feedback)
```

## What Gets Extracted

For each coach video phase, we extract:

### 1. Phase Detection Signals
- Edge angle (heel/toe pressure)
- Hip height and velocity
- Ankle-to-hip ratio
- Chest rotation and velocity
- Head rotation
- Body stackedness
- Form variance
- Ankle landing sync

### 2. Stacked Position Metrics
- Left/right knee angles
- Hip forward bias
- Stance width
- Body stackedness
- Weight distribution
- Ankle height symmetry
- Overall stackedness score

### 3. Statistics
- Frame count
- Average confidence
- Signal quality (0-100)

## Workflow

### Step 1: Upload Coach Video

```bash
POST /api/form-analysis/upload
Content-Type: multipart/form-data

video: <coach_video.mp4>
intendedTrick: "backside_360"
stance: "regular"
```

Response:
```json
{
  "videoId": "coach_video_123",
  "status": "processing"
}
```

### Step 2: Wait for Processing

Poll the status:
```bash
GET /api/video/job_status/:jobId
```

When complete, the video will have full pose data.

### Step 3: Create Reference Signal Set

```bash
POST /api/reference-library/create

{
  "trick": "backside_360",
  "phase": "takeoff",
  "stance": "regular",
  "sourceVideoId": "coach_video_123",
  "startFrame": 45,
  "endFrame": 65,
  "coachName": "Coach John",
  "description": "Perfect backside 360 takeoff - explosive pop with clean rotation",
  "quality": 5,
  "notes": "Ideal form for reference",
  "tags": ["explosive", "clean", "reference"]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "_id": "ref_set_123",
    "trick": "backside_360",
    "phase": "takeoff",
    "signals": {
      "edgeAngle": [...],
      "hipHeight": [...],
      "hipVelocity": [...],
      ...
    },
    "stackedPosition": {
      "kneeAngleAverage": 98.5,
      "hipForwardBias": 0.15,
      ...
    },
    "statistics": {
      "frameCount": 21,
      "averageConfidence": 0.92,
      "signalQuality": 92
    }
  }
}
```

## API Endpoints

### Create Reference Signal Set
```
POST /api/reference-library/create
```

### Get Reference Signal Set
```
GET /api/reference-library/:id
```

### Get All Sets for Trick/Phase
```
GET /api/reference-library/trick/:trick/phase/:phase?stance=regular
```

### Get Best Reference (Highest Quality)
```
GET /api/reference-library/best/:trick/:phase/:stance
```

### Get All Sets for Trick
```
GET /api/reference-library/trick/:trick
```

### Get All Sets by Coach
```
GET /api/reference-library/coach/:coachName
```

### List All Reference Sets
```
GET /api/reference-library/list
```

### Get Library Statistics
```
GET /api/reference-library/stats
```

### Search by Tags
```
GET /api/reference-library/search/tags?tags=explosive,clean,reference
```

### Get Sets with Minimum Quality
```
GET /api/reference-library/quality/:minQuality
```

### Update Reference Set
```
PUT /api/reference-library/:id
```

### Delete Reference Set
```
DELETE /api/reference-library/:id
```

## Building Your Library

### Recommended Approach

1. **Start with One Trick**
   - Upload 3-5 coach videos of the same trick
   - Extract different phases (setup, takeoff, air, landing)
   - Create reference sets for each phase

2. **Expand to Multiple Tricks**
   - Add backside 360, frontside 180, etc.
   - Build library for both regular and goofy stances

3. **Add Variations**
   - Different styles (aggressive, smooth, etc.)
   - Different conditions (powder, park, etc.)

### Quality Ratings

- **5 (Perfect)** - Textbook form, ideal for reference
- **4 (Excellent)** - Very good form, minor imperfections
- **3 (Good)** - Solid form, some variations
- **2 (Fair)** - Acceptable form, notable variations
- **1 (Poor)** - Not recommended for reference

### Tagging Strategy

Use tags to organize your library:
- **Form type:** explosive, smooth, controlled, aggressive
- **Quality:** reference, good, acceptable
- **Conditions:** powder, park, groomed
- **Style:** compact, extended, counter-rotated
- **Difficulty:** beginner, intermediate, advanced

## Using the Library

### In Comparison Mode

When comparing a rider to a reference:

```bash
POST /api/comparison

{
  "riderVideoId": "rider_video_123",
  "referenceVideoId": "coach_video_123"
}
```

The system automatically:
1. Fetches both videos
2. Normalizes phases to [0, 1] time
3. Compares all signals
4. Detects coaching archetypes
5. Returns coaching feedback

### In Stacked Position Analysis

```bash
POST /api/stacked-position/analyze

{
  "videoId": "rider_video_123",
  "referenceId": "ref_set_123"
}
```

Returns:
- Rider stacked position metrics
- Deltas from reference
- Coaching feedback
- Overall stackedness score

## Example: Building a Backside 360 Library

### Video 1: Setup Phase
```
POST /api/reference-library/create
{
  "trick": "backside_360",
  "phase": "setupCarve",
  "stance": "regular",
  "sourceVideoId": "coach_bs360_v1",
  "startFrame": 0,
  "endFrame": 30,
  "coachName": "Coach John",
  "description": "Perfect setup carve - light heel pressure, weight forward",
  "quality": 5,
  "tags": ["setup", "reference", "light-pressure"]
}
```

### Video 2: Takeoff Phase
```
POST /api/reference-library/create
{
  "trick": "backside_360",
  "phase": "takeoff",
  "stance": "regular",
  "sourceVideoId": "coach_bs360_v1",
  "startFrame": 31,
  "endFrame": 55,
  "coachName": "Coach John",
  "description": "Explosive pop with clean shoulder snap",
  "quality": 5,
  "tags": ["takeoff", "reference", "explosive"]
}
```

### Video 3: Air Phase
```
POST /api/reference-library/create
{
  "trick": "backside_360",
  "phase": "air",
  "stance": "regular",
  "sourceVideoId": "coach_bs360_v1",
  "startFrame": 56,
  "endFrame": 85,
  "coachName": "Coach John",
  "description": "Stable rotation with controlled body position",
  "quality": 5,
  "tags": ["air", "reference", "stable"]
}
```

### Video 4: Landing Phase
```
POST /api/reference-library/create
{
  "trick": "backside_360",
  "phase": "landing",
  "stance": "regular",
  "sourceVideoId": "coach_bs360_v1",
  "startFrame": 86,
  "endFrame": 110,
  "coachName": "Coach John",
  "description": "Smooth landing with proper weight absorption",
  "quality": 5,
  "tags": ["landing", "reference", "smooth"]
}
```

## Querying the Library

### Get All Backside 360 References
```bash
GET /api/reference-library/trick/backside_360
```

### Get Best Takeoff Reference
```bash
GET /api/reference-library/best/backside_360/takeoff/regular
```

### Get All Coach John's References
```bash
GET /api/reference-library/coach/Coach%20John
```

### Get Library Statistics
```bash
GET /api/reference-library/stats
```

Response:
```json
{
  "totalReferenceSets": 12,
  "tricksCount": 3,
  "tricks": ["backside_360", "frontside_180", "straight_air"],
  "phasesCount": 4,
  "phases": ["setupCarve", "takeoff", "air", "landing"],
  "coachesCount": 1,
  "coaches": ["Coach John"],
  "averageQuality": 4.8
}
```

## Best Practices

1. **Quality Over Quantity**
   - Focus on perfect form first
   - Add variations later

2. **Consistent Tagging**
   - Use consistent tag names
   - Document your tagging strategy

3. **Multiple References**
   - Store multiple references per phase
   - Different styles and approaches

4. **Regular Updates**
   - Add new tricks as you learn them
   - Update quality ratings based on feedback

5. **Documentation**
   - Add detailed descriptions
   - Include coaching notes

## Signals Extracted

### Edge Angle
- Heel/toe pressure detection
- Range: -90° to +90°
- Positive = toeside, Negative = heelside

### Hip Metrics
- Height (Y position)
- Velocity (rate of change)
- Acceleration (rate of velocity change)

### Ankle-to-Hip Ratio
- >1 = airborne
- <1 = grounded
- Used for phase detection

### Chest Rotation
- Rotation angle relative to board
- Velocity of rotation
- Used for snap detection

### Head Rotation
- Rotation relative to body
- Used for gaze analysis

### Body Stackedness
- Distance between hip and shoulder centers
- 0-100 score (higher = more stacked)

### Form Variance
- Rate of body position change
- Stability indicator

### Ankle Landing Sync
- Left vs right ankle Y position
- Timing offset between feet
- Symmetry indicator

## Troubleshooting

### Issue: Low Signal Quality
- Ensure video has good lighting
- Check that pose detection is working
- Verify frame range is correct

### Issue: Missing Signals
- Check that video has full pose data
- Verify frame range contains valid frames
- Ensure video was fully processed

### Issue: Inconsistent Results
- Use highest quality references (quality: 5)
- Ensure consistent stance
- Verify trick classification

## Next Steps

1. Upload your first coach video
2. Extract reference signal sets for each phase
3. Tag and organize your library
4. Use references for rider comparisons
5. Gather feedback and refine

## Integration with Comparison Mode

The Reference Library integrates seamlessly with Comparison Mode:

1. **Automatic Reference Selection**
   - System finds best reference for trick/phase/stance
   - Falls back to other stances if needed

2. **Signal Comparison**
   - Compares rider signals to reference signals
   - Computes deltas and archetypes

3. **Coaching Feedback**
   - Maps deltas to coaching patterns
   - Generates actionable feedback

4. **Progress Tracking**
   - Compare multiple attempts to same reference
   - Track improvement over time

## Example: Complete Workflow

```
1. Upload coach backside 360 video
   → videoId: coach_bs360_123

2. Extract reference signal sets
   → ref_set_setup_123
   → ref_set_takeoff_123
   → ref_set_air_123
   → ref_set_landing_123

3. Upload rider attempt
   → videoId: rider_bs360_456

4. Compare rider to reference
   → GET /api/comparison/rider_bs360_456/coach_bs360_123
   → Returns: deltas, archetypes, coaching feedback

5. Display results to rider
   → "You extended 120ms earlier than the reference"
   → "Your shoulders opened before max knee extension"
   → Similarity: 72%
```

This creates a complete feedback loop for coaching and improvement!
