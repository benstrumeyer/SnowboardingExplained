import logger from '../logger';
import { PoseKeypoint } from '../types';

export interface SnowboardingFeatureAnalysis {
  rotationAngle: number;
  rotationDirection: 'frontside' | 'backside' | 'unknown';
  edgeEngaged: 'toe' | 'heel' | 'both' | 'unknown';
  stance: 'regular' | 'switch' | 'unknown';
  grabType: string | null;
  airtimeMs: number;
  bodyPosition: {
    isTweaked: boolean;
    isBlind: boolean;
    spinAxis: 'vertical' | 'forward' | 'lateral' | 'unknown';
  };
  confidence: number;
}

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
  featureAnalysis?: SnowboardingFeatureAnalysis;
}

/**
 * LLM-Based Trick Detection Service
 * Uses Google Gemini to analyze video frames and detect tricks
 */
export class LLMTrickDetectionService {
  // Frame sampling interval for analysis (every N frames)
  private static readonly FRAME_SAMPLE_INTERVAL = 50;

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
   * Select frames at regular intervals from the entire frame sequence
   * This captures the complete motion arc throughout the video
   */
  private static selectKeyframes(
    frames: Array<{ imageBase64: string; frameNumber: number; timestamp: number }>
  ): Array<{ imageBase64: string; frameNumber: number; timestamp: number }> {
    const selectedFrames: Array<{ imageBase64: string; frameNumber: number; timestamp: number }> = [];
    for (let i = 0; i < frames.length; i += this.FRAME_SAMPLE_INTERVAL) {
      selectedFrames.push(frames[i]);
    }
    return selectedFrames;
  }

  /**
   * Build a structured snowboarding analysis prompt
   */
  private static buildSnowboardingPrompt(features: SnowboardingFeatureAnalysis): string {
    return `SNOWBOARDING MECHANICS ANALYSIS:

Rotation:
- Angle: ${features.rotationAngle}°
- Direction: ${features.rotationDirection}
- Explanation: ${features.rotationDirection === 'frontside' ? 'Rider rotates toward toe edge' : features.rotationDirection === 'backside' ? 'Rider rotates toward heel edge' : 'Unable to determine'}

Stance & Edge:
- Stance: ${features.stance}
- Edge Engaged: ${features.edgeEngaged}

Style Elements:
- Grab: ${features.grabType || 'none'}
- Tweaked: ${features.bodyPosition.isTweaked ? 'yes' : 'no'}
- Blind: ${features.bodyPosition.isBlind ? 'yes' : 'no'}
- Spin Axis: ${features.bodyPosition.spinAxis}

Airtime: ${features.airtimeMs}ms

Based on these mechanics, identify the trick. Consider:
1. Rotation angle determines spin count (180°, 360°, 540°, 720°, etc.)
2. Rotation direction + stance determines trick name (frontside/backside + regular/switch)
3. Style elements add modifiers (grab type, tweaked, blind)
4. Airtime and execution quality determine difficulty`;
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

    // Build feature analysis from available data
    const featureAnalysis: SnowboardingFeatureAnalysis = {
      rotationAngle: 0,
      rotationDirection: 'unknown',
      edgeEngaged: 'unknown',
      stance: 'unknown',
      grabType: null,
      airtimeMs: 0,
      bodyPosition: {
        isTweaked: false,
        isBlind: false,
        spinAxis: 'unknown',
      },
      confidence: 0,
    };

    const systemPrompt = `You are an expert snowboarding coach and trick analyst. You will analyze video frames using structured snowboarding mechanics.

SNOWBOARDING TRICK CLASSIFICATION:

Tricks are identified by:
1. ROTATION ANGLE (determines spin count):
   - 180° = 180 (half rotation)
   - 360° = 360 (full rotation)
   - 540° = 540 (1.5 rotations)
   - 720° = 720 (2 full rotations)

2. ROTATION DIRECTION (frontside vs backside):
   - FRONTSIDE: Rider rotates toward their toe edge (front of body leads)
   - BACKSIDE: Rider rotates toward their heel edge (back of body leads)

3. STANCE (regular vs switch):
   - REGULAR: Left foot forward
   - SWITCH: Right foot forward

4. STYLE ELEMENTS:
   - GRAB: indy, melon, tail, nose, etc.
   - TWEAKED: Exaggerated body arch
   - BLIND: Looking away from landing

TRICK NAMING CONVENTION:
[ROTATION_DIRECTION] [ROTATION_COUNT] [+ GRAB] [+ TWEAKED] [+ BLIND]

Examples:
- Frontside 360 = 360° rotation toward toe edge
- Backside 540 indy = 540° rotation toward heel edge with indy grab
- Switch frontside 180 tweaked = 180° rotation from switch stance, tweaked

Provide your analysis in JSON format:
{
  "trickName": "string (e.g., 'Frontside 360', 'Backside 540 Indy')",
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

    const userPrompt = `Analyze these snowboarding trick frames (every ${this.FRAME_SAMPLE_INTERVAL}th frame) and identify the trick:

${selectedFrames
  .map((f) => `Frame ${f.frameNumber} (${f.timestamp.toFixed(2)}s): [Image data - analyze rider position, rotation, and style]`)
  .join('\n')}

ANALYSIS FRAMEWORK:
${this.buildSnowboardingPrompt(featureAnalysis)}

${poseSequence ? `\nPose data available: ${poseSequence.length} frames with skeletal keypoints for precise analysis` : ''}

Analyze the frames using the snowboarding mechanics framework above. Identify:
1. Rotation angle and direction
2. Stance (regular or switch)
3. Edge engagement
4. Any style elements (grabs, tweaks, blind)
5. The complete trick name

Provide your analysis in the specified JSON format.`;

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
      
      // Attach feature analysis to result
      result.featureAnalysis = featureAnalysis;

      logger.info(`Gemini detected trick: ${result.trickName}`, {
        trickName: result.trickName,
        rotationCount: result.rotationCount,
        rotationDirection: result.rotationDirection,
        confidence: result.confidence,
        styleElements: result.styleElements
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
