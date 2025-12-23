// Unified Mesh Viewer Types
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

export interface SyncedFrame {
  frameIndex: number;
  timestamp: number; // milliseconds
  videoFrameData?: {
    offset: number; // Reference to video frame
  };
  meshData: {
    keypoints: Keypoint[]; // 33 keypoints from MediaPipe
    skeleton: SkeletonConnection[];
    vertices: [number, number, number][]; // 3D positions
    faces: number[][]; // Triangle indices
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

// Legacy types for backward compatibility
export interface MeshFrame {
  frameNumber: number;
  timestamp: number;
  vertices: number[][];
  faces: number[][];
  normals?: number[][];
}

export interface BodyProportions {
  height: number;
  armLength: number;
  legLength: number;
  torsoLength: number;
  shoulderWidth: number;
  hipWidth: number;
}

export interface PoseOverlayViewerState {
  riderMesh: MeshSequence | null;
  referenceMesh: MeshSequence | null;
  isPlaying: boolean;
  currentFrame: number;
  playbackSpeed: number;
  riderFrameOffset: number;
  referenceFrameOffset: number;
  riderRotation: { x: number; y: number; z: number };
  referenceRotation: { x: number; y: number; z: number };
  showRider: boolean;
  showReference: boolean;
  mode: 'side-by-side' | 'overlay';
  inPlaceMode: boolean;
  referenceOpacity: number;
  loading: boolean;
  error: string | null;
}
