/**
 * MCP Tools: Body Awareness
 * Task 16: Body awareness tools for LLM data retrieval
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Db } from 'mongodb';
import {
  runAllBodyChecks,
  isArmsTowardTail,
  isChestWoundUp,
  isBodyStacked,
  isKneesBent,
  isChestOpen,
  isHipsOpening,
} from '../../src/services/bodyAwarenessLibrary';
import { getVideoAnalysisCollection } from '../src/db/formAnalysisSchemas';

export function getBodyAwarenessTools(): Tool[] {
  return [
    {
      name: 'get_body_position_check',
      description: 'Run a specific body position check on a frame',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: {
            type: 'string',
            description: 'Video ID',
          },
          frame: {
            type: 'number',
            description: 'Frame number',
          },
          checkType: {
            type: 'string',
            description:
              'Type of check: arms_toward_tail, chest_wound_up, body_stacked, knees_bent, chest_open, hips_opening',
          },
        },
        required: ['videoId', 'frame', 'checkType'],
      },
    },
    {
      name: 'get_all_body_checks',
      description: 'Run all body awareness checks on a frame',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: {
            type: 'string',
            description: 'Video ID',
          },
          frame: {
            type: 'number',
            description: 'Frame number',
          },
        },
        required: ['videoId', 'frame'],
      },
    },
  ];
}

/**
 * Get specific body position check
 */
export async function getBodyPositionCheck(
  db: Db,
  videoId: string,
  frame: number,
  checkType: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = await collection.findOne({ videoId });

    if (!video) {
      return {
        success: false,
        error: `Video ${videoId} not found`,
      };
    }

    const poseTimeline = (video as any).poseTimeline;
    if (!poseTimeline || !poseTimeline[frame]) {
      return {
        success: false,
        error: `Frame ${frame} not found`,
      };
    }

    const pose = poseTimeline[frame];

    let result;
    switch (checkType) {
      case 'arms_toward_tail':
        result = isArmsTowardTail(pose);
        break;
      case 'chest_wound_up':
        result = isChestWoundUp(pose);
        break;
      case 'body_stacked':
        result = isBodyStacked(pose);
        break;
      case 'knees_bent':
        result = isKneesBent(pose);
        break;
      case 'chest_open':
        result = isChestOpen(pose);
        break;
      case 'hips_opening':
        result = isHipsOpening(pose);
        break;
      default:
        return {
          success: false,
          error: `Unknown check type: ${checkType}`,
        };
    }

    return {
      success: true,
      data: {
        videoId,
        frame,
        timestamp: pose.timestamp,
        check: result,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Get all body awareness checks
 */
export async function getAllBodyChecks(
  db: Db,
  videoId: string,
  frame: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = await collection.findOne({ videoId });

    if (!video) {
      return {
        success: false,
        error: `Video ${videoId} not found`,
      };
    }

    const poseTimeline = (video as any).poseTimeline;
    if (!poseTimeline || !poseTimeline[frame]) {
      return {
        success: false,
        error: `Frame ${frame} not found`,
      };
    }

    const pose = poseTimeline[frame];
    const checks = runAllBodyChecks(pose);

    return {
      success: true,
      data: {
        videoId,
        frame,
        timestamp: pose.timestamp,
        checks,
        summary: {
          totalChecks: checks.length,
          passedChecks: checks.filter((c) => c.result).length,
          averageConfidence: checks.reduce((sum, c) => sum + c.confidence, 0) / checks.length,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
