// Video and Frame Types
export interface Video {
  _id: string;
  userId: string;
  filename: string;
  uploadedAt: Date;
  duration: number;
  frameCount: number;
  format: 'mp4' | 'mov' | 'webm';
  trickName: string;
  rotationDirection: 'frontside' | 'backside';
  status: 'processing' | 'completed' | 'failed';
  cachedFramesPath?: string;
  phaseBoundaries?: {
    setupCarve: { startFrame: number; endFrame: number };
    windupSnap: { startFrame: number; endFrame: number };
    grab?: { startFrame: number; endFrame: number };
    landing: { startFrame: number; endFrame: number };
  };
  analysis?: PhaseBasedCoachingFeedback;
  createdAt: Date;
}

export interface FrameExtractionResult {
  frameCount: number;
  videoDuration: number;
  fps: number;
  frames: Array<{
    frameNumber: number;
    timestamp: number;
    imagePath: string;
  }>;
  cacheHit: boolean;
}

// Pose and Keypoints
export interface PoseKeypoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
  name?: string;
}

export interface PoseData {
  frameNumber: number;
  timestamp: number;
  keypoints: PoseKeypoint[];
  confidence: number;
  [key: string]: any;
}

export interface PoseEstimationResult {
  frameNumber: number;
  timestamp: number;
  keypoints: PoseKeypoint[];
  confidence: number;
}

// Biomechanical Features
export interface BiomechanicalMetrics {
  headGaze: {
    direction: 'forward' | 'down' | 'up' | 'left' | 'right';
    angle: number;
    context: string;
  };
  stance: 'regular' | 'goofy';
  bodyStack: {
    isStacked: boolean;
    weightDistribution: 'forward' | 'centered' | 'back' | 'backfoot';
    edge: 'toeside' | 'heelside';
    alignment: 'aligned' | 'misaligned';
  };
  legBend: {
    leftKneeBend: number;
    rightKneeBend: number;
    averageBend: number;
    isStraightLegs: boolean;
  };
  upperBodyRotation: {
    rotation: 'leading' | 'following' | 'aligned';
    degreesSeparation: number;
  };
  lowerBodyRotation: {
    rotation: 'leading' | 'following' | 'aligned';
    degreesSeparation: number;
  };
  spinAxis: {
    axis: 'vertical' | 'forward_lean' | 'backward_lean' | 'sideways_lean';
    axisAlignment: number;
    description: string;
  };
  edgeType: 'toe_edge' | 'heel_edge' | 'unknown';
  boardAngle: number;
  rotationCount: number;
  rotationDirection: 'frontside' | 'backside';
}

// Phase-Based Coaching Feedback
export interface PhaseBasedCoachingFeedback {
  trickName: string;
  rotationDirection: 'frontside' | 'backside';
  phases: Array<{
    phaseName: 'setupCarve' | 'windupSnap' | 'grab' | 'landing';
    frameRange: { start: number; end: number };
    requirements: Array<{
      requirement: string;
      met: boolean;
      observation: string;
      frameReferences: number[];
    }>;
    issues: Array<{
      issue: string;
      rootCause: string;
      severity: 'minor' | 'major' | 'critical';
      frameReferences: number[];
      correction: string;
      reasoning: string;
    }>;
    summary: string;
  }>;
  overallAssessment: string;
  progressionAdvice: string;
  knowledgeReferences: string[];
}

// Mesh Viewer Types - Unified Video + Mesh Data Structure
export interface Keypoint {
  index: number;
  name: string;
  position: [number, number, number]; // x, y, z
  confidence: number;
}

export interface SkeletonConnection {
  from: number; // keypoint index
  to: number;   // keypoint index
}

// Weak perspective camera parameters from HMR2
export interface CameraParams {
  scale: number;  // Zoom factor
  tx: number;     // Translation X in normalized image coords
  ty: number;     // Translation Y in normalized image coords
  type: string;   // Camera type (e.g., 'weak_perspective')
}

export interface SyncedFrame {
  frameIndex: number;
  timestamp: number; // milliseconds
  videoFrameData?: {
    offset: number; // Reference to video frame
  };
  meshData: {
    keypoints: Keypoint[]; // Keypoints from HMR2/SMPL
    skeleton?: SkeletonConnection[]; // Optional - not used for SMPL mesh
    vertices: [number, number, number][]; // 3D positions (6890 for SMPL)
    faces: number[][]; // Triangle indices (13776 for SMPL)
    cameraParams?: CameraParams;
  };
}

export interface MeshSequence {
  videoId: string;
  videoUrl: string;
  fps: number;
  videoDuration: number;
  totalFrames: number;
  frames: SyncedFrame[];
  metadata: {
    uploadedAt: Date;
    processingTime: number;
    extractionMethod: string;
  };
}

// Chat Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  videoId?: string;
  frameReferences?: number[];
  timestamp?: number;
}

export interface ChatSession {
  sessionId: string;
  videoId: string;
  messages: ChatMessage[];
  analysisContext: PhaseBasedCoachingFeedback;
}

// LLM Analysis Request/Response
export interface LLMAnalysisRequest {
  videoId: string;
  frames: Array<{
    frameNumber: number;
    timestamp: number;
    imageBase64: string;
    poseKeypoints?: PoseKeypoint[];
    extractedFeatures?: BiomechanicalMetrics;
  }>;
  knowledgeContext: string;
  systemPrompt: string;
}

export interface LLMAnalysisResponse {
  videoId: string;
  analysis: PhaseBasedCoachingFeedback;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  };
}

// Frame Quality Types
export interface FrameQualityFlags {
  lowConfidence: boolean;
  offScreen: boolean;
  outlier: boolean;
}

export interface FrameQuality {
  frameIndex: number;
  qualityScore: number; // 0-1, where 1 is perfect
  flags: FrameQualityFlags;
  averageConfidence: number;
  boundaryDistance: number; // 0-1, min distance to image edge
  deviationFromNeighbors: number; // 0-1 scale
  metadata?: {
    keypointCount: number;
    lowConfidenceKeypoints: number;
    boundaryKeypoints: number;
  };
}

export interface FilteredFrameSequence {
  frames: any[];
  removedFrames: number[];
  interpolatedFrames: number[];
  frameIndexMap: Map<number, number>; // original → processed index
  statistics: {
    originalCount: number;
    processedCount: number;
    removedCount: number;
    interpolatedCount: number;
  };
}

export interface FrameIndexMapping {
  videoId: string;
  originalToProcessed: Map<number, number>;
  processedToOriginal: Map<number, number>;
  removedFrames: Set<number>;
  interpolatedFrames: Set<number>;
  metadata: {
    originalFrameCount: number;
    processedFrameCount: number;
    removedCount: number;
    interpolatedCount: number;
  };
}

export interface SerializedFrameIndexMapping {
  videoId: string;
  originalToProcessed: Array<[number, number]>;
  processedToOriginal: Array<[number, number]>;
  removedFrames: number[];
  interpolatedFrames: number[];
  metadata: {
    originalFrameCount: number;
    processedFrameCount: number;
    removedCount: number;
    interpolatedCount: number;
  };
}

export interface QualityStatistics {
  videoId: string;
  originalFrameCount: number;
  processedFrameCount: number;
  removedCount: number;
  interpolatedCount: number;
  removalPercentage: number;
  interpolationPercentage: number;
  averageQualityScore: number;
  lowConfidenceFrameCount: number;
  offScreenFrameCount: number;
  outlierFrameCount: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
