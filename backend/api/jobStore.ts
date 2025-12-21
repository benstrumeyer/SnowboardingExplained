/**
 * Shared Job Store
 * In-memory storage for video processing jobs
 * SIMPLE ID SCHEME: videoId = "v_{timestamp}" used everywhere
 */

export interface MeshFrame {
  frameNumber: number;
  timestamp: number;
  vertices: number[][];
  faces: number[][];
}

export interface MeshSequence {
  frames: MeshFrame[];
}

export interface JobData {
  status: 'processing' | 'complete' | 'error';
  videoId: string;
  role?: string;
  result?: MeshSequence;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

// Global job store - keyed by videoId directly (e.g., "v_1234567890")
export const jobStore: Record<string, JobData> = {};

// Simple ID generator - just "v_" + timestamp
let idCounter = 0;
export function generateVideoId(): string {
  idCounter++;
  return `v_${Date.now()}_${idCounter}`;
}

console.log('[JOBSTORE] Initialized global jobStore');
