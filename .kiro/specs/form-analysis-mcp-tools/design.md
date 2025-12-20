# Design Document: Form Analysis MCP Tools

## Overview

This system provides comprehensive snowboard trick form analysis through a two-phase architecture:

1. **Backend Pre-Processing Pipeline**: Automatically processes uploaded videos, extracts pose data for every frame, computes all metrics, generates verdicts, and stores everything in a queryable database. This happens at upload time, before any LLM interaction.

2. **MCP Tools Layer**: Lightweight data retrieval endpoints that allow the LLM to query pre-computed results on-demand. The LLM starts with minimal context and progressively fetches only the data it needs.

This architecture ensures fast LLM responses, minimal context usage, and enables intelligent coaching feedback based on numeric measurements and technique verdicts.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VIDEO UPLOAD FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │  Mobile  │───▶│  Backend API    │───▶│  Pose Service (WSL)          │   │
│  │   App    │    │  /upload-video  │    │  - Extract 3D joints         │   │
│  └──────────┘    └─────────────────┘    │  - Every frame               │   │
│                          │              └──────────────────────────────┘   │
│                          ▼                              │                   │
│                  ┌─────────────────┐                    │                   │
│                  │  Pre-Processing │◀───────────────────┘                   │
│                  │  Pipeline       │                                        │
│                  │  - Detect phases│                                        │
│                  │  - Compute metrics                                       │
│                  │  - Generate verdicts                                     │
│                  │  - Compare to reference                                  │
│                  └─────────────────┘                                        │
│                          │                                                  │
│                          ▼                                                  │
│                  ┌─────────────────┐                                        │
│                  │   Database      │                                        │
│                  │  - VideoAnalysis│                                        │
│                  │  - ReferencePoses                                        │
│                  │  - CoachingTips │                                        │
│                  └─────────────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           LLM QUERY FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │   User   │───▶│      LLM        │───▶│     MCP Tools                │   │
│  │  Query   │    │  (Claude/GPT)   │    │  - get_video_summary()       │   │
│  └──────────┘    └─────────────────┘    │  - get_takeoff_analysis()    │   │
│                          │              │  - get_spin_control()        │   │
│                          │              │  - get_reference_pose()      │   │
│                          │              └──────────────────────────────┘   │
│                          │                              │                   │
│                          │                              ▼                   │
│                          │              ┌──────────────────────────────┐   │
│                          │              │   Database (Read Only)       │   │
│                          │              │   Pre-computed results       │   │
│                          │              └──────────────────────────────┘   │
│                          │                              │                   │
│                          ◀──────────────────────────────┘                   │
│                          │                                                  │
│                          ▼                                                  │
│                  ┌─────────────────┐                                        │
│                  │  Coaching       │                                        │
│                  │  Response       │                                        │
│                  └─────────────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Video Upload API

```typescript
// POST /api/upload-video
interface UploadVideoRequest {
  video: File;
  intendedTrick?: TrickName;           // Optional: user specifies what they're attempting
  stance?: "regular" | "goofy";        // Optional: auto-detected if not provided
}

interface UploadVideoResponse {
  videoId: string;
  status: "processing" | "complete" | "failed";
  estimatedProcessingTime?: number;    // Seconds
}
```

### 2. Backend Pre-Processing Functions (NOT MCP Tools)

These are internal backend functions that run automatically at video upload time. They are NOT exposed to the LLM.

```typescript
// These run at upload time - NOT MCP tools
class VideoProcessingPipeline {
  // 1. Pose Extraction
  async extractPoseData(videoPath: string): Promise<PoseFrame[]>;
  
  // 2. Phase Detection
  async detectPhases(poseTimeline: PoseFrame[]): Promise<PhaseMap>;
  async detectSubPhases(poseTimeline: PoseFrame[], phases: PhaseMap): Promise<PhaseMap>;
  
  // 3. Metric Computation (per phase)
  async computeSetupCarveMetrics(poseTimeline: PoseFrame[], phase: PhaseData): Promise<SetupCarveMeasurements>;
  async computeWindUpMetrics(poseTimeline: PoseFrame[], phase: PhaseData): Promise<WindUpMeasurements>;
  async computeSnapMetrics(poseTimeline: PoseFrame[], phase: PhaseData): Promise<SnapMeasurements>;
  async computeTakeoffMetrics(poseTimeline: PoseFrame[], phase: PhaseData): Promise<TakeoffMeasurements>;
  async computeMomentumThroughLip(poseTimeline: PoseFrame[], phase: PhaseData): Promise<MomentumMeasurements>;
  async detectGrab(poseTimeline: PoseFrame[], airPhase: PhaseData): Promise<GrabMeasurements | null>;
  async computeAirMetrics(poseTimeline: PoseFrame[], phase: PhaseData): Promise<AirMeasurements>;
  async computeSpinControl(poseTimeline: PoseFrame[], phases: PhaseMap): Promise<SpinControlEvaluation>;
  async computeJumpMetrics(poseTimeline: PoseFrame[], phases: PhaseMap): Promise<JumpMetrics>;
  async computeLandingMetrics(poseTimeline: PoseFrame[], phase: PhaseData): Promise<LandingMeasurements>;
  async computeRideAwayMetrics(poseTimeline: PoseFrame[], phase: PhaseData): Promise<RideAwayMeasurements>;
  
  // 4. Evaluation Generation
  async generateEvaluations(measurements: MeasurementMap, intendedTrick?: TrickName): Promise<EvaluationMap>;
  
  // 5. Reference Comparison
  async compareToReference(poseTimeline: PoseFrame[], phases: PhaseMap, trickName: TrickName): Promise<FormComparison>;
  
  // 6. Summary Generation
  async generateSummary(measurements: MeasurementMap, evaluations: EvaluationMap, comparison: FormComparison | null): Promise<VideoSummary>;
}
```

**Total: 17 Backend Pre-Processing Functions** (internal, not exposed to LLM)

### Phase Detection Algorithm

Phase detection uses pose data to identify **6 primary phases**: setupCarve, windUp, snap, takeoff, air, landing.

The phases are discrete groups - we define what each phase IS, not what happens between phases.

#### Primary Phases

```typescript
type Phase = "setupCarve" | "windUp" | "snap" | "takeoff" | "air" | "landing";
type TrickType = "straight_air" | "frontside" | "backside";

// Phase sequence:
// SETUP_CARVE → WIND_UP → SNAP → TAKEOFF → AIR → LANDING
```

#### Detection Signals (Pose-Based)

All phase detection is **pure pose-based computation** - no LLM involved.

```typescript
interface PhaseDetectionSignals {
  // Edge detection
  edgeAngle: number[];              // Board edge angle (heel/toe pressure)
  edgeTransitions: EdgeTransition[]; // Detected heel↔toe transitions
  
  // Body position
  hipHeight: number[];              // Y position of hip center per frame
  hipVelocity: number[];            // Vertical velocity
  hipAcceleration: number[];        // Vertical acceleration
  ankleToHipRatio: number[];        // Ankle Y / Hip Y (>1 = airborne)
  
  // Rotation tracking
  chestRotation: number[];          // Chest angle relative to board direction
  chestRotationVelocity: number[];  // Rate of chest rotation change
  chestDirection: Vector3[];        // Chest facing direction (for arrow overlay)
  armPosition: ArmPosition[];       // Arm positions per frame (for windup detection)
  
  // Gaze/Spot tracking
  gazeDirection: Vector3[];         // Eye/head direction (for "spot" arrow overlay)
  headRotation: number[];           // Head rotation relative to body
  
  // Stability
  bodyStackedness: number[];        // How "stacked" the body is (aligned over board)
  formVariance: number[];           // Rate of change in body position
}

interface EdgeTransition {
  frame: number;
  fromEdge: "heelside" | "toeside";
  toEdge: "heelside" | "toeside";
  smoothness: number;               // 0-100, higher = smoother transition
}

interface ArmPosition {
  frame: number;
  leftArmAngle: number;             // Relative to body
  rightArmAngle: number;
  armsTowardTail: boolean;          // For backside windup detection
  armsTowardNose: boolean;          // For frontside windup detection
}
```

---

### Phase 1: SETUP_CARVE

The setup carve is the final approach into the jump. It starts at the last heelside-to-toeside edge transition before takeoff.

#### Detection Logic

```typescript
function detectSetupCarve(signals: PhaseDetectionSignals, trickType: TrickType): PhaseData {
  // Find the LAST heelside→toeside transition before takeoff
  const takeoffFrame = detectTakeoffFrame(signals);
  const lastEdgeTransition = signals.edgeTransitions
    .filter(t => t.frame < takeoffFrame && t.fromEdge === "heelside" && t.toEdge === "toeside")
    .pop();
  
  return {
    startFrame: lastEdgeTransition.frame,
    endFrame: /* when edge change sub-phase begins */,
    // ...
  };
}
```

#### Characteristics by Trick Type

| Trick Type | Setup Carve Characteristics |
|------------|----------------------------|
| **Straight Air** | Mellow, smooth, straight line. No aggressive movements. Minimal form/speed changes. Goal: stacked position at takeoff. |
| **Frontside** | Starts on toeside, transitions to heelside for the setup. Smooth transition. |
| **Backside** | Starts on heelside, transitions to toeside. The windup happens DURING this edge change. |

#### Sub-Phase: Edge Change

The edge change is a critical sub-phase within setupCarve that captures the final edge transition before takeoff.

```typescript
interface SetupCarvePhase extends PhaseData {
  subPhases: {
    edgeChange: {
      startFrame: number;
      endFrame: number;
      fromEdge: "heelside" | "toeside";
      toEdge: "heelside" | "toeside";
      poses: PoseFrame[];           // All poses during edge change for form review
      smoothness: number;           // 0-100
      bodyMovementQuality: Verdict<string>;
    };
  };
}
```

**Why this matters:** The edge change poses must be reviewable to ensure proper body movements during the transition. This is different for each trick type and will be compared against reference poses.

---

### Phase 2: WIND_UP

The windup is when the rider builds rotational tension before the snap. The timing and mechanics differ by trick type.

#### Detection Logic by Trick Type

**Frontside Windup:**
```typescript
// Frontside: Windup happens AFTER edge change, while on heelside setup edge
// Arms move from neutral → wound up position toward tail
function detectFrontsideWindup(signals: PhaseDetectionSignals): PhaseData {
  // Starts: When on heelside edge AND arms begin moving toward tail
  // Ends: When arms reach fully wound position (max rotation away from spin direction)
  const windupStart = findFrame(signals, frame => 
    signals.edgeAngle[frame] < HEELSIDE_THRESHOLD &&
    signals.armPosition[frame].armsTowardTail &&
    signals.chestRotation[frame] > signals.chestRotation[frame - 1]
  );
  
  const windupEnd = findMaxChestRotation(signals, windupStart);
  return { startFrame: windupStart, endFrame: windupEnd };
}
```

**Backside Windup:**
```typescript
// Backside: Windup happens SIMULTANEOUSLY with edge change (heelside→toeside)
// Arms move into windup position AS the edge change occurs
function detectBacksideWindup(signals: PhaseDetectionSignals): PhaseData {
  // Starts: When heelside→toeside edge change begins AND arms start moving to windup
  // Ends: When arms reach fully wound position
  const edgeChangeStart = signals.edgeTransitions
    .find(t => t.fromEdge === "heelside" && t.toEdge === "toeside");
  
  const windupEnd = findMaxChestRotation(signals, edgeChangeStart.frame);
  return { startFrame: edgeChangeStart.frame, endFrame: windupEnd };
}
```

**Straight Air:**
```typescript
// Straight air: No windup phase (or minimal neutral arm positioning)
function detectStraightAirWindup(): PhaseData | null {
  return null; // No windup for straight airs
}
```

#### Windup Measurements

```typescript
interface WindUpMeasurements {
  maxWindUpAngle: number;           // Peak chest rotation (degrees from neutral)
  maxWindUpFrame: number;           // Frame of max windup
  windUpDuration: number;           // Frames from start to max
  armPositionAtMax: ArmPosition;    // Arm positions at peak windup
  
  // For comparison to reference
  windUpPoses: PoseFrame[];         // All poses during windup for form review
}
```

---

### Phase 3: SNAP

The snap is the explosive release from the wound-up position through takeoff. This is where rotational momentum is generated.

#### Detection Logic

```typescript
function detectSnap(signals: PhaseDetectionSignals): PhaseData {
  // Starts: Frame after max windup (when chest rotation velocity goes positive)
  // Ends: Takeoff frame (when leaving the lip)
  const maxWindupFrame = findMaxChestRotation(signals);
  const takeoffFrame = detectTakeoffFrame(signals);
  
  return {
    startFrame: maxWindupFrame + 1,
    endFrame: takeoffFrame,
  };
}
```

#### Snap Measurements

```typescript
interface SnapMeasurements {
  snapSpeed: number;                // deg/s - rotation velocity during snap
  snapPower: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  
  // Chest openness at takeoff (critical for momentum transfer)
  chestOpennessAtTakeoff: {
    angle: number;                  // Degrees - how open the chest is
    direction: Vector3;             // Arrow pointing chest direction
    verdict: "too_closed" | "perfect_zone" | "too_open";
    degreesFromIdeal: number;
  };
  
  // Snap poses for review
  snapPoses: PoseFrame[];
}
```

#### Trick-Specific Snap Mechanics

| Trick Type | Snap Mechanics |
|------------|---------------|
| **Frontside** | Snap from wound position → throw off takeoff. Must hit "perfect zone" of chest openness for maximum momentum transfer. |
| **Backside** | Snap from wound position → throw with CONTINUED momentum generation through the air. Momentum doesn't stop at takeoff. |
| **Straight Air** | No snap (or minimal pop timing). |

---

### Phase 4: TAKEOFF

The takeoff is a single-frame phase representing the exact moment the board leaves the lip.

#### Detection Logic

```typescript
function detectTakeoff(signals: PhaseDetectionSignals): PhaseData {
  // Single frame: When ankleToHipRatio crosses 1.0 (feet leave snow)
  const takeoffFrame = signals.ankleToHipRatio.findIndex((ratio, i) => 
    i > 0 && ratio > 1.0 && signals.ankleToHipRatio[i - 1] <= 1.0
  );
  
  return {
    startFrame: takeoffFrame,
    endFrame: takeoffFrame,        // Single frame
  };
}
```

#### Takeoff Measurements

```typescript
interface TakeoffMeasurements {
  takeoffFrame: number;
  takeoffPose: PoseFrame;           // The exact pose at takeoff
  
  // Body position analysis
  bodyStackedness: number;          // How stacked/aligned over board
  kneeExtension: number;            // Pop power indicator
  edgeAngle: number;                // Edge engagement at takeoff
  
  // For spins: chest direction with visual arrow
  chestDirection: {
    angle: number;
    vector: Vector3;                // For rendering arrow overlay
  };
}
```

---

### Phase 5: AIR

The air phase is when the rider is airborne, from takeoff until landing.

#### Detection Logic

```typescript
function detectAir(signals: PhaseDetectionSignals): PhaseData {
  // Starts: Frame after takeoff (ankleToHipRatio > 1.0)
  // Ends: Frame before landing (ankleToHipRatio drops below 1.0 + acceleration spike)
  const takeoffFrame = detectTakeoffFrame(signals);
  const landingFrame = detectLandingFrame(signals);
  
  return {
    startFrame: takeoffFrame + 1,
    endFrame: landingFrame - 1,
  };
}
```

#### Air Sub-Phases (Optional)

```typescript
interface AirPhase extends PhaseData {
  subPhases?: {
    grab?: {
      startFrame: number;
      endFrame: number;
      grabType: GrabType;
      grabDuration: number;
    };
    peakHeight?: {
      frame: number;
      estimatedHeight: number;
    };
  };
}
```

---

### Phase 6: LANDING

The landing phase starts when the board touches down and ends when the rider achieves stable ride-away.

#### Detection Logic

```typescript
function detectLanding(signals: PhaseDetectionSignals): PhaseData {
  // Starts: When ankleToHipRatio < 1.0 AND hipAcceleration spikes (impact)
  // Ends: When hipVelocity stabilizes (riding away straight)
  const impactFrame = signals.ankleToHipRatio.findIndex((ratio, i) => 
    ratio < 1.0 && signals.hipAcceleration[i] > IMPACT_THRESHOLD
  );
  
  const stableFrame = findStabilization(signals, impactFrame);
  
  return {
    startFrame: impactFrame,
    endFrame: stableFrame,
  };
}
```

#### Landing Success Criteria

```typescript
interface LandingMeasurements {
  landingFrame: number;
  landingPose: PoseFrame;
  
  // Success determination
  boardLandedProperly: boolean;     // Board flat, not catching edge
  riderStable: boolean;             // Not falling
  rideAwayClean: boolean;           // Able to ride away straight
  
  // Verdict
  landingVerdict: "stomped" | "clean" | "sketchy" | "fall";
  
  // Absorption quality
  kneeAbsorption: number;           // How much knee bend on impact
  absorptionQuality: Verdict<string>;
}
```

---

### Phase Map Output

```typescript
interface PhaseMap {
  trickType: TrickType;
  phases: {
    setupCarve: SetupCarvePhase;
    windUp: PhaseData | null;       // null for straight airs
    snap: PhaseData | null;         // null for straight airs
    takeoff: PhaseData;             // Single frame
    air: AirPhase;
    landing: PhaseData;
  };
  totalFrames: number;
  coverage: number;                 // Percentage of frames assigned to phases
}
```

---

### Backend Analysis Functions (Not Phases)

These functions analyze data across phases but are NOT phases themselves:

```typescript
// Analyzes momentum from windup through air to detect momentum loss
async computeMomentumThroughLip(
  poseTimeline: PoseFrame[], 
  windUpPhase: PhaseData,
  airPhase: PhaseData
): Promise<MomentumAnalysis>;

// Analyzes spin control across the entire trick
async computeSpinControl(
  poseTimeline: PoseFrame[], 
  phases: PhaseMap
): Promise<SpinControlEvaluation>;
```

### 3. MCP Tools (Exposed to LLM)

These are the ONLY tools exposed to the LLM via MCP. They retrieve pre-computed data - no computation.

```typescript
// MCP Tools - Data Retrieval Only
// Total: 18 MCP Tools

// === Video Overview (3 tools) ===
get_video_summary(videoId: string): VideoSummary;
get_video_metadata(videoId: string): VideoMetadata;
list_available_videos(): VideoListItem[];

// === Phase Analysis (4 tools) ===
get_phase_info(videoId: string, phaseName?: string): PhaseInfo | PhaseInfo[];
get_takeoff_analysis(videoId: string): TakeoffAnalysis;
get_air_analysis(videoId: string): AirAnalysis;
get_landing_analysis(videoId: string): LandingAnalysis;

// === Form Comparison (2 tools) ===
get_form_comparison(videoId: string, phaseName?: string): FormComparison;
compare_videos(videoId1: string, videoId2: string, phaseName?: string): VideoComparison;

// === Reference Data (4 tools) ===
get_reference_pose(trickName: string, phaseName?: string): ReferencePose | ReferencePose[];
get_trick_rules(trickName: string, phaseName?: string): TrickRules;
get_common_problems(trickName: string, phaseName?: string): CommonProblems;
list_available_tricks(): TrickListItem[];

// === Critical Analysis (2 tools) ===
get_spin_control_analysis(videoId: string): SpinControlAnalysis;  // MOST IMPORTANT
get_jump_metrics(videoId: string): JumpMetrics;

// === Pose Retrieval (4 tools) ===
get_pose_at_frame(videoId: string, frame: number): PoseFrame;
get_poses_in_range(videoId: string, startFrame: number, endFrame: number): PoseFrame[];
get_phase_poses(videoId: string, phaseName: string): PhasePoses;
get_key_moment_poses(videoId: string): KeyMomentPoses;

// === Reference Library Management (3 tools) ===
list_reference_poses(filters?: ReferenceFilters): ReferencePose[];
add_reference_pose(data: AddReferenceInput): ReferencePose;
set_video_analysis_status(videoId: string, status: AnalysisStatus): void;
// === Coaching Knowledge (1 tool) ===
get_coaching_tips(trickName: string, problem?: string, phase?: string): CoachingTip[];
```

**Total: 23 MCP Tools** (exposed to LLM for data retrieval)

**Note**: Visual verification is handled by the LLM using existing pose retrieval tools + Playwright for DOM inspection. No dedicated visualization MCP tools needed.

## Data Models

### VideoAnalysis (Primary Storage)

```typescript
interface VideoAnalysis {
  videoId: string;
  uploadedAt: Date;
  duration: number;
  frameCount: number;
  fps: number;
  
  // Trick identification
  intendedTrick: TrickName | null;
  inferredTrick: {
    name: TrickName;
    confidence: number;
    alternatives: TrickName[];
  } | null;
  stance: "regular" | "goofy";
  analysisStatus: AnalysisStatus;
  
  // Full pose timeline (every frame)
  poseTimeline: PoseFrame[];
  
  // Phase boundaries
  phases: PhaseMap;
  
  // Measurements (raw values)
  measurements: MeasurementMap;
  
  // Evaluations (verdicts with coach tips)
  evaluations: EvaluationMap;
  
  // Comparison to reference
  comparison: FormComparison | null;
  
  // Summary
  summary: VideoSummary;
}

interface PoseFrame {
  frameNumber: number;
  timestamp: number;
  joints3D: Joint3D[];
  jointAngles: JointAngles;
  confidence: number;
}
```

### Verdict Schema (Standardized)

```typescript
interface Verdict<T> {
  value: T;                           // Raw measurement
  verdict: string;                    // Categorical assessment
  confidence: number;                 // 0-100
  reasoning: string;                  // How verdict was determined
  severity: "none" | "minor" | "moderate" | "critical";
  coachTip: string | null;           // From Pinecone knowledge base
  coachTipSource: string | null;     // YouTube videoId for the tip
  coachTipTimestamp: number | null;  // Timestamp in source video
  fixInstructions: string | null;    // How to correct
  detectionMethod: string;           // Which algorithm was used
}
```

### SpinMetrics (Critical for Coaching)

```typescript
interface SpinMetrics {
  // Snap Power
  snapPower: {
    powerLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
    powerDescription: "very_weak" | "weak" | "moderate" | "strong" | "very_strong" | "explosive";
    snapSpeed: number;                // deg/s
  };
  
  // Wind-up tracking (frame reference - use get_pose_at_frame to retrieve)
  windUp: {
    maxAngle: number;
    frame: number;                    // Use get_pose_at_frame(videoId, frame) to get pose
    timestamp: number;
  };
  
  // Takeoff moment (frame reference)
  takeoff: {
    chestAngle: number;
    frame: number;                    // Use get_pose_at_frame(videoId, frame) to get pose
    timestamp: number;
  };
  
  snapDuration: number;               // frames from wind-up to takeoff
  
  // Momentum through lip
  momentumThroughLip: {
    snapMomentum: number;
    momentumAtLipExit: number;
    momentumLoss: number;
    momentumLossPercent: number;
    lossDetected: boolean;
    lossFrame: number | null;         // Use get_pose_at_frame if not null
    lossTimestamp: number | null;
    lossCause: "arm_flail" | "body_open_too_early" | "edge_catch" | "unknown" | null;
  };
  
  // Upper/lower body separation
  separation: {
    upperBodyRotation: number;
    lowerBodyRotation: number;
    maxSeparationDegrees: number;
    maxSeparationFrame: number;       // Use get_pose_at_frame to get pose at max separation
    timeline: { frame: number; timestamp: number; separation: number }[];
  };
  
  // Spin control verdict
  spinControlVerdict: {
    verdict: "sweetspot" | "too_fast_needs_counter" | "too_slow_needs_speed" | "uncontrolled";
    reasoning: string;
    coachTip: string;
  };
  
  // Actionable calculations
  degreesShortOfTarget: number;
  degreesOverTarget: number;
  recommendedSnapSpeedAdjustment: number;
  recommendedAirAdjustment: string;
}
```

### Pose Retrieval Response Types

```typescript
// Response from get_pose_at_frame(videoId, frame)
interface PoseFrame {
  frameNumber: number;
  timestamp: number;
  joints3D: Joint3D[];                // 24 SMPL joints with x,y,z coordinates
  jointAngles: JointAngles;           // Computed angles (knee, hip, shoulder, etc.)
  confidence: number;
}

// Response from get_poses_in_range(videoId, startFrame, endFrame)
// Returns array of PoseFrame[]

// Response from get_phase_poses(videoId, phaseName)
interface PhasePoses {
  phaseName: string;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  poses: PoseFrame[];                 // All poses in this phase
  keyMoments: {
    name: string;                     // e.g., "max_wind_up", "takeoff", "peak_height"
    frame: number;
    description: string;
  }[];
}

// Response from get_key_moment_poses(videoId)
interface KeyMomentPoses {
  videoId: string;
  moments: {
    name: string;                     // e.g., "wind_up_max", "takeoff", "peak_height", "landing"
    frame: number;
    timestamp: number;
    phase: string;
    pose: PoseFrame;                  // Pose embedded here for convenience
    description: string;
  }[];
}
```

### Phase Data (Frame References)

```typescript
interface PhaseData {
  name: string;
  startFrame: number;                 // Use get_pose_at_frame or get_phase_poses
  endFrame: number;
  startTimestamp: number;
  endTimestamp: number;
  frameCount: number;
  keyMomentFrame: number | null;      // Most important frame in this phase
  keyMomentDescription: string | null;
}
```

### Measurement Types (Frame References)

```typescript
interface TakeoffMeasurements {
  takeoffFrame: number;               // Use get_pose_at_frame(videoId, takeoffFrame)
  takeoffTimestamp: number;
  edgeAngle: number;
  popTiming: Verdict<number>;
  bodyPosition: Verdict<string>;
}

interface LandingMeasurements {
  landingFrame: number;               // Use get_pose_at_frame(videoId, landingFrame)
  landingTimestamp: number;
  kneeAngle: number;
  absorptionQuality: Verdict<string>;
  stanceWidth: number;
}

interface AirMeasurements {
  peakHeightFrame: number;            // Use get_pose_at_frame(videoId, peakHeightFrame)
  peakHeightTimestamp: number;
  grabDetected: boolean;
  grabStartFrame: number | null;      // Use get_poses_in_range for grab sequence
  grabEndFrame: number | null;
  bodyAxisTilt: number;
  armPositionVerdict: Verdict<string>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Pose extraction completeness
*For any* uploaded video with N frames, the pose extraction SHALL produce exactly N pose frames with valid 3D joint data.
**Validates: Requirements 1.1, 1.2**

### Property 2: Phase detection coverage
*For any* valid trick video, the detected phases SHALL cover 100% of frames from first approach frame to last ride-away frame with no gaps.
**Validates: Requirements 2.1, 2.2**

### Property 3: Verdict schema consistency
*For any* computed verdict, the output SHALL contain all required fields: value, verdict, confidence, reasoning, severity, coachTip, fixInstructions, detectionMethod.
**Validates: Requirements 6.2.1, 35.1**

### Property 4: MCP tool data retrieval
*For any* valid videoId, calling get_video_summary(videoId) SHALL return the pre-computed summary within 100ms (no computation).
**Validates: Requirements 7.1**

### Property 5: Reference pose schema validation
*For any* stored reference pose, the data SHALL match the ReferencePose schema with all required fields populated.
**Validates: Requirements 36.1**

### Property 6: Spin metrics calculation
*For any* video with detected rotation, the spin metrics SHALL include snapSpeed (deg/s), separationDegrees, and spinControlVerdict.
**Validates: Requirements 3.1, Spin Control Analysis**

### Property 7: Intended trick comparison
*For any* video with specified intendedTrick, the comparison SHALL evaluate against that trick's reference poses, not the inferred trick.
**Validates: Requirements 6.4.1, 6.4.2**

### Property 8: Error handling for invalid videoId
*For any* MCP tool call with non-existent videoId, the tool SHALL return an error with list of available videoIds.
**Validates: Requirements 7.4**

### Property 9: Coaching tip attachment
*For any* verdict with severity "moderate" or "critical", the system SHALL query Pinecone and attach a relevant coachTip if one exists with relevanceScore > 0.7.
**Validates: Knowledge Base Integration**

### Property 10: Pose retrieval consistency
*For any* call to get_pose_at_frame(videoId, frame), the returned pose SHALL match the pose at that frame index in the stored poseTimeline array.
**Validates: Pose Retrieval tools**

### Property 11: Phase poses completeness
*For any* call to get_phase_poses(videoId, phaseName), the returned poses array SHALL contain exactly (endFrame - startFrame + 1) poses covering every frame in the phase.
**Validates: get_phase_poses tool**

## Error Handling

### Processing Errors

```typescript
interface ProcessingError {
  videoId: string;
  stage: "pose_extraction" | "phase_detection" | "metric_computation" | "evaluation" | "storage";
  error: string;
  partialData: Partial<VideoAnalysis> | null;
  recoverable: boolean;
}
```

### MCP Tool Errors

```typescript
interface MCPToolError {
  code: "VIDEO_NOT_FOUND" | "INVALID_PARAMETERS" | "DATABASE_ERROR";
  message: string;
  availableVideoIds?: string[];        // For VIDEO_NOT_FOUND
  validParameters?: Record<string, any>; // For INVALID_PARAMETERS
}
```

## Testing Strategy

### Unit Tests
- Test each backend function in isolation
- Test MCP tool data retrieval
- Test schema validation

### Property-Based Tests
- Use fast-check or similar library
- Generate random pose sequences and verify phase detection
- Generate random metrics and verify verdict generation
- Verify schema compliance for all outputs

### Integration Tests
- End-to-end video upload and processing
- MCP tool queries against processed videos
- Reference pose library CRUD operations

## Implementation Notes

### Database Choice
- MongoDB recommended for flexible schema and nested documents
- Index on videoId for fast retrieval
- Index on trickName + phase for reference pose queries

### Pose Service Integration
- Existing WSL pose service extracts 3D joints
- Returns SMPL joint positions and angles
- ~30fps processing speed on GPU

### Knowledge Base Integration (Pinecone)

The existing Pinecone index contains rich tutorial content with step-by-step instructions, technique details, and common mistakes for each trick. This data is leveraged in two ways:

#### 1. Pre-Processing Integration (Automatic)
During `generateEvaluations()`, when a verdict is generated, the system queries Pinecone to attach relevant coaching tips:

```typescript
// In generateEvaluations()
async function attachCoachingTips(
  verdict: Verdict,
  trickName: string,
  phase: string
): Promise<Verdict> {
  // Build query from verdict context
  const queryText = `${trickName} ${phase} ${verdict.verdict}`;
  const embedding = await generateEmbedding(queryText);
  
  // Search Pinecone with trickName filter
  const tips = await searchByTrickName(embedding, trickName, 5);
  
  // Find most relevant tip for this specific problem
  const relevantTip = tips.find(t => 
    t.text.toLowerCase().includes(verdict.verdict.toLowerCase())
  );
  
  return {
    ...verdict,
    coachTip: relevantTip?.text || null,
    coachTipSource: relevantTip?.videoId || null,
    coachTipTimestamp: relevantTip?.timestamp || null,
  };
}
```

#### 2. MCP Tool for On-Demand Tips
Add a new MCP tool for the LLM to fetch additional coaching context:

```typescript
// New MCP Tool (adds to 19 total)
get_coaching_tips(
  trickName: string,
  problem?: string,      // e.g., "under-rotating", "snap too slow"
  phase?: string         // e.g., "takeoff", "air", "landing"
): CoachingTip[];

interface CoachingTip {
  text: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  relevanceScore: number;
}
```

#### Query Patterns
| Problem Detected | Pinecone Query | Expected Result |
|-----------------|----------------|-----------------|
| Snap momentum loss | "backside 360 snap momentum carrying through" | "maintain rotational momentum until tail snaps off" |
| Under-rotating | "backside 360 under rotating counter rotation" | "use counter rotation to speed up spin" |
| Arms too low | "backside 360 arm positioning wind up" | "keep arms at chest level during wind-up" |
| Breaking at waist | "backside 360 axis rotation waist" | "maintain single axis rotation, don't bend forward" |

#### Pinecone Metadata Structure (Existing)
```json
{
  "trickId": "backside-360",
  "trickName": "backside-360",
  "videoId": "ZMtfJEtEq1w",
  "videoTitle": "Backside 360s Fully Explained!",
  "text": "detailed coaching content...",
  "timestamp": 120,
  "totalDuration": 1627,
  "isPrimary": true,
  "stepNumber": 3,
  "stepTitle": "Wind-up and Snap"
}
```

This integration ensures every verdict comes with actionable, expert-sourced coaching advice without requiring additional LLM inference.


### Reference Video Upload Pipeline

Short reference clips (3-4 seconds) showing ideal form for each phase/trick combination. The user selects specific frames to run pose extraction on (not all frames), then tags them.

#### Mobile App: Reference Video Screen

A dedicated screen in the mobile app for building the reference pose library.

```typescript
// Screen flow:
// 1. Upload video → extract frames (no poses yet)
// 2. Browse frames with Before/Next buttons
// 3. Select specific frames (single or range)
// 4. Run pose extraction on selected frames only
// 5. Tag frames with phase/keyMoment labels
// 6. Save as ReferencePose documents
```

#### Upload Flow (Frames Only First)

```typescript
// POST /api/upload-reference-video
interface UploadReferenceVideoRequest {
  video: File;                        // 3-4 second clip
  trickName: TrickName;
  trickType: TrickType;               // straight_air, frontside, backside
  stance: "regular" | "goofy";
  source: "tutorial" | "pro_rider" | "user_submitted";
  notes?: string;
}

interface UploadReferenceVideoResponse {
  referenceVideoId: string;
  frameCount: number;
  frames: FramePreview[];             // Thumbnails for browsing
  status: "frames_extracted";         // Poses NOT extracted yet
}

interface FramePreview {
  frameNumber: number;
  timestamp: number;
  thumbnailUrl: string;
}
```

#### Frame Selection & Pose Extraction

```typescript
// POST /api/extract-poses-for-frames
interface ExtractPosesRequest {
  referenceVideoId: string;
  frames: number[];                   // Specific frame numbers to extract
  // OR
  startFrame?: number;                // Range selection
  endFrame?: number;
}

interface ExtractPosesResponse {
  referenceVideoId: string;
  extractedFrames: {
    frameNumber: number;
    pose: PoseFrame;
    meshUrl: string;                  // For visualization
  }[];
}
```

#### Frame Tagging Interface

```typescript
interface FrameTag {
  frame: number;
  phase: Phase;
  subPhase?: string;                  // e.g., "edgeChange" within setupCarve
  keyMoment?: string;                 // e.g., "max_wind_up", "snap_release"
  isIdealForm: boolean;
  notes?: string;
}

// POST /api/tag-reference-frame
interface TagReferenceFrameRequest {
  referenceVideoId: string;
  tags: FrameTag[];
}
```

#### Reference Library Browser

The mobile app shows all reference videos grouped by trick, with:
- Frame thumbnails with phase labels
- Click to view frame + mesh overlay + pose data
- Trick info and coaching notes

#### Reference Pose Storage

```typescript
interface ReferencePose {
  referenceId: string;
  trickName: TrickName;
  trickType: TrickType;
  phase: Phase;
  subPhase?: string;
  keyMoment?: string;
  
  // Pose data
  pose: PoseFrame;                    // Full 3D joint data
  frameNumber: number;
  
  // Source info
  sourceVideoId: string;
  stance: "regular" | "goofy";
  source: "tutorial" | "pro_rider" | "user_submitted";
  
  // Metadata
  isIdealForm: boolean;
  notes?: string;
  createdAt: Date;
}
```

---

### Coaching Text Integration for Phase Detection

Simple semantic search against Pinecone for now. Will optimize data structure later.

#### Simple Semantic Search (Rough Draft)

```typescript
// Query Pinecone with detected problem text
async function searchCoachingTips(
  problemText: string,
  trickName?: TrickName
): Promise<CoachingTip[]> {
  const embedding = await generateEmbedding(problemText);
  
  // Simple semantic search, filter by trick if provided
  const results = await pinecone.query({
    vector: embedding,
    topK: 5,
    filter: trickName ? { trickName } : undefined
  });
  
  return results.matches.map(m => ({
    text: m.metadata.text,
    videoId: m.metadata.videoId,
    timestamp: m.metadata.timestamp,
    relevanceScore: m.score
  }));
}
```

#### Body Awareness Functions Library

Functions that map to common Pinecone coaching phrases. Each returns a boolean + confidence + raw angle value.

```typescript
interface BodyAwarenessLibrary {
  // Arm position checks
  isArmsTowardTail(pose: PoseFrame): BodyCheck;
  isArmsTowardNose(pose: PoseFrame): BodyCheck;
  isArmsAtChestLevel(pose: PoseFrame): BodyCheck;
  isArmsWoundUp(pose: PoseFrame): BodyCheck;
  
  // Chest position checks
  isChestWoundUp(pose: PoseFrame): BodyCheck;
  isChestOpen(pose: PoseFrame): BodyCheck;
  isChestSquared(pose: PoseFrame): BodyCheck;
  getChestOpenness(pose: PoseFrame): number;  // degrees
  
  // Hip/body position checks
  isBodyStacked(pose: PoseFrame): BodyCheck;
  isHipsOpening(pose: PoseFrame): BodyCheck;
  isHipsStacked(pose: PoseFrame): BodyCheck;
  
  // Knee checks
  isKneesBent(pose: PoseFrame): BodyCheck;
  isKneesExtending(pose: PoseFrame): BodyCheck;
  getKneeAngle(pose: PoseFrame): number;  // degrees
  
  // Head/gaze checks
  isLookingOverShoulder(pose: PoseFrame): BodyCheck;
  isSpottingLanding(pose: PoseFrame): BodyCheck;
}

interface BodyCheck {
  result: boolean;
  confidence: number;           // 0-100
  rawValue: number;             // The actual angle/measurement
  pineconePhraseMatch: string;  // e.g., "arms toward tail"
}
```

#### MCP Tools for Body Awareness

```typescript
// New MCP tools for body position checking
get_body_position_check(videoId: string, frame: number, checkType: BodyCheckType): BodyCheck;
get_all_body_checks(videoId: string, frame: number): AllBodyChecks;

type BodyCheckType = 
  | "arms_toward_tail" | "arms_toward_nose" | "arms_chest_level" | "arms_wound_up"
  | "chest_wound_up" | "chest_open" | "chest_squared"
  | "body_stacked" | "hips_opening" | "hips_stacked"
  | "knees_bent" | "knees_extending"
  | "looking_over_shoulder" | "spotting_landing";

interface AllBodyChecks {
  frame: number;
  checks: Record<BodyCheckType, BodyCheck>;
}
```

#### Example Usage

```typescript
// LLM can call:
const check = await get_body_position_check(videoId, windUpFrame, "chest_wound_up");
// Returns: { result: true, confidence: 85, rawValue: 45, pineconePhraseMatch: "chest wound up" }

// Then search for coaching tips if there's a problem:
if (!check.result) {
  const tips = await searchCoachingTips("chest not wound up backside 360");
  // Returns relevant coaching content from Pinecone
}
```

This approach:
1. Provides concrete body awareness functions the LLM can call
2. Maps results to Pinecone phrases for coaching tip lookup
3. Keeps semantic search simple for now (will optimize later)


---

### Visual Verification Approach

Visual verification is handled by the LLM using existing MCP tools combined with Playwright for DOM inspection when needed. The existing pose retrieval tools return raw angles and measurements that the LLM can interpret directly.

**Key tools for verification:**
- `get_pose_at_frame(videoId, frame)` - Returns raw joint angles and positions
- `get_phase_poses(videoId, phaseName)` - Returns all poses in a phase
- `get_key_moment_poses(videoId)` - Returns poses at critical moments

The LLM can use these raw measurements to verify phase detection accuracy without dedicated visualization tools.
