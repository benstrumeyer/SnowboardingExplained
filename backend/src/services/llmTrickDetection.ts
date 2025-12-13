import logger from '../logger';
import { PoseKeypoint } from '../types';

export interface LLMTrickDetectionResult {
  trickName: string;
  rotationDirection: 'frontside' | 'backside';
  rotationCount: number;
  confidence: number;
  estimatedDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string;
  styleElements: {
    hasGrab: boolean;
    grabType: string;
    isTweaked: boolean;
    isBlind: boolean;
  };
  reasoning: string;
}

/**
 * LLM-Based Trick Detection Service
 * Uses Google Gemini to analyze video frames and detect tricks
 */
export class LLMTrickDetectionService {
  private static getGeminiKey() {
    return process.env.GEMINI_API_KEY;
  }

  /**
   * Detect trick using Google Gemini Vision
   */
  static async detectTrickFromFrames(
    frames: Array<{ imageBase64: string; frameNumber: number; timestamp: number }>,
    poseSequence?: Array<{ keypoints: PoseKeypoint[]; frameNumber: number }>
  ): Promise<LLMTrickDetectionResult> {
    logger.info(`Starting LLM-based trick detection for ${frames.length} frames`, {
      provider: 'gemini',
      frameCount: frames.length
    });

    try {
      return await this.detectWithGemini(frames, poseSequence);
    } catch (err) {
      logger.error(`LLM trick detection failed: ${err}`, { error: err });
      throw err;
    }
  }

  /**
   * Select every 4th frame from the entire frame sequence
   * This captures the complete motion arc throughout the video
   */
  private static selectKeyframes(
    frames: Array<{ imageBase64: string; frameNumber: number; timestamp: number }>
  ): Array<{ imageBase64: string; frameNumber: number; timestamp: number }> {
    const selectedFrames = [];
    for (let i = 0; i < frames.length; i += 4) {
      selectedFrames.push(frames[i]);
    }
    return selectedFrames;
  }

  /**
   * Detect trick using Google Gemini Vision
   */
  private static async detectWithGemini(
    frames: Array<{ imageBase64: string; frameNumber: number; timestamp: number }>,
    poseSequence?: Array<{ keypoints: PoseKeypoint[]; frameNumber: number }>
  ): Promise<LLMTrickDetectionResult> {
    const apiKey = this.getGeminiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    logger.info('Using Gemini for trick detection');

    const systemPrompt = `You are an expert snowboarding coach and trick analyst. Analyze the provided video frames to identify:
1. The trick being performed (e.g., 180, 360, 540, 720, etc.)
2. Rotation direction (frontside or backside) - CRITICAL: Frontside rotations spin toward the rider's front side (toe edge leads the rotation). Backside rotations spin toward the rider's back side (heel edge leads the rotation). Look at the initial stance and which edge initiates the spin.
3. Number of rotations
4. Style elements (grabs, tweaks, blind landings)
5. Difficulty level
6. Overall quality and execution

IMPORTANT: Pay close attention to the rider's initial stance and which edge (toe or heel) initiates the rotation to determine frontside vs backside.

Provide your analysis in JSON format with the following structure:
{
  "trickName": "string",
  "rotationDirection": "frontside" | "backside",
  "rotationCount": number,
  "confidence": number (0-1),
  "estimatedDifficulty": "beginner" | "intermediate" | "advanced" | "expert",
  "description": "string",
  "styleElements": {
    "hasGrab": boolean,
    "grabType": "string",
    "isTweaked": boolean,
    "isBlind": boolean
  },
  "reasoning": "string"
}`;

    const selectedFrames = this.selectKeyframes(frames);

    const userPrompt = `Analyze these snowboarding trick frames (every 4th frame from the entire video) and identify the trick:

${selectedFrames
  .map((f) => `Frame ${f.frameNumber} (${f.timestamp.toFixed(2)}s): [Image data - analyze rider position, rotation, and style]`)
  .join('\n')}

These frames span the entire video duration, capturing the complete motion arc from approach through landing.

${poseSequence ? `Pose data available: ${poseSequence.length} frames with skeletal keypoints` : ''}

Provide detailed analysis of what trick is being performed.`;

    try {
      // Select keyframes intelligently from the entire sequence
      const selectedFrames = this.selectKeyframes(frames);

      const parts: any[] = [
        {
          text: systemPrompt + '\n\n' + userPrompt
        }
      ];

      // Add selected keyframes to parts
      for (const frame of selectedFrames) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: frame.imageBase64
          }
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts
              }
            ],
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.7
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as any;
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error('No response text from Gemini API');
      }

      logger.info('Gemini response received', {
        usageMetadata: data.usageMetadata
      });

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse Gemini response as JSON');
      }

      const result = JSON.parse(jsonMatch[0]) as LLMTrickDetectionResult;

      logger.info(`Gemini detected trick: ${result.trickName}`, {
        trickName: result.trickName,
        rotationCount: result.rotationCount,
        confidence: result.confidence
      });

      return result;
    } catch (err) {
      logger.error(`Gemini API call failed: ${err}`, { error: err });
      throw err;
    }
  }

  /**
   * Log LLM analysis details
   */
  static logAnalysisDetails(result: LLMTrickDetectionResult, tokenUsage?: any): void {
    logger.info('=== LLM TRICK DETECTION ANALYSIS ===', {
      trickName: result.trickName,
      rotationDirection: result.rotationDirection,
      rotationCount: result.rotationCount,
      confidence: result.confidence,
      difficulty: result.estimatedDifficulty,
      description: result.description,
      styleElements: result.styleElements,
      reasoning: result.reasoning,
      ...(tokenUsage && { tokenUsage })
    });
  }
}
