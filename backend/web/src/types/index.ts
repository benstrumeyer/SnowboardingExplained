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

// Legacy types for backward compatibility
export interface MeshFrame {
  frameNumber: number;
  timestamp: number;
  vertices: number[][];
  faces: number[][];
  normals?: number[][];
  cameraParams?: CameraParams;
  mesh_vertices_data?: number[][];  // Alternative property name from Flask
  mesh_faces_data?: number[][];     // Alternative property name from Flask
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
