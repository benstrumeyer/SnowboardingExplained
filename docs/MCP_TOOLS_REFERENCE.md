# MCP Tools Reference

Complete documentation for all 23 MCP tools in the form analysis system.

## Overview

The MCP tools are organized into 8 categories:

1. **Pose Retrieval** (4 tools) - Query pose data
2. **Phase Analysis** (4 tools) - Query phase-specific data
3. **Video Overview** (3 tools) - Query video metadata
4. **Critical Analysis** (2 tools) - Spin control and jump metrics
5. **Form Comparison** (2 tools) - Compare videos to reference
6. **Reference Data** (4 tools) - Access reference poses and rules
7. **Reference Library** (3 tools) - Manage reference library
8. **Coaching Knowledge** (1 tool) - Get coaching tips

---

## 1. Pose Retrieval Tools

### get_pose_at_frame

Get a single pose with raw angles at a specific frame.

**Parameters:**
- `videoId` (string, required): Video ID
- `frame` (number, required): Frame number

**Response:**
```json
{
  "success": true,
  "data": {
    "frameNumber": 150,
    "timestamp": 5.0,
    "joints3D": [...],
    "jointAngles": {
      "leftKnee": 150,
      "rightKnee": 150,
      "leftHip": 90,
      "rightHip": 90,
      "leftShoulder": 45,
      "rightShoulder": 45,
      "spine": 0
    },
    "confidence": 0.95
  }
}
```

### get_poses_in_range

Get all poses in a frame range.

**Parameters:**
- `videoId` (string, required): Video ID
- `startFrame` (number, required): Start frame
- `endFrame` (number, required): End frame

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video-123",
    "startFrame": 100,
    "endFrame": 200,
    "frameCount": 101,
    "poses": [...]
  }
}
```

### get_phase_poses

Get all poses in a specific phase.

**Parameters:**
- `videoId` (string, required): Video ID
- `phaseName` (string, required): Phase name (setupCarve, windUp, snap, takeoff, air, landing)

**Response:**
```json
{
  "success": true,
  "data": {
    "phaseName": "takeoff",
    "startFrame": 150,
    "endFrame": 155,
    "frameCount": 6,
    "poses": [...],
    "keyMoments": [
      {
        "name": "peak_extension",
        "frame": 152,
        "description": "Maximum knee extension"
      }
    ]
  }
}
```

### get_key_moment_poses

Get poses at key moments (takeoff, peak height, landing).

**Parameters:**
- `videoId` (string, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video-123",
    "moments": [
      {
        "name": "takeoff",
        "frame": 150,
        "timestamp": 5.0,
        "phase": "takeoff",
        "pose": {...},
        "description": "Rider leaves the lip"
      },
      {
        "name": "peak_height",
        "frame": 180,
        "timestamp": 6.0,
        "phase": "air",
        "pose": {...},
        "description": "Maximum height reached"
      },
      {
        "name": "landing",
        "frame": 210,
        "timestamp": 7.0,
        "phase": "landing",
        "pose": {...},
        "description": "Board touches down"
      }
    ]
  }
}
```

---

## 2. Phase Analysis Tools

### get_phase_info

Get phase boundaries and metrics.

**Parameters:**
- `videoId` (string, required): Video ID
- `phaseName` (string, optional): Specific phase name

**Response:**
```json
{
  "success": true,
  "data": {
    "phaseName": "takeoff",
    "startFrame": 150,
    "endFrame": 155,
    "duration": 0.2,
    "keyMetrics": {
      "bodyStackedness": 88,
      "kneeExtension": 150,
      "edgeAngle": 0
    },
    "issuesDetected": []
  }
}
```

### get_takeoff_analysis

Get detailed takeoff analysis.

**Parameters:**
- `videoId` (string, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "takeoffFrame": 150,
    "lipLine": {
      "center": {"x": 0, "y": 1.5, "z": 0},
      "height": 1.5,
      "direction": {"x": 0, "y": 0, "z": 1},
      "angle": 0,
      "width": 2.0
    },
    "formMetrics": {
      "hipAngle": 90,
      "kneeBend": 150,
      "bodyOpenness": 0,
      "spineAngle": 0,
      "shoulderAlignment": 0
    },
    "tailPressure": {
      "popType": "proper_tail",
      "liftoffDelay": 0.05,
      "weightDistributionTimeline": [...]
    },
    "momentumAnalysis": {
      "snapIntensity": 8,
      "momentumTransfer": 95
    },
    "flatSpinVerification": {...}
  }
}
```

### get_air_analysis

Get air phase analysis.

**Parameters:**
- `videoId` (string, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "airDrift": {
      "distance": 0.5,
      "direction": {"x": 0.1, "y": 0, "z": 0.9},
      "isStraight": true
    },
    "shoulderAlignment": {
      "maxDrop": 15,
      "dropFrame": 180,
      "isConsistent": true
    },
    "rotationAxis": {
      "type": "clean_flat",
      "tiltDegrees": 5,
      "stability": 92
    },
    "rotationCount": 1,
    "rotationDirection": "frontside",
    "grabDetected": false
  }
}
```

### get_landing_analysis

Get landing phase analysis.

**Parameters:**
- `videoId` (string, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "landingFrame": 210,
    "boardAngle": 5,
    "landingStance": "regular",
    "landingQuality": "clean",
    "spinControl": {
      "isControlled": true,
      "counterRotationDetected": false
    },
    "absorptionQuality": {
      "kneeBendAtImpact": 45,
      "straightLegPopDetected": false
    }
  }
}
```

---

## 3. Video Overview Tools

### get_video_summary

Get pre-computed summary of a video.

**Parameters:**
- `videoId` (string, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video-123",
    "trickIdentified": "backside 360",
    "confidence": 92,
    "phasesDetected": ["setupCarve", "windUp", "snap", "takeoff", "air", "landing"],
    "keyIssues": ["Slight chest over-rotation"],
    "keyPositives": ["Good body stackedness", "Clean landing"],
    "recommendedFocusAreas": ["Reduce chest rotation", "Extend knees more"],
    "overallAssessment": "Good form with minor adjustments needed",
    "progressionAdvice": "Ready to progress to 540s"
  }
}
```

### get_video_metadata

Get video metadata.

**Parameters:**
- `videoId` (string, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video-123",
    "duration": 10.5,
    "frameCount": 315,
    "fps": 30,
    "stance": "regular",
    "trickIdentified": "backside 360",
    "uploadedAt": "2025-12-20T10:30:00Z"
  }
}
```

### list_available_videos

List all processed videos.

**Parameters:**
- `limit` (number, optional): Max videos to return (default: 50)
- `trick` (string, optional): Filter by trick name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "videoId": "video-123",
      "trickName": "backside 360",
      "uploadedAt": "2025-12-20T10:30:00Z",
      "analysisStatus": "fully_analyzed",
      "stance": "regular"
    },
    ...
  ]
}
```

---

## 4. Critical Analysis Tools

### get_spin_control_analysis

**MOST IMPORTANT** - Get detailed spin control analysis.

**Parameters:**
- `videoId` (string, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "snapPower": {
      "powerLevel": 8,
      "powerDescription": "Strong snap",
      "snapSpeed": 240
    },
    "windUp": {
      "maxAngle": 45,
      "frame": 140,
      "timestamp": 4.67
    },
    "takeoff": {
      "chestAngle": 0,
      "frame": 150,
      "timestamp": 5.0
    },
    "snapDuration": 0.33,
    "momentumThroughLip": {
      "snapMomentum": 100,
      "momentumAtLipExit": 95,
      "momentumLoss": 5,
      "momentumLossPercent": 5,
      "lossDetected": false
    },
    "separation": {
      "upperBodyRotation": 45,
      "lowerBodyRotation": 0,
      "maxSeparationDegrees": 45,
      "maxSeparationFrame": 180,
      "timeline": [...]
    },
    "spinControlVerdict": {
      "verdict": "controlled",
      "reasoning": "Good separation maintained throughout air",
      "coachTip": "Maintain this snap power for consistency"
    },
    "degreesShortOfTarget": 0,
    "degreesOverTarget": 0,
    "recommendedSnapSpeedAdjustment": 0,
    "recommendedAirAdjustment": "maintain"
  }
}
```

### get_jump_metrics

Get jump metrics.

**Parameters:**
- `videoId` (string, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "airTime": 0.8,
    "jumpSize": 3.9,
    "knuckleRisk": "low",
    "landingZone": "sweet_spot"
  }
}
```

---

## 5. Form Comparison Tools

### get_form_comparison

Compare video to reference form.

**Parameters:**
- `videoId` (string, required): Video ID
- `phaseName` (string, optional): Specific phase

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video-123",
    "trickName": "backside 360",
    "phase": "takeoff",
    "similarityScore": 82,
    "majorDeviations": [
      {
        "keypoint": "chest_rotation",
        "deviationAmount": 5,
        "direction": "over_rotated",
        "severity": "minor"
      }
    ],
    "prioritizedFeedback": [
      {
        "priority": 1,
        "issue": "Slight chest rotation",
        "correction": "Keep chest more aligned",
        "importance": "important"
      }
    ],
    "acceptableRanges": {
      "chestRotation": {"min": -15, "max": 15},
      "hipHeight": {"min": 0.8, "max": 1.2}
    }
  }
}
```

### compare_videos

Compare two videos side-by-side.

**Parameters:**
- `videoId1` (string, required): First video ID
- `videoId2` (string, required): Second video ID
- `phaseName` (string, optional): Specific phase

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId1": "video-123",
    "videoId2": "video-456",
    "phase": "takeoff",
    "perMetricComparison": [
      {
        "metric": "snapSpeed",
        "value1": 180,
        "value2": 165,
        "difference": 15,
        "percentDifference": 8.3
      }
    ],
    "overallSimilarity": 82,
    "keyDifferences": [
      "Video 1 has faster snap speed",
      "Video 2 has better body stackedness"
    ]
  }
}
```

---

## 6. Reference Data Tools

### get_reference_pose

Get ideal reference pose.

**Parameters:**
- `trickName` (string, required): Trick name
- `phaseName` (string, optional): Phase name

**Response:**
```json
{
  "success": true,
  "data": {
    "trickName": "backside 360",
    "phase": "takeoff",
    "stance": "regular",
    "qualityRating": 5,
    "sourceVideoId": "ref-001",
    "sourceFrameNumber": 150,
    "poseData": {...},
    "jointAngles": {...},
    "acceptableRanges": {
      "leftKnee": {"min": 140, "max": 160},
      "rightKnee": {"min": 140, "max": 160}
    },
    "keyPoints": ["Knees extended", "Hips aligned"],
    "commonMistakes": ["Knees too bent"],
    "notes": "Ideal reference for regular stance",
    "styleVariation": "compact",
    "isPrimary": true
  }
}
```

### get_trick_rules

Get technique rules.

**Parameters:**
- `trickName` (string, required): Trick name
- `phaseName` (string, optional): Phase name

**Response:**
```json
{
  "success": true,
  "data": {
    "trickName": "backside 360",
    "phase": "takeoff",
    "rules": [
      {
        "ruleName": "Body Stackedness",
        "expectedValue": "Joints aligned over board",
        "importance": "critical",
        "description": "Rider should be stacked vertically"
      }
    ]
  }
}
```

### get_common_problems

Get common problems and fixes.

**Parameters:**
- `trickName` (string, required): Trick name
- `phaseName` (string, optional): Phase name

**Response:**
```json
{
  "success": true,
  "data": {
    "trickName": "backside 360",
    "phase": "takeoff",
    "problems": [
      {
        "problemName": "Knees Too Bent",
        "indicators": ["Knees < 140 degrees"],
        "correction": "Extend knees more at takeoff",
        "frequency": 45,
        "severity": "moderate"
      }
    ]
  }
}
```

### list_available_tricks

List all available tricks.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    "straight air",
    "backside 180",
    "frontside 180",
    "backside 360",
    ...
  ]
}
```

---

## 7. Reference Library Tools

### list_reference_poses

List reference poses with filters.

**Parameters:**
- `trickName` (string, optional): Filter by trick
- `phase` (string, optional): Filter by phase
- `stance` (string, optional): Filter by stance
- `qualityRating` (number, optional): Minimum quality
- `isPrimary` (boolean, optional): Filter by primary status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "trickName": "backside 360",
      "phase": "takeoff",
      "stance": "regular",
      "qualityRating": 5,
      ...
    }
  ]
}
```

### add_reference_pose

Add new reference pose from video frame.

**Parameters:**
- `videoId` (string, required): Source video ID
- `frameNumber` (number, required): Frame number
- `trickName` (string, required): Trick name
- `phase` (string, required): Phase name
- `stance` (string, required): Stance
- `qualityRating` (number, required): Quality (1-5)
- `notes` (string, required): Notes
- `styleVariation` (string, optional): Style variation

**Response:**
```json
{
  "success": true,
  "data": {
    "trickName": "backside 360",
    "phase": "takeoff",
    ...
  }
}
```

### set_video_analysis_status

Update video analysis status.

**Parameters:**
- `videoId` (string, required): Video ID
- `status` (string, required): Status (untagged, in_progress, fully_analyzed)

**Response:**
```json
{
  "success": true
}
```

---

## 8. Coaching Knowledge Tools

### get_coaching_tips

Get coaching tips for a trick.

**Parameters:**
- `trickName` (string, required): Trick name
- `problem` (string, optional): Specific problem
- `phase` (string, optional): Phase name
- `limit` (number, optional): Max tips (default: 5)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "trickName": "backside 360",
      "phase": "takeoff",
      "problemType": "knees_too_bent",
      "tip": "Extend your knees more at takeoff",
      "fixInstructions": "1. Practice knee extension drills\n2. Focus on explosive leg extension",
      "commonCauses": ["Lack of confidence", "Fear of height"],
      "sourceVideoId": "tutorial-001",
      "sourceTimestamp": 45,
      "relevanceScore": 95
    }
  ]
}
```

---

## Error Handling

All tools return a consistent error format:

```json
{
  "success": false,
  "error": "Video not found",
  "availableOptions": ["video-123", "video-456"]
}
```

Common error codes:
- `VIDEO_NOT_FOUND`: Video ID doesn't exist
- `FRAME_NOT_FOUND`: Frame number out of range
- `INVALID_PARAMETER`: Parameter validation failed
- `POSE_EXTRACTION_FAILED`: Pose data unavailable
- `PHASE_DETECTION_FAILED`: Phase detection failed

---

## LLM Usage Examples

### Example 1: Analyze Spin Control

```
LLM: "Analyze the spin control for video-123"

Tool Call: get_spin_control_analysis(videoId="video-123")

Response: {
  "snapPower": {"powerLevel": 8, "snapSpeed": 240},
  "separation": {"maxSeparationDegrees": 45},
  "spinControlVerdict": {"verdict": "controlled"}
}

LLM: "Your spin control is excellent with a power level of 8 and 45 degrees of separation. 
The snap speed of 240 deg/s is ideal for this trick. Keep this up!"
```

### Example 2: Compare to Reference

```
LLM: "How does my form compare to the reference?"

Tool Call: get_form_comparison(videoId="video-123", phaseName="takeoff")

Response: {
  "similarityScore": 82,
  "majorDeviations": [{"keypoint": "chest_rotation", "deviationAmount": 5}]
}

LLM: "Your form is 82% similar to the reference. The main deviation is a 5-degree 
chest over-rotation. Try keeping your chest more neutral at takeoff."
```

### Example 3: Get Coaching Tips

```
LLM: "I'm having trouble with my knees"

Tool Call: get_coaching_tips(trickName="backside 360", problem="knees_too_bent")

Response: [
  {
    "tip": "Extend your knees more at takeoff",
    "fixInstructions": "1. Practice knee extension drills..."
  }
]

LLM: "I see the issue - your knees are too bent at takeoff. Here's what to do:
1. Practice knee extension drills on flat ground
2. Focus on explosive leg extension
3. Film yourself to check your knee angle"
```

---

## Integration Notes

- All tools are called by the LLM during analysis
- No frame-by-frame LLM calls - only one LLM call per video
- Pre-computed data is retrieved via MCP tools
- Response times should be < 100ms per tool
- Tools are stateless and can be called in any order
