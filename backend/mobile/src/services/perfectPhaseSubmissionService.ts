import { api } from './api';
import { frameExtractionService } from './frameExtractionService';
import { poseAnalysisService, PoseData } from './poseAnalysisService';
import { MarkedPhase } from '../hooks/usePhaseMarking';

export interface PerfectPhaseSubmission {
  trickName: string;
  phaseName: string;
  stance: string;
  frames: {
    frameNumber: number;
    imageRaw: string;
    imageMeshOverlay: string;
    poseData: PoseData;
  }[];
  dataQuality: {
    averageConfidence: number;
    highConfidenceFrames: number;
    mediumConfidenceFrames: number;
    lowConfidenceFrames: number;
    qualityIndicator: string;
  };
}

class PerfectPhaseSubmissionService {
  async submitPerfectPhase(
    markedPhase: MarkedPhase,
    trickName: string,
    stance: string,
    videoUri: string,
    onProgress?: (progress: number) => void
  ): Promise<{ id: string; success: boolean }> {
    try {
      // Step 1: Extract frames from phase
      onProgress?.(10);
      const frameUris = await this.extractPhaseFrames(
        videoUri,
        markedPhase.startFrame,
        markedPhase.endFrame
      );

      // Step 2: Analyze poses for each frame
      onProgress?.(30);
      const poseDataArray = await this.analyzePoseForFrames(frameUris);

      // Step 3: Calculate data quality metrics
      onProgress?.(60);
      const dataQuality = this.calculateDataQuality(poseDataArray);

      // Step 4: Prepare submission data
      onProgress?.(80);
      const submission: PerfectPhaseSubmission = {
        trickName,
        phaseName: markedPhase.phaseName,
        stance,
        frames: frameUris.map((uri, index) => ({
          frameNumber: markedPhase.startFrame + index,
          imageRaw: uri,
          imageMeshOverlay: uri, // In production, would be different
          poseData: poseDataArray[index],
        })),
        dataQuality,
      };

      // Step 5: Send to backend
      onProgress?.(90);
      const response = await api.post('/api/perfect-phases/save', submission);

      onProgress?.(100);

      return {
        id: response.data.id,
        success: true,
      };
    } catch (error) {
      console.error('Failed to submit perfect phase:', error);
      throw error;
    }
  }

  private async extractPhaseFrames(
    videoUri: string,
    startFrame: number,
    endFrame: number
  ): Promise<string[]> {
    const frameUris: string[] = [];

    // In production, would extract actual frames from video
    // For now, return placeholder URIs
    for (let i = startFrame; i <= endFrame; i++) {
      frameUris.push(`${videoUri}_frame_${i}`);
    }

    return frameUris;
  }

  private async analyzePoseForFrames(
    frameUris: string[]
  ): Promise<PoseData[]> {
    const poseDataArray: PoseData[] = [];

    for (let i = 0; i < frameUris.length; i++) {
      try {
        const poseData = await poseAnalysisService.analyzePose(frameUris[i], i);
        poseDataArray.push(poseData);
      } catch (error) {
        console.warn(`Failed to analyze pose for frame ${i}:`, error);
        // Continue with next frame
      }
    }

    return poseDataArray;
  }

  private calculateDataQuality(poseDataArray: PoseData[]): PerfectPhaseSubmission['dataQuality'] {
    if (poseDataArray.length === 0) {
      return {
        averageConfidence: 0,
        highConfidenceFrames: 0,
        mediumConfidenceFrames: 0,
        lowConfidenceFrames: 0,
        qualityIndicator: 'poor',
      };
    }

    const confidenceScores = poseDataArray.map((p) => p.overallConfidence);
    const averageConfidence =
      confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;

    const highConfidenceFrames = confidenceScores.filter((c) => c > 0.85).length;
    const mediumConfidenceFrames = confidenceScores.filter(
      (c) => c >= 0.7 && c <= 0.85
    ).length;
    const lowConfidenceFrames = confidenceScores.filter((c) => c < 0.7).length;

    let qualityIndicator: 'excellent' | 'good' | 'fair' | 'poor';
    if (averageConfidence > 0.9) {
      qualityIndicator = 'excellent';
    } else if (averageConfidence > 0.8) {
      qualityIndicator = 'good';
    } else if (averageConfidence > 0.7) {
      qualityIndicator = 'fair';
    } else {
      qualityIndicator = 'poor';
    }

    return {
      averageConfidence,
      highConfidenceFrames,
      mediumConfidenceFrames,
      lowConfidenceFrames,
      qualityIndicator,
    };
  }

  async validatePhaseData(
    markedPhase: MarkedPhase,
    trickName: string,
    stance: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!trickName || trickName.trim() === '') {
      errors.push('Trick name is required');
    }

    if (!stance || stance.trim() === '') {
      errors.push('Stance is required');
    }

    if (markedPhase.startFrame >= markedPhase.endFrame) {
      errors.push('Invalid phase boundaries');
    }

    const frameCount = markedPhase.endFrame - markedPhase.startFrame;
    if (frameCount < 5) {
      errors.push('Phase must have at least 5 frames');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const perfectPhaseSubmissionService =
  new PerfectPhaseSubmissionService();
