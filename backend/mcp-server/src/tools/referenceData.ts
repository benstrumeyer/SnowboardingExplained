/**
 * MCP Tools: Reference Data
 * Task 11: Reference data tools for LLM data retrieval
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Db } from 'mongodb';
import { ReferencePose, TrickRules, CommonProblems, Phase } from '../../src/types/formAnalysis';

export function getReferenceDataTools(): Tool[] {
  return [
    {
      name: 'get_reference_pose',
      description: 'Get ideal reference pose data for a trick and phase',
      inputSchema: {
        type: 'object',
        properties: {
          trickName: {
            type: 'string',
            description: 'Name of the trick (e.g., "backside 360")',
          },
          phaseName: {
            type: 'string',
            description: 'Optional: specific phase (setupCarve, windUp, snap, takeoff, air, landing)',
          },
        },
        required: ['trickName'],
      },
    },
    {
      name: 'get_trick_rules',
      description: 'Get technique rules for a trick and phase',
      inputSchema: {
        type: 'object',
        properties: {
          trickName: {
            type: 'string',
            description: 'Name of the trick',
          },
          phaseName: {
            type: 'string',
            description: 'Optional: specific phase',
          },
        },
        required: ['trickName'],
      },
    },
    {
      name: 'get_common_problems',
      description: 'Get common problems and fixes for a trick and phase',
      inputSchema: {
        type: 'object',
        properties: {
          trickName: {
            type: 'string',
            description: 'Name of the trick',
          },
          phaseName: {
            type: 'string',
            description: 'Optional: specific phase',
          },
        },
        required: ['trickName'],
      },
    },
    {
      name: 'list_available_tricks',
      description: 'List all tricks with available reference data',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

/**
 * Get reference pose
 */
export async function getReferencePose(
  db: Db,
  trickName: string,
  phaseName?: string
): Promise<{ success: boolean; data?: ReferencePose; error?: string }> {
  try {
    // Mock reference pose data
    const referencePose: ReferencePose = {
      trickName,
      phase: (phaseName as Phase) || 'takeoff',
      stance: 'regular',
      qualityRating: 5,
      sourceVideoId: 'ref-video-001',
      sourceFrameNumber: 150,
      poseData: {
        frameNumber: 150,
        timestamp: 5.0,
        joints3D: [],
        jointAngles: {
          leftKnee: 150,
          rightKnee: 150,
          leftHip: 90,
          rightHip: 90,
          leftShoulder: 45,
          rightShoulder: 45,
          spine: 0,
        },
        confidence: 0.95,
      },
      jointAngles: {
        leftKnee: 150,
        rightKnee: 150,
        leftHip: 90,
        rightHip: 90,
        leftShoulder: 45,
        rightShoulder: 45,
        spine: 0,
      },
      acceptableRanges: {
        leftKnee: { min: 140, max: 160 },
        rightKnee: { min: 140, max: 160 },
        spine: { min: -10, max: 10 },
      },
      keyPoints: ['Knees extended', 'Hips aligned', 'Chest neutral'],
      commonMistakes: ['Knees too bent', 'Chest rotated too much', 'Hips not aligned'],
      notes: 'Ideal reference for regular stance',
      styleVariation: 'compact',
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      data: referencePose,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Get trick rules
 */
export async function getTrickRules(
  db: Db,
  trickName: string,
  phaseName?: string
): Promise<{ success: boolean; data?: TrickRules; error?: string }> {
  try {
    const rules: TrickRules = {
      trickName,
      phase: (phaseName as Phase) || 'takeoff',
      rules: [
        {
          ruleName: 'Body Stackedness',
          expectedValue: 'Joints aligned over board',
          importance: 'critical',
          description: 'Rider should be stacked vertically over the board at takeoff',
        },
        {
          ruleName: 'Knee Extension',
          expectedValue: '140-160 degrees',
          importance: 'critical',
          description: 'Knees should be extended but not locked',
        },
        {
          ruleName: 'Chest Alignment',
          expectedValue: 'Neutral or slightly rotated',
          importance: 'important',
          description: 'Chest should be aligned with the direction of rotation',
        },
        {
          ruleName: 'Hip Position',
          expectedValue: 'Level and forward',
          importance: 'important',
          description: 'Hips should be level and positioned forward over the board',
        },
      ],
    };

    return {
      success: true,
      data: rules,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Get common problems
 */
export async function getCommonProblems(
  db: Db,
  trickName: string,
  phaseName?: string
): Promise<{ success: boolean; data?: CommonProblems; error?: string }> {
  try {
    const problems: CommonProblems = {
      trickName,
      phase: (phaseName as Phase) || 'takeoff',
      problems: [
        {
          problemName: 'Knees Too Bent',
          indicators: ['Knees < 140 degrees', 'Body crouched at takeoff'],
          correction: 'Extend knees more at takeoff for better pop',
          frequency: 45,
          severity: 'moderate',
        },
        {
          problemName: 'Chest Over-Rotated',
          indicators: ['Spine angle > 30 degrees', 'Shoulders leading rotation'],
          correction: 'Keep chest more neutral at takeoff, let hips lead rotation',
          frequency: 35,
          severity: 'moderate',
        },
        {
          problemName: 'Hips Not Forward',
          indicators: ['Hip position behind board center', 'Weight on heels'],
          correction: 'Move hips forward over board before takeoff',
          frequency: 25,
          severity: 'important',
        },
        {
          problemName: 'Arm Flail',
          indicators: ['Arms moving erratically', 'Loss of balance'],
          correction: 'Keep arms controlled and close to body',
          frequency: 20,
          severity: 'important',
        },
      ],
    };

    return {
      success: true,
      data: problems,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * List available tricks
 */
export async function listAvailableTricks(
  db: Db
): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const tricks = [
      'straight air',
      'backside 180',
      'frontside 180',
      'backside 360',
      'frontside 360',
      'backside 540',
      'frontside 540',
      'backside 720',
      'frontside 720',
      'backside 900',
      'frontside 900',
      'backside 1080',
      'frontside 1080',
    ];

    return {
      success: true,
      data: tricks,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
