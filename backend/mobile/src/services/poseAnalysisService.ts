import axios from 'axios';
import { config } from '../config';

export interface PoseData {
  frameNumber: number;
  timestamp: number;
  joints: {
    name: string;
    x: number;
    y: number;
    z: number;
    confidence: number;
  }[];
  angles: {
    name: string;
    angle: number;
    confidence: number;
  }[];
  overallConfidence: number;
  detectionSignals: {
    name: string;
    value: number;
    threshold: number;
    status: 'good' | 'warning' | 'critical';
  }[];
}

// Use backend API to proxy to pose service (mobile can't reach localhost:5000 directly)
const poseServiceClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 30000,
});

class PoseAnalysisService {
  private poseCache: Map<string, PoseData> = new Map();

  async analyzePose(frameUri: string, frameNumber: number): Promise<PoseData> {
    const cacheKey = `${frameUri}_${frameNumber}`;

    // Check cache
    if (this.poseCache.has(cacheKey)) {
      return this.poseCache.get(cacheKey)!;
    }

    try {
      // Send frame to backend API which proxies to pose service
      const formData = new FormData();
      formData.append('frame', {
        uri: frameUri,
        type: 'image/jpeg',
        name: `frame_${frameNumber}.jpg`,
      } as any);
      formData.append('frameNumber', frameNumber.toString());

      const response = await poseServiceClient.post('/api/pose/hybrid', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const poseData: PoseData = response.data;
      this.poseCache.set(cacheKey, poseData);
      return poseData;
    } catch (error) {
      console.error('Failed to analyze pose:', error);
      throw error;
    }
  }

  async analyzeFrameRange(
    frameUris: string[],
    startFrame: number
  ): Promise<PoseData[]> {
    const results: PoseData[] = [];

    try {
      for (let i = 0; i < frameUris.length; i++) {
        const poseData = await this.analyzePose(frameUris[i], startFrame + i);
        results.push(poseData);
      }

      return results;
    } catch (error) {
      console.error('Failed to analyze frame range:', error);
      throw error;
    }
  }

  async retryAnalysis(
    frameUri: string,
    frameNumber: number,
    maxRetries: number = 3
  ): Promise<PoseData> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.analyzePose(frameUri, frameNumber);
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Pose analysis attempt ${attempt + 1} failed, retrying...`
        );

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw lastError || new Error('Failed to analyze pose after retries');
  }

  getCachedPose(frameUri: string, frameNumber: number): PoseData | null {
    const cacheKey = `${frameUri}_${frameNumber}`;
    return this.poseCache.get(cacheKey) || null;
  }

  clearCache(): void {
    this.poseCache.clear();
  }

  calculateJointAngle(
    joint1: { x: number; y: number; z: number },
    joint2: { x: number; y: number; z: number },
    joint3: { x: number; y: number; z: number }
  ): number {
    // Calculate angle between three joints
    const v1 = {
      x: joint1.x - joint2.x,
      y: joint1.y - joint2.y,
      z: joint1.z - joint2.z,
    };

    const v2 = {
      x: joint3.x - joint2.x,
      y: joint3.y - joint2.y,
      z: joint3.z - joint2.z,
    };

    const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const magnitude1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
    const magnitude2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);

    const cosAngle = dotProduct / (magnitude1 * magnitude2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    return (angle * 180) / Math.PI; // Convert to degrees
  }

  calculateConfidenceScore(joints: PoseData['joints']): number {
    if (joints.length === 0) return 0;

    const totalConfidence = joints.reduce((sum, joint) => sum + joint.confidence, 0);
    return totalConfidence / joints.length;
  }
}

export const poseAnalysisService = new PoseAnalysisService();
