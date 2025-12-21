/**
 * MCP Tools: Critical Analysis
 * Task 9: Critical analysis tools for LLM data retrieval
 * Focuses on spin control and jump metrics
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Db } from 'mongodb';
import { SpinControlAnalysis, JumpMetrics } from '../../src/types/formAnalysis';
import { getVideoAnalysisCollection } from '../src/db/formAnalysisSchemas';

export function getCriticalAnalysisTools(): Tool[] {
  return [
    {
      name: 'get_spin_control_analysis',
      description:
        'Get detailed spin control analysis - MOST IMPORTANT for trick progression. Includes snap power, snap speed, separation, and sweetspot verdict.',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: {
            type: 'string',
            description: 'The video ID to analyze',
          },
        },
        required: ['videoId'],
      },
    },
    {
      name: 'get_jump_metrics',
      description: 'Get jump metrics including air time, jump size, and knuckle risk',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: {
            type: 'string',
            description: 'The video ID to analyze',
          },
        },
        required: ['videoId'],
      },
    },
  ];
}

/**
 * Get spin control analysis - MOST IMPORTANT
 */
export async function getSpinControlAnalysis(
  db: Db,
  videoId: string
): Promise<{ success: boolean; data?: SpinControlAnalysis; error?: string }> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = await collection.findOne({ videoId });

    if (!video) {
      return {
        success: false,
        error: `Video ${videoId} not found`,
      };
    }

    const spinControl = (video as any).measurements?.spinControl;

    if (!spinControl) {
      return {
        success: false,
        error: 'Spin control analysis not available for this video',
      };
    }

    return {
      success: true,
      data: spinControl,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Get jump metrics
 */
export async function getJumpMetrics(
  db: Db,
  videoId: string
): Promise<{ success: boolean; data?: JumpMetrics; error?: string }> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = await collection.findOne({ videoId });

    if (!video) {
      return {
        success: false,
        error: `Video ${videoId} not found`,
      };
    }

    const jumpMetrics = (video as any).measurements?.jumpMetrics;

    if (!jumpMetrics) {
      return {
        success: false,
        error: 'Jump metrics not available for this video',
      };
    }

    return {
      success: true,
      data: jumpMetrics,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
