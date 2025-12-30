import { MeshSequence, MeshFrame, BodyProportions } from '../types';

/**
 * Generate a simple cube mesh for testing
 */
function generateCubeMesh(scale: number = 1): number[][] {
  const s = scale;
  return [
    [-s, -s, -s],
    [s, -s, -s],
    [s, s, -s],
    [-s, s, -s],
    [-s, -s, s],
    [s, -s, s],
    [s, s, s],
    [-s, s, s],
  ];
}

/**
 * Generate cube faces
 */
function generateCubeFaces(): number[][] {
  return [
    [0, 1, 2],
    [0, 2, 3],
    [4, 6, 5],
    [4, 7, 6],
    [0, 4, 5],
    [0, 5, 1],
    [2, 6, 7],
    [2, 7, 3],
    [0, 3, 7],
    [0, 7, 4],
    [1, 5, 6],
    [1, 6, 2],
  ];
}

/**
 * Generate a simple skeleton mesh (human-like structure)
 */
function generateSkeletonMesh(scale: number = 1): number[][] {
  const s = scale;
  // Simple skeleton: head, torso, arms, legs with Z depth
  return [
    // Head
    [0, s * 1.8, s * 0.2],
    [s * 0.3, s * 1.8, s * 0.1],
    [-s * 0.3, s * 1.8, s * 0.1],
    // Torso
    [0, s * 1.2, s * 0.3],
    [0, s * 0.6, s * 0.2],
    // Left arm
    [-s * 0.8, s * 1.0, s * 0.1],
    [-s * 1.2, s * 0.8, s * 0.0],
    // Right arm
    [s * 0.8, s * 1.0, s * 0.1],
    [s * 1.2, s * 0.8, s * 0.0],
    // Left leg
    [-s * 0.3, s * 0.4, s * 0.2],
    [-s * 0.3, -s * 0.4, s * 0.1],
    // Right leg
    [s * 0.3, s * 0.4, s * 0.2],
    [s * 0.3, -s * 0.4, s * 0.1],
  ];
}

/**
 * Generate skeleton faces
 */
function generateSkeletonFaces(): number[][] {
  return [
    // Head
    [0, 1, 2],
    // Torso to head
    [0, 3, 4],
    // Left arm
    [3, 5, 6],
    // Right arm
    [3, 7, 8],
    // Left leg
    [4, 9, 10],
    // Right leg
    [4, 11, 12],
  ];
}

/**
 * Generate a frame with slight animation
 */
function generateAnimatedFrame(
  frameNumber: number,
  totalFrames: number,
  baseVertices: number[][]
): MeshFrame {
  const progress = frameNumber / totalFrames;
  const angle = progress * Math.PI * 2;

  // Apply slight rotation to vertices
  const vertices = baseVertices.map(([x, y, z]) => {
    const rotX = x * Math.cos(angle) - z * Math.sin(angle);
    const rotZ = x * Math.sin(angle) + z * Math.cos(angle);
    return [rotX, y, rotZ];
  });

  return {
    frameNumber,
    timestamp: frameNumber / 30, // Assume 30 FPS
    vertices,
    faces: generateSkeletonFaces(),
  };
}

/**
 * Generate mock body proportions
 */
function generateBodyProportions(scale: number = 1): BodyProportions {
  return {
    height: 1.75 * scale,
    armLength: 0.75 * scale,
    legLength: 0.9 * scale,
    torsoLength: 0.6 * scale,
    shoulderWidth: 0.45 * scale,
    hipWidth: 0.35 * scale,
  };
}

/**
 * Generate a complete mock mesh sequence
 */
export function generateMockMeshSequence(
  videoId: string,
  phase: string,
  scale: number = 1,
  frameCount: number = 30
): MeshSequence {
  const baseVertices = generateSkeletonMesh(scale);
  const frames: MeshFrame[] = [];

  for (let i = 0; i < frameCount; i++) {
    frames.push(generateAnimatedFrame(i, frameCount, baseVertices));
  }

  return {
    id: `${videoId}-${phase}`,
    videoId,
    trick: 'sample-trick',
    phase,
    frameStart: 0,
    frameEnd: frameCount - 1,
    fps: 30,
    // @ts-ignore
    frames,
    bodyProportions: generateBodyProportions(scale),
  };
}

/**
 * Get mock mesh data - simulates API response
 */
export async function getMockMeshData(
  videoId: string,
  phase: string
): Promise<MeshSequence> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate different scales for different videos to show scaling differences
  const scale = videoId.includes('coach') ? 1.1 : 0.95;

  return generateMockMeshSequence(videoId, phase, scale, 60);
}
