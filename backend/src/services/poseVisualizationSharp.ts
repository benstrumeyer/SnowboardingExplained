/**
 * Pose Visualization Service using Sharp
 * Draws skeleton, gaze arrow, and snowboard outline on frames
 * Uses SVG overlay composition (no native canvas compilation needed)
 */

import sharp from 'sharp';
import { Keypoint, PoseFrame } from './pythonPoseService';
import logger from '../logger';

// Skeleton connections (pairs of keypoint names to connect)
const SKELETON_CONNECTIONS: [string, string][] = [
  // Head
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_eye', 'left_ear'],
  ['right_eye', 'right_ear'],
  // Torso
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  // Left arm
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  // Right arm
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  // Left leg
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['left_ankle', 'left_heel'],
  ['left_heel', 'left_foot_index'],
  // Right leg
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
  ['right_ankle', 'right_heel'],
  ['right_heel', 'right_foot_index'],
];

// Color coding based on confidence
function getConfidenceColor(confidence: number): string {
  if (confidence > 0.7) return '#00FF00'; // Green - high confidence
  if (confidence > 0.3) return '#FFFF00'; // Yellow - medium confidence
  return '#FF0000'; // Red - low confidence
}

// Get keypoint by name
function getKeypoint(keypoints: Keypoint[], name: string): Keypoint | undefined {
  return keypoints.find(kp => kp.name === name);
}

/**
 * Generate SVG for skeleton lines
 */
function generateSkeletonSVG(keypoints: Keypoint[], width: number, height: number): string {
  const lines: string[] = [];
  const circles: string[] = [];
  
  // Draw skeleton lines
  for (const [startName, endName] of SKELETON_CONNECTIONS) {
    const start = getKeypoint(keypoints, startName);
    const end = getKeypoint(keypoints, endName);
    
    if (start && end && start.confidence > 0.3 && end.confidence > 0.3) {
      const avgConfidence = (start.confidence + end.confidence) / 2;
      const color = getConfidenceColor(avgConfidence);
      lines.push(
        `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" ` +
        `stroke="${color}" stroke-width="3" stroke-linecap="round"/>`
      );
    }
  }
  
  // Draw keypoint circles
  for (const kp of keypoints) {
    if (kp.confidence > 0.3) {
      const color = getConfidenceColor(kp.confidence);
      circles.push(
        `<circle cx="${kp.x}" cy="${kp.y}" r="5" fill="${color}" ` +
        `stroke="white" stroke-width="1"/>`
      );
    }
  }
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${lines.join('\n      ')}
      ${circles.join('\n      ')}
    </svg>
  `;
}

/**
 * Generate SVG for gaze direction arrow
 */
function generateGazeArrowSVG(keypoints: Keypoint[], width: number, height: number): string {
  const nose = getKeypoint(keypoints, 'nose');
  const leftEye = getKeypoint(keypoints, 'left_eye');
  const rightEye = getKeypoint(keypoints, 'right_eye');
  const leftShoulder = getKeypoint(keypoints, 'left_shoulder');
  const rightShoulder = getKeypoint(keypoints, 'right_shoulder');
  
  if (!nose || !leftEye || !rightEye || nose.confidence < 0.5) {
    return '';
  }
  
  // Calculate eye midpoint
  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  
  // Calculate gaze direction (from eye midpoint through nose, extended)
  const gazeVectorX = nose.x - eyeMidX;
  const gazeVectorY = nose.y - eyeMidY;
  
  // Normalize and extend
  const length = Math.sqrt(gazeVectorX * gazeVectorX + gazeVectorY * gazeVectorY);
  if (length < 1) return '';
  
  const arrowLength = 80; // pixels
  const normalizedX = gazeVectorX / length;
  const normalizedY = gazeVectorY / length;
  
  const arrowEndX = nose.x + normalizedX * arrowLength;
  const arrowEndY = nose.y + normalizedY * arrowLength;
  
  // Arrow head
  const headLength = 15;
  const headAngle = Math.PI / 6; // 30 degrees
  const angle = Math.atan2(normalizedY, normalizedX);
  
  const head1X = arrowEndX - headLength * Math.cos(angle - headAngle);
  const head1Y = arrowEndY - headLength * Math.sin(angle - headAngle);
  const head2X = arrowEndX - headLength * Math.cos(angle + headAngle);
  const head2Y = arrowEndY - headLength * Math.sin(angle + headAngle);
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Gaze arrow line -->
      <line x1="${nose.x}" y1="${nose.y}" x2="${arrowEndX}" y2="${arrowEndY}" 
            stroke="#00FFFF" stroke-width="3" stroke-linecap="round"/>
      <!-- Arrow head -->
      <polygon points="${arrowEndX},${arrowEndY} ${head1X},${head1Y} ${head2X},${head2Y}" 
               fill="#00FFFF"/>
      <!-- Label -->
      <text x="${arrowEndX + 10}" y="${arrowEndY}" fill="#00FFFF" font-size="12" font-family="Arial">
        GAZE
      </text>
    </svg>
  `;
}

/**
 * Generate SVG for snowboard outline
 * Estimates snowboard position from foot keypoints
 */
function generateSnowboardSVG(keypoints: Keypoint[], width: number, height: number): string {
  const leftAnkle = getKeypoint(keypoints, 'left_ankle');
  const rightAnkle = getKeypoint(keypoints, 'right_ankle');
  const leftHeel = getKeypoint(keypoints, 'left_heel');
  const rightHeel = getKeypoint(keypoints, 'right_heel');
  const leftFoot = getKeypoint(keypoints, 'left_foot_index');
  const rightFoot = getKeypoint(keypoints, 'right_foot_index');
  
  // Need at least ankles to estimate board position
  if (!leftAnkle || !rightAnkle || leftAnkle.confidence < 0.3 || rightAnkle.confidence < 0.3) {
    return '';
  }
  
  // Calculate board center and angle
  const centerX = (leftAnkle.x + rightAnkle.x) / 2;
  const centerY = (leftAnkle.y + rightAnkle.y) / 2;
  
  // Board direction from ankle positions
  const boardVectorX = rightAnkle.x - leftAnkle.x;
  const boardVectorY = rightAnkle.y - leftAnkle.y;
  const boardLength = Math.sqrt(boardVectorX * boardVectorX + boardVectorY * boardVectorY);
  
  if (boardLength < 10) return ''; // Ankles too close together
  
  // Normalize board vector
  const normalizedX = boardVectorX / boardLength;
  const normalizedY = boardVectorY / boardLength;
  
  // Extend board beyond feet (snowboard is longer than stance width)
  const extensionFactor = 1.8; // Board is ~1.8x stance width
  const halfBoardLength = (boardLength * extensionFactor) / 2;
  
  // Board endpoints (nose and tail)
  const noseX = centerX + normalizedX * halfBoardLength;
  const noseY = centerY + normalizedY * halfBoardLength;
  const tailX = centerX - normalizedX * halfBoardLength;
  const tailY = centerY - normalizedY * halfBoardLength;
  
  // Board width (perpendicular to length)
  const boardWidth = 15;
  const perpX = -normalizedY * boardWidth;
  const perpY = normalizedX * boardWidth;
  
  // Board corners
  const corners = [
    { x: noseX + perpX, y: noseY + perpY },
    { x: noseX - perpX, y: noseY - perpY },
    { x: tailX - perpX, y: tailY - perpY },
    { x: tailX + perpX, y: tailY + perpY },
  ];
  
  const pointsStr = corners.map(c => `${c.x},${c.y}`).join(' ');
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Snowboard outline -->
      <polygon points="${pointsStr}" 
               fill="rgba(0, 100, 255, 0.3)" 
               stroke="#0066FF" 
               stroke-width="2"/>
      <!-- Nose marker -->
      <circle cx="${noseX}" cy="${noseY}" r="6" fill="#FF6600" stroke="white" stroke-width="1"/>
      <text x="${noseX + 10}" y="${noseY}" fill="#FF6600" font-size="10" font-family="Arial">NOSE</text>
      <!-- Tail marker -->
      <circle cx="${tailX}" cy="${tailY}" r="6" fill="#6600FF" stroke="white" stroke-width="1"/>
      <text x="${tailX + 10}" y="${tailY}" fill="#6600FF" font-size="10" font-family="Arial">TAIL</text>
    </svg>
  `;
}

/**
 * Generate SVG for frame info overlay
 */
function generateInfoSVG(
  frameNumber: number,
  timestamp: number,
  totalFrames: number,
  width: number,
  height: number
): string {
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background for text -->
      <rect x="10" y="10" width="200" height="50" fill="rgba(0,0,0,0.7)" rx="5"/>
      <!-- Frame info -->
      <text x="20" y="32" fill="white" font-size="14" font-family="Arial" font-weight="bold">
        Frame ${frameNumber + 1} of ${totalFrames}
      </text>
      <text x="20" y="50" fill="#AAAAAA" font-size="12" font-family="Arial">
        ${timestamp.toFixed(0)}ms
      </text>
    </svg>
  `;
}

export interface VisualizationOptions {
  drawSkeleton?: boolean;
  drawGaze?: boolean;
  drawSnowboard?: boolean;
  drawInfo?: boolean;
  frameNumber?: number;
  timestamp?: number;
  totalFrames?: number;
}

/**
 * Composite pose visualization onto a frame image
 */
export async function visualizePose(
  frameImageBase64: string,
  poseFrame: PoseFrame,
  options: VisualizationOptions = {}
): Promise<string> {
  const {
    drawSkeleton = true,
    drawGaze = true,
    drawSnowboard = true,
    drawInfo = true,
    frameNumber = poseFrame.frameNumber,
    timestamp = 0,
    totalFrames = 1,
  } = options;
  
  try {
    // Decode base64 image
    const imageBuffer = Buffer.from(frameImageBase64, 'base64');
    
    // Get image dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || poseFrame.frameWidth || 640;
    const height = metadata.height || poseFrame.frameHeight || 480;
    
    // Generate SVG overlays
    const overlays: sharp.OverlayOptions[] = [];
    
    if (drawSkeleton && poseFrame.keypoints.length > 0) {
      const skeletonSVG = generateSkeletonSVG(poseFrame.keypoints, width, height);
      overlays.push({
        input: Buffer.from(skeletonSVG),
        top: 0,
        left: 0,
      });
    }
    
    if (drawGaze && poseFrame.keypoints.length > 0) {
      const gazeSVG = generateGazeArrowSVG(poseFrame.keypoints, width, height);
      if (gazeSVG) {
        overlays.push({
          input: Buffer.from(gazeSVG),
          top: 0,
          left: 0,
        });
      }
    }
    
    if (drawSnowboard && poseFrame.keypoints.length > 0) {
      const snowboardSVG = generateSnowboardSVG(poseFrame.keypoints, width, height);
      if (snowboardSVG) {
        overlays.push({
          input: Buffer.from(snowboardSVG),
          top: 0,
          left: 0,
        });
      }
    }
    
    if (drawInfo) {
      const infoSVG = generateInfoSVG(frameNumber, timestamp, totalFrames, width, height);
      overlays.push({
        input: Buffer.from(infoSVG),
        top: 0,
        left: 0,
      });
    }
    
    // Composite all overlays onto the original image
    let result = sharp(imageBuffer);
    
    if (overlays.length > 0) {
      result = result.composite(overlays);
    }
    
    // Convert to PNG and return as base64
    const outputBuffer = await result.png().toBuffer();
    return outputBuffer.toString('base64');
    
  } catch (error: any) {
    logger.error('[VISUALIZATION] Failed to visualize pose', { error: error.message });
    throw error;
  }
}

/**
 * Visualize multiple frames
 */
export async function visualizePoseSequence(
  frames: Array<{
    imageBase64: string;
    poseFrame: PoseFrame;
    timestamp: number;
  }>,
  options: Omit<VisualizationOptions, 'frameNumber' | 'timestamp' | 'totalFrames'> = {}
): Promise<Array<{ frameNumber: number; annotatedImageBase64: string; timestamp: number }>> {
  const results: Array<{ frameNumber: number; annotatedImageBase64: string; timestamp: number }> = [];
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    
    try {
      const annotatedImageBase64 = await visualizePose(
        frame.imageBase64,
        frame.poseFrame,
        {
          ...options,
          frameNumber: i,
          timestamp: frame.timestamp,
          totalFrames: frames.length,
        }
      );
      
      results.push({
        frameNumber: i,
        annotatedImageBase64,
        timestamp: frame.timestamp,
      });
    } catch (error: any) {
      logger.error(`[VISUALIZATION] Failed to visualize frame ${i}`, { error: error.message });
      // Return original image on error
      results.push({
        frameNumber: i,
        annotatedImageBase64: frame.imageBase64,
        timestamp: frame.timestamp,
      });
    }
  }
  
  return results;
}
