/**
 * MCP Tools for Pose Data Retrieval
 * Lightweight data retrieval endpoints for LLM to query pre-computed pose data
 */

import { Db } from 'mongodb';
import { getVideoAnalysisCollection } from '../db/formAnalysisSchemas';
import {
  PoseFrame,
  KeyMomentPoses,
  PhasePoses,
  MCPToolError,
} from '../../../types/formAnalysis';

/**
 * Get pose data for a specific frame
 */
export async function getPoseAtFrame(
  db: Db,
  videoId: string,
  frameNumber: number
): Promise<PoseFrame | MCPToolError> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = await collection.findOne({ videoId });

    if (!video) {
      return {
        code: 'VIDEO_NOT_FOUND',
        message: `Video ${videoId} not found`,
      };
    }

    const pose = video.poseTimeline.find((p: PoseFrame) => p.frameNumber === frameNumber);

    if (!pose) {
      return {
        code: 'FRAME_NOT_FOUND',
        message: `Frame ${frameNumber} not found in video ${videoId}`,
        availableOptions: {
          totalFrames: video.poseTimeline.length,
          frameRange: [0, video.poseTimeline.length - 1],
        },
      };
    }

    return pose;
  } catch (error) {
    return {
      code: 'DATABASE_ERROR',
      message: `Error retrieving pose data: ${error}`,
    };
  }
}

/**
 * Get pose data for a range of frames
 */
export async function getPosesInRange(
  db: Db,
  videoId: string,
  startFrame: number,
  endFrame: number
): Promise<PoseFrame[] | MCPToolError> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = await collection.findOne({ videoId });

    if (!video) {
      return {
        code: 'VIDEO_NOT_FOUND',
        message: `Video ${videoId} not found`,
      };
    }

    // Warn if range is too large
    if (endFrame - startFrame > 50) {
      console.warn(
        `Large frame range requested (${endFrame - startFrame} frames). Consider sampling.`
      );
    }

    const poses = video.poseTimeline.filter(
      (p: PoseFrame) => p.frameNumber >= startFrame && p.frameNumber <= endFrame
    );

    return poses;
  } catch (error) {
    return {
      code: 'DATABASE_ERROR',
      message: `Error retrieving pose range: ${error}`,
    };
  }
}

/**
 * Get all poses for a specific phase
 */
export async function getPhasePoses(
  db: Db,
  videoId: string,
  phaseName: string
): Promise<PhasePoses | MCPToolError> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = await collection.findOne({ videoId });

    if (!video) {
      return {
        code: 'VIDEO_NOT_FOUND',
        message: `Video ${videoId} not found`,
      };
    }

    // Get phase data
    const phase = (video.phases.phases as any)[phaseName];

    if (!phase) {
      return {
        code: 'PHASE_NOT_FOUND',
        message: `Phase ${phaseName} not found in video ${videoId}`,
        availableOptions: {
          availablePhases: Object.keys(video.phases.phases).filter((p) => p !== null),
        },
      };
    }

    // Get poses for this phase
    const poses = video.poseTimeline.filter(
      (p: PoseFrame) => p.frameNumber >= phase.startFrame && p.frameNumber <= phase.endFrame
    );

    // Identify key moments in this phase
    const keyMoments = [];
    if (phaseName === 'takeoff') {
      keyMoments.push({
        name: 'takeoff',
        frame: phase.startFrame,
        description: 'Exact moment board leaves lip',
      });
    } else if (phaseName === 'air') {
      // Find peak height
      const peakFrame = poses.reduce((maxFrame: PoseFrame, curr: PoseFrame) => {
        const currHip = curr.joints3D.find((j) => j.name === 'left_hip');
        const maxHip = maxFrame.joints3D.find((j) => j.name === 'left_hip');
        return currHip && maxHip && currHip.position.y > maxHip.position.y ? curr : maxFrame;
      });
      keyMoments.push({
        name: 'peak_height',
        frame: peakFrame.frameNumber,
        description: 'Highest point in air',
      });
    } else if (phaseName === 'landing') {
      keyMoments.push({
        name: 'landing',
        frame: phase.startFrame,
        description: 'Board first contacts landing surface',
      });
    }

    return {
      phaseName,
      startFrame: phase.startFrame,
      endFrame: phase.endFrame,
      frameCount: poses.length,
      poses,
      keyMoments,
    };
  } catch (error) {
    return {
      code: 'DATABASE_ERROR',
      message: `Error retrieving phase poses: ${error}`,
    };
  }
}

/**
 * Get key moment poses (takeoff, peak height, landing, etc.)
 */
export async function getKeyMomentPoses(
  db: Db,
  videoId: string
): Promise<KeyMomentPoses | MCPToolError> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = await collection.findOne({ videoId });

    if (!video) {
      return {
        code: 'VIDEO_NOT_FOUND',
        message: `Video ${videoId} not found`,
      };
    }

    const moments = [];

    // Takeoff moment
    const takeoffPhase = video.phases.phases.takeoff;
    if (takeoffPhase) {
      const pose = video.poseTimeline.find(
        (p: PoseFrame) => p.frameNumber === takeoffPhase.startFrame
      );
      if (pose) {
        moments.push({
          name: 'takeoff',
          frame: takeoffPhase.startFrame,
          timestamp: pose.timestamp,
          phase: 'takeoff',
          pose,
          description: 'Board leaves lip - critical moment for pop analysis',
        });
      }
    }

    // Peak height (air phase)
    const airPhase = video.phases.phases.air;
    if (airPhase) {
      const airPoses = video.poseTimeline.filter(
        (p: PoseFrame) => p.frameNumber >= airPhase.startFrame && p.frameNumber <= airPhase.endFrame
      );
      if (airPoses.length > 0) {
        const peakPose = airPoses.reduce((maxPose: PoseFrame, curr: PoseFrame) => {
          const currHip = curr.joints3D.find((j) => j.name === 'left_hip');
          const maxHip = maxPose.joints3D.find((j) => j.name === 'left_hip');
          return currHip && maxHip && currHip.position.y > maxHip.position.y ? curr : maxPose;
        });
        moments.push({
          name: 'peak_height',
          frame: peakPose.frameNumber,
          timestamp: peakPose.timestamp,
          phase: 'air',
          pose: peakPose,
          description: 'Highest point in air - body position and rotation analysis',
        });
      }
    }

    // Landing moment
    const landingPhase = video.phases.phases.landing;
    if (landingPhase) {
      const pose = video.poseTimeline.find(
        (p: PoseFrame) => p.frameNumber === landingPhase.startFrame
      );
      if (pose) {
        moments.push({
          name: 'landing',
          frame: landingPhase.startFrame,
          timestamp: pose.timestamp,
          phase: 'landing',
          pose,
          description: 'Board contacts landing - absorption and stability analysis',
        });
      }
    }

    // Max wind up (if applicable)
    const windUpPhase = video.phases.phases.windUp;
    if (windUpPhase) {
      const windUpPoses = video.poseTimeline.filter(
        (p: PoseFrame) =>
          p.frameNumber >= windUpPhase.startFrame && p.frameNumber <= windUpPhase.endFrame
      );
      if (windUpPoses.length > 0) {
        // Find frame with max chest rotation
        const maxWindUpPose = windUpPoses[windUpPoses.length - 1]; // Last frame of windup
        moments.push({
          name: 'max_wind_up',
          frame: maxWindUpPose.frameNumber,
          timestamp: maxWindUpPose.timestamp,
          phase: 'windUp',
          pose: maxWindUpPose,
          description: 'Maximum wind up position - rotational tension analysis',
        });
      }
    }

    return {
      videoId,
      moments,
    };
  } catch (error) {
    return {
      code: 'DATABASE_ERROR',
      message: `Error retrieving key moment poses: ${error}`,
    };
  }
}
