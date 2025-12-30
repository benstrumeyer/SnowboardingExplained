import { MeshSequence, MeshFrame, BodyProportions } from '../types';

/**
 * Convert pose keypoints to mesh vertices and faces
 * Creates a simple skeleton mesh from pose keypoints
 */
export function convertPoseToMeshSequence(
  videoId: string,
  meshSequence: any[]
): MeshSequence {
  const frames: MeshFrame[] = [];

  // Process each frame in the sequence
  for (const frameData of meshSequence) {
    const frame = convertPoseFrameToMesh(frameData);
    frames.push(frame);
  }

  // Calculate body proportions from the first frame
  const bodyProportions = calculateBodyProportions(frames[0]);

  return {
    id: `${videoId}-takeoff`,
    videoId,
    trick: 'uploaded-video',
    phase: 'takeoff',
    frameStart: 0,
    frameEnd: frames.length - 1,
    fps: 30,
    // @ts-ignore
    frames,
    bodyProportions,
  };
}

/**
 * Convert a single pose frame to mesh format
 */
function convertPoseFrameToMesh(poseFrame: any): MeshFrame {
  const { frameNumber, timestamp, keypoints, mesh_vertices_data, mesh_faces_data } = poseFrame;

  // If we have actual SMPL mesh data from 4D-Humans, use it
  if (mesh_vertices_data && mesh_faces_data) {
    const vertices = mesh_vertices_data.map((v: any) => 
      Array.isArray(v) ? v : [v.x || 0, v.y || 0, v.z || 0]
    );
    const faces = mesh_faces_data.map((f: any) => 
      Array.isArray(f) ? f : [f[0] || 0, f[1] || 0, f[2] || 0]
    );
    
    return {
      frameNumber,
      timestamp,
      vertices,
      faces,
    };
  }

  // Fallback: Create a map of keypoint names to positions
  const keypointMap = new Map<string, { x: number; y: number; z: number }>();
  
  if (keypoints && Array.isArray(keypoints)) {
    for (const kp of keypoints) {
      // Use 3D coordinates if available, otherwise use pixel coordinates
      const x = kp.x_3d !== undefined ? kp.x_3d : kp.x;
      const y = kp.y_3d !== undefined ? kp.y_3d : kp.y;
      const z = kp.z_3d !== undefined ? kp.z_3d : (kp.z || 0);
      keypointMap.set(kp.name, { x, y, z });
    }
  }

  // Build vertices from keypoints
  const vertices: number[][] = [];
  const keypointOrder = [
    'pelvis', 'spine1', 'spine2', 'spine3', 'neck', 'head',
    'left_collar', 'left_shoulder', 'left_elbow', 'left_wrist', 'left_hand',
    'right_collar', 'right_shoulder', 'right_elbow', 'right_wrist', 'right_hand',
    'left_hip', 'left_knee', 'left_ankle', 'left_foot',
    'right_hip', 'right_knee', 'right_ankle', 'right_foot',
  ];

  // Collect all keypoint positions
  const positions: Array<{ x: number; y: number; z: number }> = [];
  for (const name of keypointOrder) {
    const kp = keypointMap.get(name);
    if (kp) {
      positions.push(kp);
    }
  }

  // If we have positions, use them directly (they're already in 3D space)
  if (positions.length > 0) {
    for (const pos of positions) {
      vertices.push([pos.x, pos.y, pos.z]);
    }
  } else {
    // Fallback: create empty vertices
    for (let i = 0; i < keypointOrder.length; i++) {
      vertices.push([0, 0, 0]);
    }
  }

  // Create faces connecting the skeleton
  const faces = createSkeletonFaces(vertices.length);

  return {
    frameNumber,
    timestamp,
    vertices,
    faces,
  };
}

/**
 * Create faces for skeleton mesh
 */
function createSkeletonFaces(vertexCount: number): number[][] {
  const faces: number[][] = [];

  // SMPL skeleton connections (24 joints)
  const connections: [number, number][] = [
    // Spine
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    // Left arm
    [3, 6], [6, 7], [7, 8], [8, 9], [9, 10],
    // Right arm
    [3, 11], [11, 12], [12, 13], [13, 14], [14, 15],
    // Left leg
    [0, 16], [16, 17], [17, 18], [18, 19],
    // Right leg
    [0, 20], [20, 21], [21, 22], [22, 23],
  ];

  // Create triangular faces from line segments
  for (const [start, end] of connections) {
    if (start < vertexCount && end < vertexCount) {
      // Create a thin triangle by duplicating vertices slightly offset
      faces.push([start, end, start]);
      faces.push([end, start, end]);
    }
  }

  return faces;
}

/**
 * Calculate body proportions from mesh frame
 */
function calculateBodyProportions(frame: MeshFrame): BodyProportions {
  const vertices = frame.vertices;

  // Simple heuristic: use vertex positions to estimate proportions
  let minY = Infinity, maxY = -Infinity;
  let minX = Infinity, maxX = -Infinity;

  for (const [x, y] of vertices) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }

  const height = maxY - minY || 1;
  const width = maxX - minX || 1;

  return {
    height: height * 1.75, // Scale to approximate human height
    armLength: width * 0.4,
    legLength: height * 0.5,
    torsoLength: height * 0.35,
    shoulderWidth: width * 0.6,
    hipWidth: width * 0.4,
  };
}
