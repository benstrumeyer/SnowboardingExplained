/**
 * Frame Interpolation Module
 * 
 * Exports all frame interpolation services for filling gaps in pose data.
 */

export { FrameGapAnalyzer, FrameGap, FrameGapMetadata } from './frameGapAnalyzer';
export { KeypointInterpolator, InterpolatedKeypoint } from './keypointInterpolator';
export { MeshVertexInterpolator, InterpolatedMeshData } from './meshVertexInterpolator';
export { FrameInterpolationService, InterpolatedFrame, InterpolationStatistics } from './frameInterpolationService';

// Create singleton instance
import { FrameInterpolationService } from './frameInterpolationService';
export const frameInterpolationService = new FrameInterpolationService();
