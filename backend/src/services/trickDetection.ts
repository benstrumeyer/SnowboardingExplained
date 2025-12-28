import logger from '../logger';
import { PoseKeypoint } from '../types';

export interface TrickDetectionResult {
  trickName: string;
  rotationDirection: 'frontside' | 'backside';
  confidence: number;
  rotationCount: number;
  estimatedDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string;
}

/**
 * Trick Detection Service
 * Analyzes pose sequences to identify the trick being performed
 * 
 * TODO: This service is not currently used by the upload video endpoint.
 * Commenting out implementation for now to unblock Docker build.
 */

/*
export class TrickDetectionService {
  // Implementation commented out - not used by upload endpoint
}
*/
