/**
 * Detects motion phases from pose data
 * Phases: setup -> approach -> air -> landing
 */

interface PoseFrame {
  landmarks: Array<{ x: number; y: number; z: number; visibility: number }>;
  timestamp: number;
}

export class PhaseDetector {
  private frames: PoseFrame[] = [];
  private verticalVelocities: number[] = [];
  private airborneStates: boolean[] = [];

  /**
   * Add frame with pose data
   */
  addFrame(frame: PoseFrame): void {
    this.frames.push(frame);
  }

  /**
   * Calculate vertical velocity for all frames
   */
  private calculateVerticalVelocities(): void {
    this.verticalVelocities = [];

    for (let i = 0; i < this.frames.length; i++) {
      if (i === 0) {
        this.verticalVelocities.push(0);
        continue;
      }

      const current = this.frames[i];
      const previous = this.frames[i - 1];

      // Use hip landmarks (23, 24) as reference for vertical position
      const currentHipY = (current.landmarks[23]?.y + current.landmarks[24]?.y) / 2;
      const previousHipY = (previous.landmarks[23]?.y + previous.landmarks[24]?.y) / 2;

      // Negative velocity = moving up
      const velocity = previousHipY - currentHipY;
      this.verticalVelocities.push(velocity);
    }
  }

  /**
   * Detect if rider is airborne based on pose
   */
  private detectAirborneStates(): void {
    this.airborneStates = [];

    for (const frame of this.frames) {
      // Check if feet are visible and below hips (grounded)
      const leftHip = frame.landmarks[23];
      const rightHip = frame.landmarks[24];
      const leftAnkle = frame.landmarks[27];
      const rightAnkle = frame.landmarks[28];

      const hipY = (leftHip.y + rightHip.y) / 2;
      const ankleY = (leftAnkle.y + rightAnkle.y) / 2;

      // If ankles are above hips, rider is likely airborne
      const isAirborne = ankleY < hipY - 0.1; // 0.1 threshold for noise
      this.airborneStates.push(isAirborne);
    }
  }

  /**
   * Detect phase transitions
   */
  detectPhases(): Array<{
    phase: 'setup' | 'approach' | 'air' | 'landing';
    startFrame: number;
    endFrame: number;
  }> {
    this.calculateVerticalVelocities();
    this.detectAirborneStates();

    const phases: Array<{
      phase: 'setup' | 'approach' | 'air' | 'landing';
      startFrame: number;
      endFrame: number;
    }> = [];

    let currentPhase: 'setup' | 'approach' | 'air' | 'landing' = 'setup';
    let phaseStart = 0;
    const velocityThreshold = 0.02; // Threshold for detecting upward motion

    for (let i = 0; i < this.frames.length; i++) {
      const velocity = this.verticalVelocities[i];
      const isAirborne = this.airborneStates[i];

      let nextPhase: 'setup' | 'approach' | 'air' | 'landing';

      if (isAirborne) {
        nextPhase = 'air';
      } else if (velocity < -velocityThreshold) {
        nextPhase = 'approach';
      } else {
        nextPhase = 'setup';
      }

      // Detect landing (transition from air to setup)
      if (currentPhase === 'air' && nextPhase !== 'air') {
        nextPhase = 'landing';
      }

      if (nextPhase !== currentPhase) {
        if (i > phaseStart) {
          phases.push({
            phase: currentPhase,
            startFrame: phaseStart,
            endFrame: i - 1,
          });
        }
        currentPhase = nextPhase;
        phaseStart = i;
      }
    }

    // Add final phase
    if (phaseStart < this.frames.length) {
      phases.push({
        phase: currentPhase,
        startFrame: phaseStart,
        endFrame: this.frames.length - 1,
      });
    }

    return phases;
  }

  /**
   * Get vertical velocity at frame
   */
  getVerticalVelocity(frameIndex: number): number {
    return this.verticalVelocities[frameIndex] || 0;
  }

  /**
   * Get airborne state at frame
   */
  isAirborne(frameIndex: number): boolean {
    return this.airborneStates[frameIndex] || false;
  }
}
