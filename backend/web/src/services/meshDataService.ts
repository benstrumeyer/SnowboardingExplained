import axios from 'axios';
import { MeshSequence, SyncedFrame } from '../types';
import { getMockMeshData } from './mockMeshData';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Track which videos are currently being loaded
const loadingVideos = new Set<string>();

/**
 * Fetch mesh data from backend with polling
 * Handles unified MeshSequence structure with synchronized video and mesh frames
 */
async function fetchMeshDataWithPolling(
  videoId: string,
  maxRetries: number = 120,
  retryInterval: number = 2000
): Promise<MeshSequence> {
  // Prevent duplicate loads
  if (loadingVideos.has(videoId)) {
    console.log(`[MESH] Already loading ${videoId}, skipping`);
    throw new Error(`Already loading ${videoId}`);
  }

  loadingVideos.add(videoId);

  try {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[MESH] Polling /api/mesh-data/${videoId} (attempt ${attempt + 1}/${maxRetries})`);
        
        const response = await client.get<any>(`/api/mesh-data/${videoId}`);
        
        // Extract the mesh data from the API response wrapper
        const meshData = response.data.data || response.data;
        
        // Validate unified data structure
        if (!meshData.frames || !Array.isArray(meshData.frames)) {
          throw new Error('Invalid mesh data structure: missing frames array');
        }

        // Validate frame synchronization
        const validationResult = validateMeshSequence(meshData);
        if (!validationResult.isValid) {
          console.warn(`[MESH] Validation warnings:`, validationResult.warnings);
        }
        
        console.log(`[MESH] ✓ Got mesh data for ${videoId}: ${meshData.frames.length} frames @ ${meshData.fps} fps`);
        return meshData as MeshSequence;
        
      } catch (err: any) {
        const status = err.response?.status;

        if (status === 202) {
          console.log(`[MESH] Still processing, retrying...`);
        } else if (status === 404) {
          console.log(`[MESH] Not found yet, retrying...`);
        } else {
          console.warn(`[MESH] Error (${status}):`, err.message);
        }

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryInterval));
        }
      }
    }

    // Polling exhausted, fall back to mock data
    console.warn(`[MESH] Polling exhausted for ${videoId}, using mock data`);
    return getMockMeshData(videoId, 'default');
    
  } finally {
    loadingVideos.delete(videoId);
  }
}

/**
 * Validate MeshSequence structure and frame synchronization
 */
function validateMeshSequence(meshData: any): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!meshData.videoId) warnings.push('Missing videoId');
  if (!meshData.videoUrl) warnings.push('Missing videoUrl');
  if (!meshData.fps) warnings.push('Missing fps');
  if (!meshData.videoDuration) warnings.push('Missing videoDuration');
  if (!meshData.totalFrames) warnings.push('Missing totalFrames');
  if (!meshData.frames || meshData.frames.length === 0) warnings.push('No frames in sequence');
  if (!meshData.metadata) warnings.push('Missing metadata');

  // Validate frame structure
  if (meshData.frames && Array.isArray(meshData.frames)) {
    for (let i = 0; i < Math.min(meshData.frames.length, 5); i++) {
      const frame = meshData.frames[i];
      if (!frame.frameIndex) warnings.push(`Frame ${i} missing frameIndex`);
      if (frame.timestamp === undefined) warnings.push(`Frame ${i} missing timestamp`);
      if (!frame.meshData || !frame.meshData.keypoints) warnings.push(`Frame ${i} missing mesh data`);
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Get frame at specific index from mesh sequence
 */
export function getFrameAtIndex(meshSequence: MeshSequence, frameIndex: number): SyncedFrame | null {
  if (frameIndex < 0 || frameIndex >= meshSequence.frames.length) {
    return null;
  }
  return meshSequence.frames[frameIndex];
}

/**
 * Get frame at specific timestamp from mesh sequence
 */
export function getFrameAtTimestamp(meshSequence: MeshSequence, timestamp: number): SyncedFrame | null {
  // Binary search for frame at timestamp
  let left = 0;
  let right = meshSequence.frames.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const frame = meshSequence.frames[mid];

    if (Math.abs(frame.timestamp - timestamp) < 1) {
      return frame;
    }

    if (frame.timestamp < timestamp) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // Return closest frame
  return meshSequence.frames[left] || meshSequence.frames[right] || null;
}

/**
 * Load multiple mesh sequences
 */
export async function loadMultipleMeshSequences(videoIds: string[]): Promise<MeshSequence[]> {
  const results = await Promise.allSettled(
    videoIds.map(videoId => fetchMeshDataWithPolling(videoId))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<MeshSequence> => result.status === 'fulfilled')
    .map(result => result.value);
}

/**
 * Fetch mesh data for rider
 */
export async function fetchRiderMesh(videoId: string, _phase?: string): Promise<MeshSequence> {
  console.log(`[MESH] fetchRiderMesh: videoId=${videoId}`);
  return fetchMeshDataWithPolling(videoId);
}

/**
 * Fetch mesh data for reference/coach
 */
export async function fetchReferenceMesh(videoId: string, _phase?: string): Promise<MeshSequence> {
  console.log(`[MESH] fetchReferenceMesh: videoId=${videoId}`);
  return fetchMeshDataWithPolling(videoId);
}
