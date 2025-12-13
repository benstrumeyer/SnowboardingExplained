import logger from '../logger';
import { BiomechanicalMetrics, PoseKeypoint } from '../types';

/**
 * Analysis Logger Utility
 * Logs detailed information about LLM analysis, API calls, and detected shapes/metrics
 */
export class AnalysisLogger {
  /**
   * Log LLM API call details
   */
  static logLLMApiCall(
    provider: 'openai' | 'anthropic',
    model: string,
    inputTokens: number,
    outputTokens: number,
    estimatedCost: number,
    responseTime: number
  ): void {
    logger.info(`=== LLM API CALL ===`, {
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: `$${estimatedCost.toFixed(6)}`,
      responseTime: `${responseTime}ms`
    });
  }

  /**
   * Log detected shapes and features
   */
  static logDetectedShapes(
    videoId: string,
    metrics: BiomechanicalMetrics,
    frameNumber: number
  ): void {
    logger.info(`=== DETECTED SHAPES & FEATURES (Frame ${frameNumber}) ===`, {
      videoId,
      headGaze: metrics.headGaze.direction,
      bodyStack: {
        isStacked: metrics.bodyStack.isStacked,
        weightDistribution: metrics.bodyStack.weightDistribution,
        edge: metrics.bodyStack.edge,
        alignment: metrics.bodyStack.alignment
      },
      legBend: {
        left: `${metrics.legBend.leftKneeBend.toFixed(1)}°`,
        right: `${metrics.legBend.rightKneeBend.toFixed(1)}°`,
        average: `${metrics.legBend.averageBend.toFixed(1)}°`,
        isStraightLegs: metrics.legBend.isStraightLegs
      },
      upperBodyRotation: {
        rotation: metrics.upperBodyRotation.rotation,
        degrees: `${metrics.upperBodyRotation.degreesSeparation.toFixed(1)}°`
      },
      lowerBodyRotation: {
        rotation: metrics.lowerBodyRotation.rotation,
        degrees: `${metrics.lowerBodyRotation.degreesSeparation.toFixed(1)}°`
      },
      spinAxis: {
        axis: metrics.spinAxis.axis,
        alignment: `${metrics.spinAxis.axisAlignment.toFixed(0)}%`,
        description: metrics.spinAxis.description
      },
      edgeType: metrics.edgeType,
      boardAngle: `${metrics.boardAngle.toFixed(1)}°`,
      rotationCount: metrics.rotationCount,
      rotationDirection: metrics.rotationDirection
    });
  }

  /**
   * Log pose keypoints
   */
  static logPoseKeypoints(videoId: string, keypoints: PoseKeypoint[], frameNumber: number): void {
    const keypointSummary = keypoints
      .filter(kp => kp.confidence > 0.5)
      .map(kp => ({
        name: kp.name,
        position: `(${kp.x.toFixed(0)}, ${kp.y.toFixed(0)})`,
        confidence: `${(kp.confidence * 100).toFixed(0)}%`
      }));

    logger.debug(`=== POSE KEYPOINTS (Frame ${frameNumber}) ===`, {
      videoId,
      totalKeypoints: keypoints.length,
      confidenceThreshold: '> 0.5',
      detectedKeypoints: keypointSummary.length,
      keypoints: keypointSummary
    });
  }

  /**
   * Log phase analysis
   */
  static logPhaseAnalysis(
    videoId: string,
    phaseName: string,
    frameRange: { start: number; end: number },
    requirements: Array<{ requirement: string; met: boolean }>,
    issues: Array<{ issue: string; severity: string }>
  ): void {
    const metRequirements = requirements.filter(r => r.met).length;
    const totalRequirements = requirements.length;

    logger.info(`=== PHASE ANALYSIS: ${phaseName.toUpperCase()} ===`, {
      videoId,
      frameRange: `${frameRange.start}-${frameRange.end}`,
      requirementsMet: `${metRequirements}/${totalRequirements}`,
      issuesFound: issues.length,
      requirements: requirements.map(r => ({
        requirement: r.requirement,
        met: r.met ? '✅' : '❌'
      })),
      issues: issues.map(i => ({
        issue: i.issue,
        severity: i.severity
      }))
    });
  }

  /**
   * Log trick detection summary
   */
  static logTrickDetectionSummary(
    videoId: string,
    trickName: string,
    rotationCount: number,
    rotationDirection: string,
    confidence: number,
    difficulty: string,
    styleElements: any
  ): void {
    logger.info(`=== TRICK DETECTION SUMMARY ===`, {
      videoId,
      trickName,
      rotationCount: `${rotationCount.toFixed(1)} rotations`,
      rotationDirection,
      confidence: `${(confidence * 100).toFixed(0)}%`,
      difficulty,
      styleElements: {
        grab: styleElements.hasGrab ? `${styleElements.grabType}` : 'none',
        tweaked: styleElements.isTweaked ? 'yes' : 'no',
        blind: styleElements.isBlind ? 'yes' : 'no'
      }
    });
  }

  /**
   * Log video processing pipeline
   */
  static logProcessingPipeline(
    videoId: string,
    filename: string,
    duration: number,
    frameCount: number,
    processingTime: number
  ): void {
    logger.info(`=== VIDEO PROCESSING PIPELINE ===`, {
      videoId,
      filename,
      duration: `${duration.toFixed(2)}s`,
      frameCount,
      fps: `${(frameCount / duration).toFixed(1)}`,
      totalProcessingTime: `${processingTime}ms`,
      avgTimePerFrame: `${(processingTime / frameCount).toFixed(2)}ms`
    });
  }

  /**
   * Log cost analysis
   */
  static logCostAnalysis(
    videoId: string,
    provider: string,
    inputTokens: number,
    outputTokens: number,
    estimatedCost: number
  ): void {
    const costPerInputToken = provider === 'openai' ? 0.00003 : 0.003 / 1000;
    const costPerOutputToken = provider === 'openai' ? 0.00006 : 0.015 / 1000;

    logger.info(`=== COST ANALYSIS ===`, {
      videoId,
      provider,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costPerInputToken: `$${costPerInputToken.toFixed(8)}`,
      costPerOutputToken: `$${costPerOutputToken.toFixed(8)}`,
      estimatedCost: `$${estimatedCost.toFixed(6)}`,
      costPerFrame: `$${(estimatedCost / (inputTokens + outputTokens)).toFixed(8)}`
    });
  }

  /**
   * Log error with context
   */
  static logAnalysisError(
    videoId: string,
    stage: string,
    error: Error,
    context?: any
  ): void {
    logger.error(`Analysis error at stage: ${stage}`, {
      videoId,
      stage,
      error: error.message,
      stack: error.stack,
      context
    });
  }

  /**
   * Log performance metrics
   */
  static logPerformanceMetrics(
    videoId: string,
    metrics: {
      frameExtractionTime: number;
      poseEstimationTime: number;
      llmAnalysisTime: number;
      totalTime: number;
    }
  ): void {
    logger.info(`=== PERFORMANCE METRICS ===`, {
      videoId,
      frameExtractionTime: `${metrics.frameExtractionTime}ms`,
      poseEstimationTime: `${metrics.poseEstimationTime}ms`,
      llmAnalysisTime: `${metrics.llmAnalysisTime}ms`,
      totalTime: `${metrics.totalTime}ms`,
      breakdown: {
        frameExtraction: `${((metrics.frameExtractionTime / metrics.totalTime) * 100).toFixed(1)}%`,
        poseEstimation: `${((metrics.poseEstimationTime / metrics.totalTime) * 100).toFixed(1)}%`,
        llmAnalysis: `${((metrics.llmAnalysisTime / metrics.totalTime) * 100).toFixed(1)}%`
      }
    });
  }
}
