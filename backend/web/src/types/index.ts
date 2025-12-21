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

export interface MeshSequence {
  id: string;
  videoId: string;
  trick: string;
  phase: string;
  frameStart: number;
  frameEnd: number;
  fps: number;
  frames: MeshFrame[];
  bodyProportions: BodyProportions;
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
