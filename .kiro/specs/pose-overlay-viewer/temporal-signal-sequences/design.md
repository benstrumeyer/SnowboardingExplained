# Temporal Signal Sequences - Design Document

## Architecture Overview

The temporal signal sequences system consists of 5 core components:

1. **Frame Range Selection UI** - Mobile interface for marking start/end frames
2. **Temporal Signal Extractor** - Computes position, velocity, acceleration, jerk for every body part
3. **Body Proportion Normalizer** - Scales signals based on rider body size
4. **Perfect Pose Database** - Stores complete pose mathematics for reference sequences
5. **Comparison Engine** - Compares rider attempts to perfect references with curve-based metrics

## Component Details

### 1. Frame Range Selection UI

**Location**: `backend/mobile/src/screens/TemporalSignalTaggingScreen.tsx`

**Responsibilities**:
- Display frame-by-frame video player
- Navigate frames with back/next buttons
- Mark start/end frames with visual indicators
- Display current frame number and frame range
- Allow editing frame range before submission

**Data Flow**:
```
User uploads video
  ↓
System extracts frames
  ↓
UI displays frame carousel
  ↓
User marks start frame (e.g., frame 45)
  ↓
User marks end frame (e.g., frame 78)
  ↓
UI displays "Frames 45-78" with preview
  ↓
User confirms and proceeds to signal definition
```

**Key Features**:
- Frame carousel with smooth navigation
- Visual highlight of marked frames
- Frame counter (e.g., "Frame 45 of 120")
- Ability to adjust frame range by ±1 frame
- Preview of selected frame range

### 2. Signal Sequence Definition

**Location**: `backend/mobile/src/screens/SignalSequenceDefinitionScreen.tsx`

**Responsibilities**:
- Collect signal metadata (name, phases, description)
- Validate frame range
- Trigger temporal signal extraction
- Display extraction progress

**Data Structure**:
```typescript
interface SignalSequenceDefinition {
  id: string;
  name: string; // e.g., "counter_rotation"
  phases: string[]; // e.g., ["air", "landing"]
  description: string;
  frameRange: {
    start: number;
    end: number;
  };
  videoId: string;
  createdAt: Date;
  extractedSignals?: TemporalSignals;
}
```

**Validation**:
- Frame range must be within video bounds
- Name must be unique per trick/phase combination
- At least one phase must be selected
- Description should be 10+ characters

### 3. Temporal Signal Extraction

**Location**: `backend/src/utils/temporalSignalExtractor.ts`

**Responsibilities**:
- Extract pose data for frame range
- Compute position, velocity, acceleration, jerk for every body part
- Normalize by FPS
- Compute peak values and timing
- Compute body part relationships

**Algorithm**:

```
For each frame in [start, end]:
  1. Get pose keypoints (x, y, z, confidence)
  2. Compute joint angles (e.g., elbow angle = angle between shoulder-elbow-wrist)
  3. Compute distances (e.g., arm length = distance from shoulder to wrist)
  4. Store position data

For each body part signal:
  1. Compute velocity = (position[t+1] - position[t]) / dt
  2. Compute acceleration = (velocity[t+1] - velocity[t]) / dt
  3. Compute jerk = (acceleration[t+1] - acceleration[t]) / dt
  4. Apply smoothing filter (Savitzky-Golay)
  5. Compute peak magnitude and timing
  6. Compute rate of change statistics

For body part relationships:
  1. Compute upper_body_rotation vs lower_body_rotation
  2. Compute separation = upper_rotation - lower_rotation
  3. Compute coordination score (inverse correlation)
```

**Output**:
```typescript
interface TemporalSignals {
  bodyParts: {
    [bodyPart: string]: {
      position: number[]; // [frame0, frame1, ...]
      velocity: number[];
      acceleration: number[];
      jerk: number[];
      peakMagnitude: number;
      peakTiming: number; // normalized [0, 1]
      smoothness: number; // 0-1, higher = smoother
    };
  };
  relationships: {
    [relationship: string]: {
      separation: number[]; // difference between two signals
      coordination: number; // -1 to 1, negative = inverse
    };
  };
  fps: number;
  frameCount: number;
  duration: number; // seconds
}
```

### 4. Body Proportion Normalizer

**Location**: `backend/src/utils/bodyProportionNormalizer.ts`

**Responsibilities**:
- Extract body proportions from pose data
- Compute proportion ratios between riders
- Scale position-based signals
- Flag significant size mismatches

**Body Proportions**:
```typescript
interface BodyProportions {
  height: number; // distance from head to feet
  armLength: number; // shoulder to wrist
  legLength: number; // hip to ankle
  torsoLength: number; // shoulder to hip
  shoulderWidth: number; // left shoulder to right shoulder
  hipWidth: number; // left hip to right hip
}
```

**Computation**:
```
height = distance(head, feet)
armLength = (distance(left_shoulder, left_wrist) + distance(right_shoulder, right_wrist)) / 2
legLength = (distance(left_hip, left_ankle) + distance(right_hip, right_ankle)) / 2
torsoLength = distance(shoulder_center, hip_center)
shoulderWidth = distance(left_shoulder, right_shoulder)
hipWidth = distance(left_hip, right_hip)
```

**Normalization Algorithm**:
```
For each rider:
  1. Extract body proportions
  2. Compute ratio = reference_proportion / rider_proportion
  3. For position-based signals: scale by ratio
  4. For rotation-based signals: no scaling (proportion-independent)
  5. Compute mismatch score = sum(|ratio - 1|) / num_proportions
  6. Flag if mismatch > 0.15 (15% size difference)
```

**Example**:
```
Reference coach: height = 180cm, arm length = 75cm
Rider: height = 165cm, arm length = 68cm

height_ratio = 180 / 165 = 1.09
arm_ratio = 75 / 68 = 1.10

When comparing arm position signals:
  rider_arm_position_scaled = rider_arm_position * 1.10
```

### 5. Perfect Pose Database

**Location**: `backend/src/services/perfectPoseService.ts`

**Database Schema**:
```typescript
interface PerfectPhase {
  id: string;
  trick: string; // e.g., "backside_360"
  phase: string; // e.g., "takeoff"
  stance: string; // "regular" or "switch"
  sourceVideoId: string;
  frameRange: {
    start: number;
    end: number;
  };
  
  // Complete pose timeline
  poseTimeline: {
    frameNumber: number;
    keypoints: Keypoint[]; // x, y, z, confidence
    timestamp: number; // milliseconds
  }[];
  
  // Mesh data for visualization
  meshData: {
    frameNumber: number;
    vertices: number[][]; // 3D vertex positions
    faces: number[][]; // triangle indices
  }[];
  
  // Extracted temporal signals
  temporalSignals: TemporalSignals;
  
  // Body proportions (for normalization)
  bodyProportions: BodyProportions;
  
  // Quality metrics
  quality: {
    confidence: number; // 0-1, average keypoint confidence
    consistency: number; // 0-1, how consistent across frames
    smoothness: number; // 0-1, how smooth the curves are
  };
  
  // Metadata
  tags: string[]; // e.g., ["explosive", "smooth", "reference"]
  notes: string;
  createdAt: Date;
  createdBy: string; // coach ID
}
```

**API Endpoints**:
```
POST /api/perfect-phases
  - Create new perfect phase
  - Extract temporal signals
  - Compute body proportions
  - Store in database

GET /api/perfect-phases
  - Query by trick, phase, stance
  - Filter by quality, tags
  - Return list with metadata

GET /api/perfect-phases/:id
  - Get complete phase data
  - Include pose timeline, mesh data, signals

PUT /api/perfect-phases/:id
  - Update tags, notes, quality metrics

DELETE /api/perfect-phases/:id
  - Remove perfect phase

GET /api/perfect-phases/search
  - Search by trick name
  - Filter by phase, stance, tags
  - Return matching phases
```

### 6. Comparison Engine

**Location**: `backend/src/services/temporalComparisonService.ts`

**Responsibilities**:
- Align rider and perfect sequences to [0, 1] normalized time
- Compute deltas for every body part
- Generate coaching feedback
- Compute similarity scores

**Comparison Algorithm**:

```
1. Normalize both sequences to [0, 1] time
   - Rider sequence: frames 45-78 → [0, 1]
   - Perfect sequence: frames 56-85 → [0, 1]

2. Interpolate to same number of samples (e.g., 100 samples)
   - Ensures fair comparison across different video lengths

3. Normalize rider body proportions to match perfect
   - Scale position-based signals
   - Keep rotation-based signals unchanged

4. For each body part:
   a. Compute position delta = rider_position - perfect_position
   b. Compute velocity delta = rider_velocity - perfect_velocity
   c. Compute acceleration delta = rider_accel - perfect_accel
   d. Compute timing offset = peak_timing_rider - peak_timing_perfect
   e. Compute similarity score = 1 - (mean_absolute_error / max_value)

5. Identify deviations:
   - Magnitude-based: position/velocity/acceleration deltas
   - Timing-based: peak timing offsets
   - Coordination-based: relationship differences

6. Generate coaching feedback:
   - "Your arm snap is 15°/frame too slow"
   - "Your upper body rotation peaks 120ms too early"
   - "Your lower body extension is 8cm too short"
```

**Output**:
```typescript
interface ComparisonResult {
  riderId: string;
  perfectPhaseId: string;
  
  bodyPartComparisons: {
    [bodyPart: string]: {
      positionDelta: number;
      velocityDelta: number;
      accelerationDelta: number;
      timingOffset: number; // milliseconds
      similarityScore: number; // 0-100
      feedback: string; // e.g., "15°/frame too slow"
    };
  };
  
  overallSimilarityScore: number; // 0-100
  
  deviations: {
    magnitude: string[]; // body parts with magnitude issues
    timing: string[]; // body parts with timing issues
    coordination: string[]; // coordination issues
  };
  
  coachingFeedback: string[]; // specific, actionable feedback
  
  comparedAt: Date;
}
```

## Data Flow Diagram

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

## Type Definitions

**Location**: `backend/src/types/temporalSignals.ts`

```typescript
// Keypoint with 3D position and confidence
interface Keypoint {
  name: string; // e.g., "left_shoulder"
  x: number;
  y: number;
  z: number;
  confidence: number;
}

// Single frame of pose data
interface PoseFrame {
  frameNumber: number;
  timestamp: number; // milliseconds
  keypoints: Keypoint[];
}

// Temporal signal for a single body part
interface BodyPartSignal {
  name: string;
  position: number[]; // one value per frame
  velocity: number[];
  acceleration: number[];
  jerk: number[];
  peakMagnitude: number;
  peakTiming: number; // [0, 1]
  smoothness: number; // [0, 1]
}

// All temporal signals for a sequence
interface TemporalSignals {
  bodyParts: Record<string, BodyPartSignal>;
  relationships: Record<string, {
    separation: number[];
    coordination: number;
  }>;
  fps: number;
  frameCount: number;
  duration: number;
}

// Body proportions for normalization
interface BodyProportions {
  height: number;
  armLength: number;
  legLength: number;
  torsoLength: number;
  shoulderWidth: number;
  hipWidth: number;
}

// Perfect phase stored in database
interface PerfectPhase {
  id: string;
  trick: string;
  phase: string;
  stance: string;
  sourceVideoId: string;
  frameRange: { start: number; end: number };
  poseTimeline: PoseFrame[];
  meshData: any[]; // 3D mesh for visualization
  temporalSignals: TemporalSignals;
  bodyProportions: BodyProportions;
  quality: {
    confidence: number;
    consistency: number;
    smoothness: number;
  };
  tags: string[];
  notes: string;
  createdAt: Date;
  createdBy: string;
}

// Comparison result
interface ComparisonResult {
  riderId: string;
  perfectPhaseId: string;
  bodyPartComparisons: Record<string, {
    positionDelta: number;
    velocityDelta: number;
    accelerationDelta: number;
    timingOffset: number;
    similarityScore: number;
    feedback: string;
  }>;
  overallSimilarityScore: number;
  deviations: {
    magnitude: string[];
    timing: string[];
    coordination: string[];
  };
  coachingFeedback: string[];
  comparedAt: Date;
}
```

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Create type definitions
- [ ] Implement temporal signal extractor
- [ ] Implement body proportion normalizer
- [ ] Create database schema

### Phase 2: UI & Data Collection
- [ ] Build frame range selection UI
- [ ] Build signal sequence definition UI
- [ ] Create API endpoints for storing perfect phases
- [ ] Integrate LLM analysis

### Phase 3: Comparison & Feedback
- [ ] Implement comparison engine
- [ ] Build comparison UI
- [ ] Generate coaching feedback
- [ ] Create comparison API endpoints

### Phase 4: Refinement
- [ ] Add curve comparison metrics
- [ ] Optimize performance
- [ ] Add visualization tools
- [ ] Create documentation

## Key Algorithms

### Temporal Signal Extraction

```typescript
function extractTemporalSignals(
  poseFrames: PoseFrame[],
  fps: number
): TemporalSignals {
  const dt = 1 / fps; // time between frames
  
  // Extract position for each body part
  const positions = extractPositions(poseFrames);
  
  // Compute derivatives
  const velocities = computeDerivative(positions, dt);
  const accelerations = computeDerivative(velocities, dt);
  const jerks = computeDerivative(accelerations, dt);
  
  // Apply smoothing
  const smoothedVelocities = smoothCurve(velocities);
  const smoothedAccelerations = smoothCurve(accelerations);
  const smoothedJerks = smoothCurve(jerks);
  
  // Compute statistics
  const bodyParts = {};
  for (const [bodyPart, positionCurve] of Object.entries(positions)) {
    bodyParts[bodyPart] = {
      position: positionCurve,
      velocity: smoothedVelocities[bodyPart],
      acceleration: smoothedAccelerations[bodyPart],
      jerk: smoothedJerks[bodyPart],
      peakMagnitude: Math.max(...positionCurve),
      peakTiming: positionCurve.indexOf(Math.max(...positionCurve)) / positionCurve.length,
      smoothness: computeSmoothness(smoothedAccelerations[bodyPart]),
    };
  }
  
  return {
    bodyParts,
    relationships: computeRelationships(bodyParts),
    fps,
    frameCount: poseFrames.length,
    duration: poseFrames.length / fps,
  };
}
```

### Curve Comparison

```typescript
function compareCurves(
  riderCurve: number[],
  perfectCurve: number[]
): ComparisonMetrics {
  // Normalize to [0, 1] time
  const riderNormalized = interpolate(riderCurve, 100);
  const perfectNormalized = interpolate(perfectCurve, 100);
  
  // Compute deltas
  const positionDelta = meanAbsoluteError(riderNormalized, perfectNormalized);
  const peakDelta = Math.abs(
    Math.max(...riderNormalized) - Math.max(...perfectNormalized)
  );
  const timingDelta = Math.abs(
    indexOfMax(riderNormalized) - indexOfMax(perfectNormalized)
  ) / 100; // normalized to [0, 1]
  
  // Compute similarity
  const similarityScore = 1 - (positionDelta / Math.max(...perfectNormalized));
  
  return {
    positionDelta,
    peakDelta,
    timingDelta,
    similarityScore: Math.max(0, Math.min(1, similarityScore)),
  };
}
```

## Next Steps

1. Create type definitions file
2. Implement temporal signal extractor
3. Implement body proportion normalizer
4. Design database schema
5. Create mobile UI for frame selection
6. Implement comparison engine
7. Create API endpoints
8. Build comparison UI
