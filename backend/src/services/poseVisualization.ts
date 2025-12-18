import { createCanvas } from 'canvas';
import { PoseKeypoint } from '../types';
import logger from '../logger';

/**
 * Pose Visualization Service
 * Draws pose keypoints and angles on video frames for debugging and analysis
 */
export class PoseVisualizationService {
  // Visualization constants
  private static readonly KEYPOINT_RADIUS = 5;
  private static readonly KEYPOINT_COLOR = '#00FF00'; // Green
  private static readonly LINE_COLOR = '#FF00FF'; // Magenta
  private static readonly ANGLE_COLOR = '#FFFF00'; // Yellow
  private static readonly TEXT_COLOR = '#FFFFFF'; // White
  private static readonly LINE_WIDTH = 2;
  private static readonly FONT_SIZE = 14;

  // Key connections to draw (skeleton)
  private static readonly SKELETON_CONNECTIONS = [
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'],
    ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'],
    ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'],
    ['right_knee', 'right_ankle'],
  ];

  // Key angles to display
  private static readonly KEY_ANGLES = [
    { name: 'Shoulder Angle', points: ['left_shoulder', 'right_shoulder', 'left_hip'] },
    { name: 'Left Arm Angle', points: ['left_shoulder', 'left_elbow', 'left_wrist'] },
    { name: 'Right Arm Angle', points: ['right_shoulder', 'right_elbow', 'right_wrist'] },
    { name: 'Left Leg Angle', points: ['left_hip', 'left_knee', 'left_ankle'] },
    { name: 'Right Leg Angle', points: ['right_hip', 'right_knee', 'right_ankle'] },
  ];

  /**
   * Draw pose keypoints and skeleton on a frame
   */
  static drawPoseOnFrame(
    frameBuffer: Buffer,
    keypoints: PoseKeypoint[],
    width: number = 640,
    height: number = 480
  ): Buffer {
    try {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Draw the original frame as background
      // Note: In production, you'd load the actual frame image here
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw skeleton connections
      this.drawSkeleton(ctx, keypoints);

      // Draw keypoints
      this.drawKeypoints(ctx, keypoints);

      // Draw angles
      this.drawAngles(ctx, keypoints);

      // Draw labels
      this.drawLabels(ctx, keypoints);

      return canvas.toBuffer('image/png');
    } catch (error) {
      logger.error('Failed to draw pose on frame', { error });
      throw error;
    }
  }

  /**
   * Draw skeleton connections between keypoints
   */
  private static drawSkeleton(ctx: any, keypoints: PoseKeypoint[]): void {
    ctx.strokeStyle = this.LINE_COLOR;
    ctx.lineWidth = this.LINE_WIDTH;

    for (const [start, end] of this.SKELETON_CONNECTIONS) {
      const startKp = keypoints.find(kp => kp.name === start);
      const endKp = keypoints.find(kp => kp.name === end);

      if (startKp && endKp && startKp.confidence > 0.5 && endKp.confidence > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startKp.x, startKp.y);
        ctx.lineTo(endKp.x, endKp.y);
        ctx.stroke();
      }
    }
  }

  /**
   * Draw keypoint circles
   */
  private static drawKeypoints(ctx: any, keypoints: PoseKeypoint[]): void {
    for (const kp of keypoints) {
      if (kp.confidence > 0.5) {
        // Draw circle
        ctx.fillStyle = this.KEYPOINT_COLOR;
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, this.KEYPOINT_RADIUS, 0, 2 * Math.PI);
        ctx.fill();

        // Draw confidence indicator (opacity based on confidence)
        ctx.strokeStyle = `rgba(0, 255, 0, ${kp.confidence})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, this.KEYPOINT_RADIUS + 3, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  /**
   * Draw angle measurements
   */
  private static drawAngles(ctx: any, keypoints: PoseKeypoint[]): void {
    ctx.fillStyle = this.ANGLE_COLOR;
    ctx.font = `${this.FONT_SIZE}px Arial`;

    let yOffset = 30;

    for (const angleInfo of this.KEY_ANGLES) {
      const [p1Name, p2Name, p3Name] = angleInfo.points;
      const p1 = keypoints.find(kp => kp.name === p1Name);
      const p2 = keypoints.find(kp => kp.name === p2Name);
      const p3 = keypoints.find(kp => kp.name === p3Name);

      if (p1 && p2 && p3 && p1.confidence > 0.5 && p2.confidence > 0.5 && p3.confidence > 0.5) {
        const angle = this.calculateAngle(p1, p2, p3);
        ctx.fillText(`${angleInfo.name}: ${angle.toFixed(1)}°`, 10, yOffset);
        yOffset += this.FONT_SIZE + 5;
      }
    }
  }

  /**
   * Draw keypoint labels
   */
  private static drawLabels(ctx: any, keypoints: PoseKeypoint[]): void {
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = `${this.FONT_SIZE - 4}px Arial`;

    // Only label key points to avoid clutter
    const keyPointsToLabel = [
      'left_shoulder',
      'right_shoulder',
      'left_hip',
      'right_hip',
      'left_wrist',
      'right_wrist',
      'left_ankle',
      'right_ankle',
    ];

    for (const kp of keypoints) {
      if (keyPointsToLabel.includes(kp.name) && kp.confidence > 0.5) {
        ctx.fillText(kp.name.replace('_', ' '), kp.x + 10, kp.y - 5);
      }
    }
  }

  /**
   * Calculate angle between three points
   */
  private static calculateAngle(p1: PoseKeypoint, p2: PoseKeypoint, p3: PoseKeypoint): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  }

  /**
   * Draw multiple frames with pose visualization
   */
  static drawPoseSequence(
    frames: Array<{ buffer: Buffer; keypoints: PoseKeypoint[] }>,
    width: number = 640,
    height: number = 480
  ): Array<Buffer> {
    return frames.map(frame => this.drawPoseOnFrame(frame.buffer, frame.keypoints, width, height));
  }

  /**
   * Export visualization frames to files for inspection
   */
  static async exportVisualizationFrames(
    frames: Array<{ buffer: Buffer; keypoints: PoseKeypoint[]; frameNumber: number }>,
    outputDir: string
  ): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      // Create output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });

      for (const frame of frames) {
        const visualizedBuffer = this.drawPoseOnFrame(frame.buffer, frame.keypoints);
        const filename = path.join(outputDir, `pose_frame_${frame.frameNumber}.png`);
        await fs.writeFile(filename, visualizedBuffer);

        logger.info(`Exported pose visualization: ${filename}`);
      }
    } catch (error) {
      logger.error('Failed to export visualization frames', { error });
      throw error;
    }
  }
}
