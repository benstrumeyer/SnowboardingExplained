import logger from '../logger';
import { PoseEstimationResult, PoseKeypoint } from '../types';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Pose Estimation Service
 * Uses Gemini Vision for skeleton keypoint detection
 */
export class PoseEstimationService {
  // Key body keypoints we want to detect (simplified for reliability)
  private static readonly KEYPOINT_NAMES = [
    'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
    'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear',
    'mouth_left', 'mouth_right',
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_pinky', 'right_pinky',
    'left_index', 'right_index',
    'left_thumb', 'right_thumb',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle',
    'left_heel', 'right_heel',
    'left_foot_index', 'right_foot_index'
  ];

  /**
   * Estimate pose from frame image using Gemini Vision
   */
  static async estimatePose(framePath: string, frameNumber: number, timestamp: number): Promise<PoseEstimationResult> {
    try {
      if (!fs.existsSync(framePath)) {
        throw new Error(`Frame not found: ${framePath}`);
      }

      logger.info(`[GEMINI POSE] Estimating pose for frame: ${frameNumber}`, { frameNumber, framePath });

      // Read image as base64
      const imageBuffer = fs.readFileSync(framePath);
      const imageBase64 = imageBuffer.toString('base64');
      const mimeType = framePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      // Call Gemini Vision
      const keypoints = await this.callGeminiForPose(imageBase64, mimeType);

      const result: PoseEstimationResult = {
        frameNumber,
        timestamp,
        keypoints,
        confidence: keypoints.filter(k => k.confidence > 0.5).length / keypoints.length
      };

      logger.info(`[GEMINI POSE] Complete: ${keypoints.filter(k => k.confidence > 0.5).length}/${keypoints.length} keypoints detected`);
      return result;
    } catch (err) {
      logger.error(`[GEMINI POSE] Failed for frame ${frameNumber}`, { error: err });
      throw err;
    }
  }

  /**
   * Call Gemini Vision API to detect pose keypoints
   */
  private static async callGeminiForPose(imageBase64: string, mimeType: string): Promise<PoseKeypoint[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analyze this snowboarding image and detect the rider's body pose keypoints.

Return ONLY a JSON object with pixel coordinates for each visible body part. The image dimensions should be estimated from the frame.

For each keypoint, provide:
- x: horizontal pixel position (0 = left edge)
- y: vertical pixel position (0 = top edge)  
- confidence: 0.0-1.0 (0 if not visible/occluded)

Return this exact JSON structure:
{
  "imageWidth": <estimated width>,
  "imageHeight": <estimated height>,
  "keypoints": {
    "nose": {"x": number, "y": number, "confidence": number},
    "left_shoulder": {"x": number, "y": number, "confidence": number},
    "right_shoulder": {"x": number, "y": number, "confidence": number},
    "left_elbow": {"x": number, "y": number, "confidence": number},
    "right_elbow": {"x": number, "y": number, "confidence": number},
    "left_wrist": {"x": number, "y": number, "confidence": number},
    "right_wrist": {"x": number, "y": number, "confidence": number},
    "left_hip": {"x": number, "y": number, "confidence": number},
    "right_hip": {"x": number, "y": number, "confidence": number},
    "left_knee": {"x": number, "y": number, "confidence": number},
    "right_knee": {"x": number, "y": number, "confidence": number},
    "left_ankle": {"x": number, "y": number, "confidence": number},
    "right_ankle": {"x": number, "y": number, "confidence": number}
  }
}

IMPORTANT: 
- Set confidence to 0 for any body part that is not clearly visible
- Coordinates should be actual pixel positions in the image
- The rider may be wearing a helmet, goggles, and winter gear
- Return ONLY the JSON, no other text`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType, data: imageBase64 } }
    ]);

    const responseText = result.response.text();
    logger.debug(`[GEMINI POSE] Raw response: ${responseText.substring(0, 500)}`);

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const detectedKeypoints = parsed.keypoints || {};

    // Convert to our keypoint format, filling in all 33 MediaPipe keypoints
    return this.KEYPOINT_NAMES.map(name => {
      const detected = detectedKeypoints[name];
      if (detected && detected.confidence > 0) {
        return {
          name,
          x: detected.x,
          y: detected.y,
          z: 0,
          confidence: detected.confidence
        };
      }
      // Not detected - return zero confidence
      return { name, x: 0, y: 0, z: 0, confidence: 0 };
    });
  }

  /**
   * Batch estimate poses for multiple frames
   */
  static async estimatePoseBatch(frames: Array<{ path: string; frameNumber: number; timestamp: number }>): Promise<PoseEstimationResult[]> {
    logger.info(`Starting batch pose estimation for ${frames.length} frames`);
    const results = await Promise.all(
      frames.map(frame => this.estimatePose(frame.path, frame.frameNumber, frame.timestamp))
    );
    logger.info(`Batch pose estimation completed: ${results.length} frames processed`);
    return results;
  }

  static getKeypointByName(keypoints: PoseKeypoint[], name: string): PoseKeypoint | undefined {
    return keypoints.find(kp => kp.name === name);
  }

  static calculateDistance(kp1: PoseKeypoint, kp2: PoseKeypoint): number {
    const dx = kp1.x - kp2.x;
    const dy = kp1.y - kp2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static calculateAngle(kp1: PoseKeypoint, kp2: PoseKeypoint, kp3: PoseKeypoint): number {
    const v1 = { x: kp1.x - kp2.x, y: kp1.y - kp2.y };
    const v2 = { x: kp3.x - kp2.x, y: kp3.y - kp2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  }
}
