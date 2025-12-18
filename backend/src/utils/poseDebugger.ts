import { PoseVisualizationService } from '../services/poseVisualization';
import { PoseKeypoint } from '../types';
import logger from '../logger';

/**
 * Pose Debugger Utility
 * Helps visualize and debug pose estimation results
 */
export class PoseDebugger {
  private static readonly DEBUG_OUTPUT_DIR = './debug/pose-visualizations';
  private static isEnabled = process.env.POSE_DEBUG === 'true';

  /**
   * Enable or disable pose debugging
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    logger.info(`Pose debugging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if pose debugging is enabled
   */
  static isDebugEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Visualize a single frame with pose keypoints
   */
  static visualizeFrame(
    frameBuffer: Buffer,
    keypoints: PoseKeypoint[],
    frameNumber: number,
    width: number = 640,
    height: number = 480
  ): Buffer {
    if (!this.isEnabled) {
      return frameBuffer;
    }

    try {
      logger.debug(`Visualizing pose for frame ${frameNumber}`, {
        keypointCount: keypoints.length,
        confidenceAvg: (keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / keypoints.length).toFixed(2),
      });

      return PoseVisualizationService.drawPoseOnFrame(frameBuffer, keypoints, width, height);
    } catch (error) {
      logger.error(`Failed to visualize frame ${frameNumber}`, { error });
      return frameBuffer;
    }
  }

  /**
   * Export visualization frames for inspection
   */
  static async exportFrames(
    frames: Array<{ buffer: Buffer; keypoints: PoseKeypoint[]; frameNumber: number }>,
    outputDir: string = this.DEBUG_OUTPUT_DIR
  ): Promise<void> {
    if (!this.isEnabled) {
      logger.debug('Pose debugging disabled, skipping frame export');
      return;
    }

    try {
      logger.info(`Exporting ${frames.length} pose visualization frames to ${outputDir}`);
      await PoseVisualizationService.exportVisualizationFrames(frames, outputDir);
      logger.info(`Successfully exported pose visualizations to ${outputDir}`);
    } catch (error) {
      logger.error('Failed to export pose visualizations', { error });
    }
  }

  /**
   * Log pose analysis details
   */
  static logPoseAnalysis(
    frameNumber: number,
    keypoints: PoseKeypoint[],
    analysis: Record<string, any>
  ): void {
    if (!this.isEnabled) {
      return;
    }

    const confidenceScores = keypoints.map(kp => ({
      name: kp.name,
      confidence: kp.confidence.toFixed(2),
    }));

    logger.debug(`Pose analysis for frame ${frameNumber}`, {
      keypointCount: keypoints.length,
      confidenceScores,
      analysis,
    });
  }

  /**
   * Get debug output directory
   */
  static getDebugOutputDir(): string {
    return this.DEBUG_OUTPUT_DIR;
  }
}
