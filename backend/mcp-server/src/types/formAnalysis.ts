/**
 * Form Analysis System Types
 * Comprehensive type definitions for the two-phase architecture:
 * 1. Backend Pre-Processing Pipeline (17 functions)
 * 2. MCP Tools Layer (23 tools for LLM data retrieval)
 */

// ============================================================================
// CORE ENUMS
// ============================================================================

export type Phase = 'setupCarve' | 'windUp' | 'snap' | 'takeoff' | 'air' | 'landing';
export type TrickType = 'straight_air' | 'frontside' | 'backside';
export type Stance = 'regular' | 'goofy';
export type Edge = 'heelside' | 'toeside';
export type Severity = 'none' | 'minor' | 'moderate' | 'critical';
export type AnalysisStatus = 'untagged' | 'in_progress' | 'fully_analyzed';
export type LandingVerdict = 'stomped' | 'clean' | 'sketchy' | 'fall';
export type PopTypeVerdict = 'proper_tail' | 'two_footed' | 'early_pop';
export type PopTimingVerdict = 'early' | 'ideal' | 'late';
export type RotationAxisVerdict = 'clean_flat' | 'intentional_cork' | 'unstable' | 'inverted';
export type ShoulderDropCause = 'intentional_lean' | 'loss_of_control' | 'none';
export type DriftVerdict = 'straight' | 'minor_drift' | 'significant_drift';
export type SpinControlVerdict = 'controlled' | 'rushed' | 'over_rotated' | 'under_rotated';
export type FlatSpinVerdict = 'clean_flat' | 'slight_cork' | 'significant_cork' | 'inverted_throw';
export type ChestOpennessVerdict = 'too_closed' | 'perfect_zone' | 'too_open';

// ============================================================================
// VECTOR & GEOMETRY TYPES
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Joint3D {
  name: string;
  position: Vector3;
  confidence: number;
}

export interface JointAngles {
  leftKnee: number;
  rightKnee: number;
  leftHip: number;
  rightHip: number;
  leftShoulder: number;
  rightShoulder: number;
  spine: number;
  [key: string]: number;
}

// ============================================================================
// POSE DATA TYPES
// ============================================================================

export interface PoseFrame {
  frameNumber: number;
  timestamp: number;
  joints3D: Joint3D[];
  jointAngles: JointAngles;
  confidence: number;
}

export interface PoseTimeline {
  videoId: string;
  frames: PoseFrame[];
  totalFrames: number;
  fps: number;
}

// ============================================================================
// PHASE DETECTION TYPES
// ============================================================================

export interface EdgeTransition {
  frame: number;
  fromEdge: Edge;
  toEdge: Edge;
  smoothness: number; // 0-100
}

export interface ArmPosition {
  frame: number;
  leftArmAngle: number;
  rightArmAngle: number;
  armsTowardTail: boolean;
  armsTowardNose: boolean;
}

export interface PhaseDetectionSignals {
  edgeAngle: number[];
  edgeTransitions: EdgeTransition[];
  hipHeight: number[];
  hipVelocity: number[];
  hipAcceleration: number[];
  ankleToHipRatio: number[];
  chestRotation: number[];
  chestRotationVelocity: number[];
  chestDirection: Vector3[];
  armPosition: ArmPosition[];
  gazeDirection: Vector3[];
  headRotation: number[];
  bodyStackedness: number[];
  formVariance: number[];
}

export interface PhaseData {
  name: Phase;
  startFrame: number;
  endFrame: number;
  startTimestamp: number;
  endTimestamp: number;
  frameCount: number;
  keyMomentFrame?: number;
  keyMomentDescription?: string;
}

export interface SetupCarvePhase extends PhaseData {
  subPhases: {
    edgeChange: {
      startFrame: number;
      endFrame: number;
      fromEdge: Edge;
      toEdge: Edge;
      poses: PoseFrame[];
      smoothness: number;
      bodyMovementQuality: Verdict<string>;
    };
  };
}

export interface PhaseMap {
  trickType: TrickType;
  phases: {
    setupCarve: SetupCarvePhase;
    windUp: PhaseData | null;
    snap: PhaseData | null;
    takeoff: PhaseData;
    air: PhaseData;
    landing: PhaseData;
  };
  totalFrames: number;
  coverage: number; // Percentage of frames assigned to phases
}

// ============================================================================
// VERDICT TYPES (Standardized Response Shape)
// ============================================================================

export interface Verdict<T> {
  value: T;
  verdict: string;
  confidence: number; // 0-100
  reasoning: string;
  severity: Severity;
  coachTip: string | null;
  coachTipSource?: string; // YouTube videoId
  coachTipTimestamp?: number;
  fixInstructions: string | null;
  detectionMethod: string;
}

// ============================================================================
// MEASUREMENT TYPES (Per Phase)
// ============================================================================

export interface SetupCarveMeasurements {
  arcRadius: number;
  edgeEngagement: number;
  transitionTiming: number;
  bodyMovementQuality: Verdict<string>;
}

export interface WindUpMeasurements {
  maxWindUpAngle: number;
  maxWindUpFrame: number;
  windUpDuration: number;
  armPositionAtMax: ArmPosition;
  windUpPoses: PoseFrame[];
}

export interface SnapMeasurements {
  snapSpeed: number; // deg/s
  snapPower: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  chestOpennessAtTakeoff: {
    angle: number;
    direction: Vector3;
    verdict: ChestOpennessVerdict;
    degreesFromIdeal: number;
  };
  snapPoses: PoseFrame[];
}

export interface TakeoffMeasurements {
  takeoffFrame: number;
  takeoffPose: PoseFrame;
  bodyStackedness: number;
  kneeExtension: number;
  edgeAngle: number;
  chestDirection: {
    angle: number;
    vector: Vector3;
  };
  popTiming: Verdict<number>;
  bodyPosition: Verdict<string>;
}

export interface AirMeasurements {
  peakHeightFrame: number;
  peakHeightTimestamp: number;
  grabDetected: boolean;
  grabStartFrame?: number;
  grabEndFrame?: number;
  grabType?: string;
  bodyAxisTilt: number;
  armPositionVerdict: Verdict<string>;
  rotationCount: number;
  rotationDirection: 'frontside' | 'backside';
}

export interface LandingMeasurements {
  landingFrame: number;
  landingPose: PoseFrame;
  boardLandedProperly: boolean;
  riderStable: boolean;
  rideAwayClean: boolean;
  landingVerdict: LandingVerdict;
  kneeAbsorption: number;
  absorptionQuality: Verdict<string>;
  boardAngle: number;
  spinControl: Verdict<string>;
}

export interface MomentumMeasurements {
  snapMomentum: number;
  momentumAtLipExit: number;
  momentumLoss: number;
  momentumLossPercent: number;
  lossDetected: boolean;
  lossFrame?: number;
  lossTimestamp?: number;
  lossCause?: 'arm_flail' | 'body_open_too_early' | 'edge_catch' | 'unknown';
}

export interface SpinControlMeasurements {
  upperBodyRotation: number;
  lowerBodyRotation: number;
  maxSeparationDegrees: number;
  maxSeparationFrame: number;
  timeline: Array<{ frame: number; timestamp: number; separation: number }>;
  spinControlVerdict: {
    verdict: SpinControlVerdict;
    reasoning: string;
    coachTip: string;
  };
  degreesShortOfTarget: number;
  degreesOverTarget: number;
  recommendedSnapSpeedAdjustment: number;
  recommendedAirAdjustment: string;
}

export interface JumpMetrics {
  airTime: number; // seconds
  jumpSize: number; // estimated height in meters
  knuckleRisk: 'low' | 'medium' | 'high';
  landingZone: 'sweet_spot' | 'early' | 'late' | 'off_course';
}

export interface GrabMeasurements {
  grabType: string;
  grabStartFrame: number;
  grabEndFrame: number;
  grabDuration: number;
  grabIntensity: number; // 0-100
}

export interface RideAwayMeasurements {
  rideAwayClean: boolean;
  rideAwaySpeed: number;
  rideAwayDirection: number; // degrees from straight
}

export type MeasurementMap = {
  setupCarve?: SetupCarveMeasurements;
  windUp?: WindUpMeasurements;
  snap?: SnapMeasurements;
  takeoff?: TakeoffMeasurements;
  air?: AirMeasurements;
  landing?: LandingMeasurements;
  momentum?: MomentumMeasurements;
  spinControl?: SpinControlMeasurements;
  jumpMetrics?: JumpMetrics;
  grab?: GrabMeasurements;
  rideAway?: RideAwayMeasurements;
};

// ============================================================================
// EVALUATION TYPES (Verdicts with Coach Tips)
// ============================================================================

export interface PopTypeEvaluation extends Verdict<PopTypeVerdict> {}
export interface PopTimingEvaluation extends Verdict<PopTimingVerdict> {}
export interface RotationAxisEvaluation extends Verdict<RotationAxisVerdict> {}
export interface ShoulderDropEvaluation extends Verdict<ShoulderDropCause> {}
export interface LandingEvaluation extends Verdict<LandingVerdict> {}
export interface DriftEvaluation extends Verdict<DriftVerdict> {}
export interface SpinControlEvaluation extends Verdict<SpinControlVerdict> {}
export interface FlatSpinEvaluation extends Verdict<FlatSpinVerdict> {
  chestDirectionAtTakeoff: number;
  armThrowDirection: 'up' | 'down' | 'flat';
  armThrowIntensity: number;
  verticalDeviationDegrees: number;
}

export type EvaluationMap = {
  popType?: PopTypeEvaluation;
  popTiming?: PopTimingEvaluation;
  rotationAxis?: RotationAxisEvaluation;
  shoulderDrop?: ShoulderDropEvaluation;
  landing?: LandingEvaluation;
  drift?: DriftEvaluation;
  spinControl?: SpinControlEvaluation;
  flatSpin?: FlatSpinEvaluation;
  [key: string]: Verdict<any> | undefined;
};

// ============================================================================
// FORM COMPARISON TYPES
// ============================================================================

export interface FormComparison {
  videoId: string;
  trickName: string;
  phase: Phase;
  similarityScore: number; // 0-100
  majorDeviations: Array<{
    keypoint: string;
    deviationAmount: number;
    direction: string;
    severity: Severity;
  }>;
  prioritizedFeedback: Array<{
    priority: number;
    issue: string;
    correction: string;
    importance: 'critical' | 'important' | 'helpful';
  }>;
  acceptableRanges: {
    [metric: string]: { min: number; max: number };
  };
}

export interface VideoComparison {
  videoId1: string;
  videoId2: string;
  phase?: Phase;
  perMetricComparison: Array<{
    metric: string;
    value1: number;
    value2: number;
    difference: number;
    percentDifference: number;
  }>;
  overallSimilarity: number;
  keyDifferences: string[];
}

// ============================================================================
// REFERENCE POSE TYPES
// ============================================================================

export interface ReferencePose {
  _id?: string;
  trickName: string;
  phase: Phase;
  stance: Stance;
  qualityRating: 1 | 2 | 3 | 4 | 5;
  sourceVideoId: string;
  sourceFrameNumber: number;
  poseData: PoseFrame;
  jointAngles: JointAngles;
  acceptableRanges: {
    [metric: string]: { min: number; max: number };
  };
  keyPoints: string[];
  commonMistakes: string[];
  notes: string;
  styleVariation?: 'compact' | 'extended' | 'aggressive' | 'smooth' | 'counter_rotated' | 'squared';
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrickRules {
  trickName: string;
  phase: Phase;
  rules: Array<{
    ruleName: string;
    expectedValue: string;
    importance: 'critical' | 'important' | 'helpful';
    description: string;
  }>;
}

export interface CommonProblems {
  trickName: string;
  phase: Phase;
  problems: Array<{
    problemName: string;
    indicators: string[];
    correction: string;
    frequency: number; // 0-100, how common this problem is
    severity: Severity;
  }>;
}

// ============================================================================
// VIDEO ANALYSIS STORAGE TYPES
// ============================================================================

export interface VideoAnalysis {
  _id?: string;
  videoId: string;
  uploadedAt: Date;
  duration: number;
  frameCount: number;
  fps: number;

  // Trick identification
  intendedTrick: string | null;
  inferredTrick?: {
    name: string;
    confidence: number;
    alternatives: string[];
  };
  stance: Stance;
  analysisStatus: AnalysisStatus;

  // Full pose timeline
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

  // Error tracking
  processingErrors?: Array<{
    stage: string;
    error: string;
    timestamp: Date;
  }>;
}

export interface VideoSummary {
  trickIdentified: string;
  confidence: number;
  phasesDetected: Phase[];
  keyIssues: string[];
  keyPositives: string[];
  recommendedFocusAreas: string[];
  overallAssessment: string;
  progressionAdvice: string;
}

export interface VideoMetadata {
  videoId: string;
  duration: number;
  frameCount: number;
  fps: number;
  stance: Stance;
  trickIdentified: string;
  uploadedAt: Date;
}

export interface VideoListItem {
  videoId: string;
  trickName: string;
  uploadedAt: Date;
  analysisStatus: AnalysisStatus;
  stance: Stance;
}

// ============================================================================
// MCP TOOL RESPONSE TYPES
// ============================================================================

export interface PhaseInfo {
  phaseName: Phase;
  startFrame: number;
  endFrame: number;
  duration: number;
  keyMetrics: { [key: string]: any };
  issuesDetected: string[];
}

export interface TakeoffAnalysis {
  takeoffFrame: number;
  lipLine: {
    center: Vector3;
    height: number;
    direction: Vector3;
    angle: number;
    width: number;
  };
  formMetrics: {
    hipAngle: number;
    kneeBend: number;
    bodyOpenness: number;
    spineAngle: number;
    shoulderAlignment: number;
  };
  tailPressure: {
    popType: PopTypeVerdict;
    liftoffDelay: number;
    weightDistributionTimeline: Array<{ frame: number; weight: number }>;
  };
  momentumAnalysis: {
    snapIntensity: number;
    momentumTransfer: number;
  };
  flatSpinVerification: FlatSpinEvaluation;
  comparisonToReference?: FormComparison;
}

export interface AirAnalysis {
  airDrift: {
    distance: number;
    direction: Vector3;
    isStraight: boolean;
  };
  shoulderAlignment: {
    maxDrop: number;
    dropFrame: number;
    isConsistent: boolean;
  };
  rotationAxis: {
    type: RotationAxisVerdict;
    tiltDegrees: number;
    stability: number;
  };
  rotationCount: number;
  rotationDirection: 'frontside' | 'backside';
  grabDetected: boolean;
}

export interface LandingAnalysis {
  landingFrame: number;
  boardAngle: number;
  landingStance: Stance;
  landingQuality: LandingVerdict;
  spinControl: {
    isControlled: boolean;
    counterRotationDetected: boolean;
  };
  absorptionQuality: {
    kneeBendAtImpact: number;
    straightLegPopDetected: boolean;
  };
}

export interface SpinControlAnalysis {
  snapPower: {
    powerLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
    powerDescription: string;
    snapSpeed: number;
  };
  windUp: {
    maxAngle: number;
    frame: number;
    timestamp: number;
  };
  takeoff: {
    chestAngle: number;
    frame: number;
    timestamp: number;
  };
  snapDuration: number;
  momentumThroughLip: MomentumMeasurements;
  separation: {
    upperBodyRotation: number;
    lowerBodyRotation: number;
    maxSeparationDegrees: number;
    maxSeparationFrame: number;
    timeline: Array<{ frame: number; timestamp: number; separation: number }>;
  };
  spinControlVerdict: {
    verdict: SpinControlVerdict;
    reasoning: string;
    coachTip: string;
  };
  degreesShortOfTarget: number;
  degreesOverTarget: number;
  recommendedSnapSpeedAdjustment: number;
  recommendedAirAdjustment: string;
}

export interface KeyMomentPoses {
  videoId: string;
  moments: Array<{
    name: string;
    frame: number;
    timestamp: number;
    phase: Phase;
    pose: PoseFrame;
    description: string;
  }>;
}

export interface PhasePoses {
  phaseName: Phase;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  poses: PoseFrame[];
  keyMoments: Array<{
    name: string;
    frame: number;
    description: string;
  }>;
}

export interface CoachingTip {
  _id?: string;
  trickName: string;
  phase?: Phase;
  problemType: string;
  tip: string;
  fixInstructions: string;
  commonCauses: string[];
  sourceVideoId: string;
  sourceTimestamp: number;
  relevanceScore: number;
  createdAt: Date;
}

export interface ReferenceFilters {
  trickName?: string;
  phase?: Phase;
  stance?: Stance;
  qualityRating?: number;
  styleVariation?: string;
  isPrimary?: boolean;
}

export interface AddReferenceInput {
  videoId: string;
  frameNumber: number;
  trickName: string;
  phase: Phase;
  stance: Stance;
  qualityRating: 1 | 2 | 3 | 4 | 5;
  notes: string;
  styleVariation?: string;
}

// ============================================================================
// CONSISTENCY ANALYSIS TYPES
// ============================================================================

export interface ConsistencyReport {
  videoIds: string[];
  jointAngleConsistency: Array<{
    joint: string;
    maxDeviation: number;
    averageDeviation: number;
    isConsistent: boolean;
  }>;
  bodyProportionConsistency: {
    isConsistent: boolean;
    deviations: string[];
  };
  flaggedMeasurements: Array<{
    measurement: string;
    videoId: string;
    deviationAmount: number;
  }>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ProcessingError {
  stage: string;
  error: string;
  partialData?: any;
  timestamp: Date;
}

export interface MCPToolError {
  code: string;
  message: string;
  availableOptions?: any;
}
