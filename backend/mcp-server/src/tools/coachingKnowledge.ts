/**
 * MCP Tools: Coaching Knowledge
 * Task 14: Coaching knowledge tools for LLM data retrieval
 * Integrates with Pinecone for semantic search
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Db } from 'mongodb';
import { CoachingTip } from '../../src/types/formAnalysis';

export function getCoachingKnowledgeTools(): Tool[] {
  return [
    {
      name: 'get_coaching_tips',
      description: 'Get coaching tips for a trick, problem, or phase from the knowledge base',
      inputSchema: {
        type: 'object',
        properties: {
          trickName: {
            type: 'string',
            description: 'Trick name (e.g., "backside 360")',
          },
          problem: {
            type: 'string',
            description: 'Optional: specific problem to search for (e.g., "knees too bent")',
          },
          phase: {
            type: 'string',
            description: 'Optional: specific phase (setupCarve, windUp, snap, takeoff, air, landing)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of tips to return (default: 5)',
          },
        },
        required: ['trickName'],
      },
    },
  ];
}

/**
 * Get coaching tips
 */
export async function getCoachingTips(
  db: Db,
  trickName: string,
  problem?: string,
  phase?: string,
  limit: number = 5
): Promise<{ success: boolean; data?: CoachingTip[]; error?: string }> {
  try {
    // Mock coaching tips from knowledge base
    const tips: CoachingTip[] = [
      {
        trickName,
        phase: phase as any,
        problemType: 'knees_too_bent',
        tip: 'Extend your knees more at takeoff for better pop and height',
        fixInstructions:
          '1. Practice on flat ground with knee extension drills\n2. Focus on explosive leg extension\n3. Film yourself to check knee angle at takeoff',
        commonCauses: ['Lack of confidence', 'Fear of height', 'Weak leg strength'],
        sourceVideoId: 'tutorial-001',
        sourceTimestamp: 45,
        relevanceScore: 95,
        createdAt: new Date(),
      },
      {
        trickName,
        phase: phase as any,
        problemType: 'chest_over_rotated',
        tip: 'Keep your chest more neutral at takeoff - let your hips lead the rotation',
        fixInstructions:
          '1. Practice upper/lower body separation\n2. Focus on hip rotation first\n3. Keep shoulders square longer',
        commonCauses: ['Eager rotation', 'Trying to force the trick', 'Poor body awareness'],
        sourceVideoId: 'tutorial-002',
        sourceTimestamp: 120,
        relevanceScore: 88,
        createdAt: new Date(),
      },
      {
        trickName,
        phase: phase as any,
        problemType: 'hips_not_forward',
        tip: 'Move your hips forward over the board before takeoff for better control',
        fixInstructions:
          '1. Practice carving with forward hip pressure\n2. Feel the weight shift to your toes\n3. Maintain forward hip position through takeoff',
        commonCauses: ['Weight on heels', 'Hesitation', 'Poor edge control'],
        sourceVideoId: 'tutorial-003',
        sourceTimestamp: 200,
        relevanceScore: 82,
        createdAt: new Date(),
      },
      {
        trickName,
        phase: phase as any,
        problemType: 'arm_flail',
        tip: 'Keep your arms controlled and close to your body for better balance',
        fixInstructions:
          '1. Practice arm positioning drills\n2. Keep arms at 90 degrees\n3. Use arms for balance, not momentum',
        commonCauses: ['Loss of balance', 'Overcompensation', 'Lack of body control'],
        sourceVideoId: 'tutorial-004',
        sourceTimestamp: 300,
        relevanceScore: 75,
        createdAt: new Date(),
      },
      {
        trickName,
        phase: phase as any,
        problemType: 'general_form',
        tip: 'Focus on smooth, controlled movements throughout the entire trick',
        fixInstructions:
          '1. Break the trick into phases\n2. Master each phase separately\n3. Combine phases gradually',
        commonCauses: ['Rushing', 'Lack of practice', 'Poor technique foundation'],
        sourceVideoId: 'tutorial-005',
        sourceTimestamp: 400,
        relevanceScore: 70,
        createdAt: new Date(),
      },
    ];

    // Filter by problem if provided
    let filtered = tips;
    if (problem) {
      filtered = filtered.filter(
        (t) =>
          t.problemType.toLowerCase().includes(problem.toLowerCase()) ||
          t.tip.toLowerCase().includes(problem.toLowerCase())
      );
    }

    // Sort by relevance and limit
    filtered = filtered.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);

    return {
      success: true,
      data: filtered,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
