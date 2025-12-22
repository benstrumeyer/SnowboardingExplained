import axios from 'axios';
import { MeshSequence } from '../types';
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
 * SIMPLE: Just polls /api/mesh-data/{videoId} directly
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
        
        console.log(`[MESH] ✓ Got mesh data for ${videoId}: ${meshData.frames?.length || 0} frames`);
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
