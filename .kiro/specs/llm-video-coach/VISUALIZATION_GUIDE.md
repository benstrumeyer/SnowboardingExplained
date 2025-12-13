# Video Analysis Visualization Guide

This document describes the real-time detection visualization overlay shown during video playback.

## Overview

The visualization displays what the system is detecting in real-time as it analyzes the video. It shows:
- Snowboard position and rotation
- Rider's body skeleton (pose keypoints)
- Snowboard trajectory path
- Real-time biomechanical metrics
- Current trick phase

## Visual Components

### 1. Snowboard Outline
- **Style:** Green dashed rectangle
- **Purpose:** Shows the snowboard's position and rotation angle in the frame
- **Updates:** Every frame
- **Color:** #00FF00 (green)
- **Stroke:** 3px dashed

```typescript
interface SnowboardOutline {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  angle: number; // rotation in degrees
}
```

### 2. Snowboard Path Trail
- **Style:** Phase-colored dots connected by white line
- **Purpose:** Shows the rider's trajectory across the slope
- **Updates:** Every frame (adds new point)
- **Colors by Phase:**
  - Setup: #FF6B6B (red)
  - Windup: #FFA500 (orange)
  - Throw: #FFD700 (gold)
  - Lip Timing: #00CED1 (cyan)
  - Takeoff: #00FF00 (green)
- **Trail Line:** White (#FFFFFF) with 0.6 opacity
- **Current Position:** Larger circle (r=8) with white stroke

```typescript
interface PathPoint {
  x: number;
  y: number;
  timestamp: number;
  phase: "setup" | "windup" | "throw" | "lipTiming" | "takeoff";
}
```

### 3. Pose Skeleton
- **Style:** Stick figure with joints and connecting bones
- **Purpose:** Shows rider's body position and alignment
- **Keypoints:** 12 joints (head, neck, shoulders, elbows, hips, knees, ankles)
- **Keypoint Rendering:**
  - Radius: 5px
  - High confidence (>0.7): Green (#00FF00)
  - Low confidence (≤0.7): Yellow (#FFFF00)
  - Stroke: White (#FFFFFF) 1px
- **Bone Rendering:**
  - Green: Correct alignment
  - Red: Issue detected
  - Stroke width: 2px

```typescript
interface PoseKeypoint {
  name: "head" | "neck" | "shoulder_left" | "shoulder_right" | "elbow_left" | "elbow_right" | "hip_left" | "hip_right" | "knee_left" | "knee_right" | "ankle_left" | "ankle_right";
  x: number;
  y: number;
  confidence: number; // 0-1
}

interface PoseBone {
  from: string; // keypoint name
  to: string;   // keypoint name
  color: string; // green or red
}
```

### 4. Detection Indicators Panel (Right Side)
- **Position:** Right side of video (x: 320)
- **Style:** Semi-transparent black boxes with color-coded indicators
- **Metrics Displayed:**
  1. Head Gaze (direction)
  2. Body Stack (stacked/not stacked)
  3. Leg Bend (angle in degrees)
  4. Upper Body Rotation (degrees of separation)
  5. Edge (toe_edge or heel_edge)
  6. Snap Intensity (0-100%)

```typescript
interface DetectionIndicator {
  label: string;
  value: string;
  color: string; // green, red, yellow, or cyan
  yPos: number;  // 20 + index * 35
}
```

**Layout:**
- Background: Black (#000000) with 0.7 opacity, 75x30px, rounded corners
- Color dot: 4px circle on left
- Label: 9px white text
- Value: 11px colored text (bold)
- Spacing: 35px between indicators

### 5. Phase Label (Top-Left)
- **Position:** Top-left corner (x: 10, y: 10)
- **Style:** Semi-transparent black box
- **Size:** 100x40px
- **Content:**
  - Label: "Phase" (12px white)
  - Value: Phase name in uppercase (14px, color-coded)
- **Colors:**
  - Setup: #FF6B6B
  - Windup: #FFA500
  - Throw: #FFD700
  - Lip Timing: #00CED1
  - Takeoff: #00FF00

### 6. Detection Info Badges (Bottom Panel)
- **Position:** Below video
- **Style:** Horizontal scrollable row of badges
- **Badge Style:**
  - Background: Color with 0.2 opacity
  - Left border: 3px solid color
  - Padding: 8px horizontal, 4px vertical
  - Border radius: 4px
- **Content per Badge:**
  - Label: 10px white text
  - Value: 12px colored text (bold)

```typescript
interface DetectionBadge {
  label: string;
  value: string;
  color: string;
}
```

## Data Flow

### Backend → Frontend

```typescript
interface FrameDetectionData {
  frameNumber: number;
  timestamp: number;
  
  snowboard: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
    angle: number;
    centerX: number;
    centerY: number;
  };
  
  pose: {
    keypoints: PoseKeypoint[];
  };
  
  pathTrail: PathPoint[];
  
  metrics: {
    headGaze: { direction: string; angle: number };
    bodyStack: { isStacked: boolean; weightDistribution: string };
    legBend: { averageBend: number; isStraightLegs: boolean };
    upperBodyRotation: { rotation: string; degreesSeparation: number };
    edge: "toe_edge" | "heel_edge";
    snapIntensity: number;
  };
  
  phase: "setup" | "windup" | "throw" | "lipTiming" | "takeoff";
}
```

## Color Coding System

### Phase Colors
- **Setup:** #FF6B6B (Red) - Initial approach
- **Windup:** #FFA500 (Orange) - Loading the board
- **Throw:** #FFD700 (Gold) - Executing the snap
- **Lip Timing:** #00CED1 (Cyan) - Timing takeoff
- **Takeoff:** #00FF00 (Green) - Leaving the feature

### Metric Colors
- **Good/Correct:** #00FF00 (Green)
- **Warning/Suboptimal:** #FFFF00 (Yellow)
- **Issue/Problem:** #FF6B6B (Red)
- **Neutral/Info:** #FFFFFF (White)

## Performance Considerations

1. **SVG Rendering:** Use React Native SVG for efficient rendering
2. **Path Trail:** Limit to last 100 points to avoid performance degradation
3. **Update Frequency:** Update overlay every frame (4 FPS = 250ms)
4. **Opacity:** Use opacity for layering without performance hit
5. **Caching:** Cache static elements (labels, backgrounds)

## Accessibility

- **Color Contrast:** All text meets WCAG AA standards
- **Labels:** All metrics have descriptive labels
- **Keypoint Labels:** Show joint names on hover (optional)
- **Phase Indicator:** Large, clear text with color + text label

## Example Usage

```typescript
import { VideoAnalysisOverlay } from './VideoAnalysisOverlay';

export const VideoPlayer = ({ videoUri, analysisData }) => {
  return (
    <View>
      <VideoAnalysisOverlay detection={analysisData} />
      <DetectionInfoPanel detections={analysisData.detections} />
    </View>
  );
};
```

## Testing Checklist

- [ ] Snowboard outline renders at correct position and angle
- [ ] Path trail shows correct phase colors
- [ ] Pose skeleton keypoints render with correct confidence colors
- [ ] Detection indicators update in real-time
- [ ] Phase label shows correct phase and color
- [ ] Detection badges display all metrics
- [ ] Overlay doesn't block video playback
- [ ] Performance is smooth at 4 FPS
- [ ] Colors are accessible (WCAG AA)
- [ ] All text is readable on video background

