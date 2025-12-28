import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
// TODO: These functions need to be implemented or imported from actual services
// import { poseEstimation } from './poseEstimation';
// import { featureExtraction } from './featureExtraction';

// Stub implementations for testing
async function poseEstimation(framePath: string): Promise<any> {
  return { landmarks: [] };
}

async function featureExtraction(pose: any): Promise<any> {
  return { isAirborne: false };
}

interface FrameData {
  frameIndex: number;
  timestamp: number;
  imagePath: string;
  poseData?: any;
  verticalVelocity?: number;
  isAirborne?: boolean;
}

interface AnalysisPhase {
  name: 'setup' | 'approach' | 'air' | 'landing';
  startFrame: number;
  endFrame: number;
  framesToSend: FrameData[];
}

interface GeminiBatch {
  frames: FrameData[];
  phase: AnalysisPhase['name'];
  batchIndex: number;
}

export class VideoAnalysisPipeline {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private videoPath: string;
  private outputDir: string;
  private allFrames: FrameData[] = [];
  private phases: AnalysisPhase[] = [];
  private testingMode: boolean = false;
  private testFrameIndex?: number;

  constructor(videoPath: string, outputDir: string, testingMode: boolean = false, testFrameIndex?: number) {
    this.videoPath = videoPath;
    this.outputDir = outputDir;
    this.testingMode = testingMode;
    this.testFrameIndex = testFrameIndex;
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Extract all frames from video using FFmpeg
   */
  async extractAllFrames(): Promise<void> {
    console.log('Extracting frames from video...');
    const framePattern = path.join(this.outputDir, 'frame_%06d.jpg');

    try {
      execSync(
        `ffmpeg -i "${this.videoPath}" -q:v 2 "${framePattern}" -hide_banner -loglevel error`,
        { stdio: 'inherit' }
      );
      console.log('Frame extraction complete');
    } catch (error) {
      console.error('FFmpeg extraction failed:', error);
      throw error;
    }
  }

  /**
   * Run pose estimation on all frames
   */
  async runPoseEstimationOnAllFrames(): Promise<void> {
    console.log('Running pose estimation on all frames...');

    const frameFiles = fs
      .readdirSync(this.outputDir)
      .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
      .sort();

    for (let i = 0; i < frameFiles.length; i++) {
      const framePath = path.join(this.outputDir, frameFiles[i]);
      const frameIndex = i;
      const timestamp = frameIndex / 30; // Assuming 30fps

      try {
        const pose = await poseEstimation(framePath);
        const features = await featureExtraction(pose);

        this.allFrames.push({
          frameIndex,
          timestamp,
          imagePath: framePath,
          poseData: pose,
          verticalVelocity: this.calculateVerticalVelocity(i),
          isAirborne: features.isAirborne,
        });

        if ((i + 1) % 50 === 0) {
          console.log(`Processed ${i + 1}/${frameFiles.length} frames`);
        }
      } catch (error) {
        console.error(`Failed to process frame ${i}:`, error);
      }
    }

    console.log(`Pose estimation complete. Processed ${this.allFrames.length} frames`);
  }

  /**
   * Detect motion phases based on vertical velocity
   */
  private detectPhases(): void {
    console.log('Detecting motion phases...');

    const velocityThreshold = 0.5; // Threshold for detecting upward motion
    let currentPhase: AnalysisPhase['name'] = 'setup';
    let phaseStart = 0;

    for (let i = 0; i < this.allFrames.length; i++) {
      const frame = this.allFrames[i];
      const nextPhase = this.determinePhase(frame, velocityThreshold);

      if (nextPhase !== currentPhase) {
        if (currentPhase !== 'setup') {
          this.phases.push({
            name: currentPhase,
            startFrame: phaseStart,
            endFrame: i - 1,
            framesToSend: [],
          });
        }
        currentPhase = nextPhase;
        phaseStart = i;
      }
    }

    // Add final phase
    this.phases.push({
      name: currentPhase,
      startFrame: phaseStart,
      endFrame: this.allFrames.length - 1,
      framesToSend: [],
    });

    console.log(`Detected ${this.phases.length} phases:`, this.phases.map((p) => p.name));
  }

  /**
   * Determine phase based on vertical velocity and airborne status
   */
  private determinePhase(frame: FrameData, threshold: number): AnalysisPhase['name'] {
    if (!frame.isAirborne && (frame.verticalVelocity || 0) < threshold) {
      return 'setup';
    }
    if (!frame.isAirborne && (frame.verticalVelocity || 0) >= threshold) {
      return 'approach';
    }
    if (frame.isAirborne) {
      return 'air';
    }
    return 'landing';
  }

  /**
   * Calculate vertical velocity (simplified - based on pose Y changes)
   */
  private calculateVerticalVelocity(frameIndex: number): number {
    if (frameIndex === 0 || !this.allFrames[frameIndex - 1]) return 0;

    const current = this.allFrames[frameIndex];
    const previous = this.allFrames[frameIndex - 1];

    if (!current.poseData?.landmarks || !previous.poseData?.landmarks) return 0;

    // Use hip Y position as reference
    const currentHipY = current.poseData.landmarks[23]?.y || 0;
    const previousHipY = previous.poseData.landmarks[23]?.y || 0;

    return previousHipY - currentHipY; // Negative = moving up
  }

  /**
   * Select frames to send to Gemini based on phase
   */
  private selectFramesForGemini(): void {
    console.log('Selecting frames for Gemini analysis...');

    for (const phase of this.phases) {
      const phaseFrames = this.allFrames.slice(phase.startFrame, phase.endFrame + 1);
      const phaseLength = phaseFrames.length;

      if (phase.name === 'setup') {
        // Sparse sampling: 1 frame every 8-10 seconds
        phase.framesToSend = this.sampleFrames(phaseFrames, Math.ceil(phaseLength / 10));
      } else if (phase.name === 'approach') {
        // Medium sampling: 1 frame every 2-4 seconds
        phase.framesToSend = this.sampleFrames(phaseFrames, Math.ceil(phaseLength / 5));
      } else if (phase.name === 'air') {
        // Dense sampling: every other frame
        phase.framesToSend = this.sampleFrames(phaseFrames, Math.ceil(phaseLength / 2));
      } else if (phase.name === 'landing') {
        // Stop after landing
        phase.framesToSend = [];
      }
    }

    const totalFramesToSend = this.phases.reduce((sum, p) => sum + p.framesToSend.length, 0);
    console.log(`Selected ${totalFramesToSend} frames for Gemini analysis`);
  }

  /**
   * Sample frames evenly from a set
   */
  private sampleFrames(frames: FrameData[], targetCount: number): FrameData[] {
    if (frames.length <= targetCount) return frames;

    const sampled: FrameData[] = [];
    const step = frames.length / targetCount;

    for (let i = 0; i < targetCount; i++) {
      const index = Math.floor(i * step);
      sampled.push(frames[index]);
    }

    return sampled;
  }

  /**
   * Create batches of frames for Gemini (4-5 frames per batch)
   */
  private createGeminiBatches(): GeminiBatch[] {
    const batches: GeminiBatch[] = [];
    const batchSize = 4;
    let batchIndex = 0;

    for (const phase of this.phases) {
      if (phase.framesToSend.length === 0) continue;

      for (let i = 0; i < phase.framesToSend.length; i += batchSize) {
        const batchFrames = phase.framesToSend.slice(i, i + batchSize);
        batches.push({
          frames: batchFrames,
          phase: phase.name,
          batchIndex: batchIndex++,
        });
      }
    }

    console.log(`Created ${batches.length} batches for Gemini`);
    return batches;
  }

  /**
   * Send batch to Gemini for analysis
   */
  async analyzeBatchWithGemini(batch: GeminiBatch): Promise<string> {
    console.log(
      `Analyzing batch ${batch.batchIndex} (${batch.frames.length} frames, phase: ${batch.phase})...`
    );

    const content: any[] = [];

    // Add context about the phase
    const phaseContext = {
      setup: 'Rider is on the slope, building speed and preparing for the jump.',
      approach: 'Rider is approaching the jump, transitioning edges and winding up for takeoff.',
      air: 'Rider is in the air, spinning and performing the trick.',
      landing: 'Rider is landing the trick.',
    };

    content.push({
      type: 'text',
      text: `Analyze this snowboarding trick sequence. Phase: ${batch.phase}. Context: ${phaseContext[batch.phase]}. 
      
      Describe:
      1. Body position and rotation angle
      2. Technique quality (edge control, weight distribution, alignment)
      3. Timing and flow
      4. Any issues or improvements needed`,
    });

    // Add images
    for (const frame of batch.frames) {
      const imageData = fs.readFileSync(frame.imagePath);
      const base64 = imageData.toString('base64');

      content.push({
        type: 'image',
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64,
        },
      });

      content.push({
        type: 'text',
        text: `Frame ${frame.frameIndex} (${frame.timestamp.toFixed(2)}s)`,
      });
    }

    try {
      const response = await this.model.generateContent(content);
      const text = response.response.text();
      return text;
    } catch (error) {
      console.error(`Batch ${batch.batchIndex} analysis failed:`, error);
      throw error;
    }
  }

  /**
   * Testing mode: Analyze single frame with pose visualization
   */
  async analyzeTestFrame(): Promise<any> {
    if (!this.testingMode) {
      throw new Error('Testing mode not enabled');
    }

    console.log('Starting testing mode - single frame analysis...');

    // Step 1: Extract all frames
    await this.extractAllFrames();

    // Step 2: Get the test frame (default to middle frame or specified index)
    const frameFiles = fs
      .readdirSync(this.outputDir)
      .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
      .sort();

    const frameIndex = this.testFrameIndex ?? Math.floor(frameFiles.length / 2);
    if (frameIndex >= frameFiles.length) {
      throw new Error(`Frame index ${frameIndex} out of range (${frameFiles.length} frames)`);
    }

    const framePath = path.join(this.outputDir, frameFiles[frameIndex]);
    const timestamp = frameIndex / 30; // Assuming 30fps

    console.log(`Testing with frame ${frameIndex} (${timestamp.toFixed(2)}s): ${frameFiles[frameIndex]}`);

    // Step 3: Run pose estimation on test frame
    const pose = await poseEstimation(framePath);
    const features = await featureExtraction(pose);

    const testFrame: FrameData = {
      frameIndex,
      timestamp,
      imagePath: framePath,
      poseData: pose,
      verticalVelocity: 0,
      isAirborne: features.isAirborne,
    };

    // Step 4: Create visualization with pose overlay
    const visualizationPath = await this.createPoseVisualization(testFrame);
    console.log(`Pose visualization saved to: ${visualizationPath}`);

    // Step 5: Send single frame to Gemini
    const batch: GeminiBatch = {
      frames: [testFrame],
      phase: 'air',
      batchIndex: 0,
    };

    const analysis = await this.analyzeBatchWithGemini(batch);

    console.log('Testing mode analysis complete');
    return {
      frameIndex,
      timestamp,
      framePath,
      visualizationPath,
      poseData: pose,
      features,
      geminAnalysis: analysis,
    };
  }

  /**
   * Create pose visualization overlay on frame
   */
  private async createPoseVisualization(frame: FrameData): Promise<string> {
    const sharp = require('sharp');
    const { createCanvas, loadImage } = require('canvas');

    const outputPath = path.join(this.outputDir, `pose_visualization_frame_${frame.frameIndex}.png`);

    try {
      // Load the original frame
      const image = await loadImage(frame.imagePath);
      const width = image.width;
      const height = image.height;

      // Create canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Draw original image
      ctx.drawImage(image, 0, 0);

      // Draw pose skeleton
      if (frame.poseData?.landmarks) {
        this.drawSkeletonOnCanvas(ctx, frame.poseData.landmarks);
      }

      // Save visualization
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outputPath, buffer);

      return outputPath;
    } catch (error) {
      console.error('Failed to create pose visualization:', error);
      throw error;
    }
  }

  /**
   * Draw skeleton on canvas
   */
  private drawSkeletonOnCanvas(ctx: any, landmarks: any[]): void {
    const connections = [
      [11, 12], // shoulders
      [11, 13], // left shoulder to elbow
      [13, 15], // left elbow to wrist
      [12, 14], // right shoulder to elbow
      [14, 16], // right elbow to wrist
      [11, 23], // left shoulder to hip
      [12, 24], // right shoulder to hip
      [23, 24], // hips
      [23, 25], // left hip to knee
      [25, 27], // left knee to ankle
      [24, 26], // right hip to knee
      [26, 28], // right knee to ankle
    ];

    // Draw connections
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 3;

    for (const [start, end] of connections) {
      const startLm = landmarks[start];
      const endLm = landmarks[end];

      if (startLm && endLm && startLm.visibility > 0.5 && endLm.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startLm.x, startLm.y);
        ctx.lineTo(endLm.x, endLm.y);
        ctx.stroke();
      }
    }

    // Draw keypoints
    ctx.fillStyle = '#00FF00';
    for (const landmark of landmarks) {
      if (landmark.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(landmark.x, landmark.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  /**
   * Run full analysis pipeline
   */
  async analyze(): Promise<any> {
    console.log('Starting video analysis pipeline...');

    // Step 1: Extract frames
    await this.extractAllFrames();

    // Step 2: Run pose estimation
    await this.runPoseEstimationOnAllFrames();

    // Step 3: Detect phases
    this.detectPhases();

    // Step 4: Select frames for Gemini
    this.selectFramesForGemini();

    // Step 5: Create batches
    const batches = this.createGeminiBatches();

    // Step 6: Analyze batches with Gemini
    const results: any[] = [];
    for (const batch of batches) {
      try {
        const analysis = await this.analyzeBatchWithGemini(batch);
        results.push({
          batchIndex: batch.batchIndex,
          phase: batch.phase,
          frameCount: batch.frames.length,
          analysis,
        });

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to analyze batch ${batch.batchIndex}:`, error);
      }
    }

    console.log('Video analysis complete');
    return {
      totalFrames: this.allFrames.length,
      phases: this.phases,
      batchesAnalyzed: results.length,
      results,
    };
  }
}
