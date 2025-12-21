/**
 * MCP Tools: Reference Library Management
 * Task 12: Reference library management tools
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Db } from 'mongodb';
import { ReferencePose, ReferenceFilters, AddReferenceInput } from '../../src/types/formAnalysis';
import { getVideoAnalysisCollection } from '../src/db/formAnalysisSchemas';

export function getReferenceLibraryTools(): Tool[] {
  return [
    {
      name: 'list_reference_poses',
      description: 'List reference poses with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          trickName: {
            type: 'string',
            description: 'Filter by trick name',
          },
          phase: {
            type: 'string',
            description: 'Filter by phase',
          },
          stance: {
            type: 'string',
            description: 'Filter by stance (regular or goofy)',
          },
          qualityRating: {
            type: 'number',
            description: 'Minimum quality rating (1-5)',
          },
          isPrimary: {
            type: 'boolean',
            description: 'Filter by primary reference status',
          },
        },
      },
    },
    {
      name: 'add_reference_pose',
      description: 'Add a new reference pose from a video frame',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: {
            type: 'string',
            description: 'Source video ID',
          },
          frameNumber: {
            type: 'number',
            description: 'Frame number in the video',
          },
          trickName: {
            type: 'string',
            description: 'Trick name',
          },
          phase: {
            type: 'string',
            description: 'Phase name',
          },
          stance: {
            type: 'string',
            description: 'Stance (regular or goofy)',
          },
          qualityRating: {
            type: 'number',
            description: 'Quality rating (1-5)',
          },
          notes: {
            type: 'string',
            description: 'Notes about this reference',
          },
          styleVariation: {
            type: 'string',
            description: 'Style variation (compact, extended, aggressive, smooth, counter_rotated, squared)',
          },
        },
        required: ['videoId', 'frameNumber', 'trickName', 'phase', 'stance', 'qualityRating', 'notes'],
      },
    },
    {
      name: 'set_video_analysis_status',
      description: 'Update the analysis status of a video',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: {
            type: 'string',
            description: 'Video ID',
          },
          status: {
            type: 'string',
            description: 'New status (untagged, in_progress, fully_analyzed)',
          },
        },
        required: ['videoId', 'status'],
      },
    },
  ];
}

/**
 * List reference poses with filters
 */
export async function listReferencePoses(
  db: Db,
  filters?: ReferenceFilters
): Promise<{ success: boolean; data?: ReferencePose[]; error?: string }> {
  try {
    // Mock reference poses
    const referencePoses: ReferencePose[] = [
      {
        trickName: 'backside 360',
        phase: 'takeoff',
        stance: 'regular',
        qualityRating: 5,
        sourceVideoId: 'ref-001',
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
        },
        keyPoints: ['Knees extended', 'Hips aligned'],
        commonMistakes: ['Knees too bent'],
        notes: 'Ideal reference',
        styleVariation: 'compact',
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        trickName: 'backside 360',
        phase: 'air',
        stance: 'regular',
        qualityRating: 5,
        sourceVideoId: 'ref-002',
        sourceFrameNumber: 200,
        poseData: {
          frameNumber: 200,
          timestamp: 6.67,
          joints3D: [],
          jointAngles: {
            leftKnee: 120,
            rightKnee: 120,
            leftHip: 120,
            rightHip: 120,
            leftShoulder: 90,
            rightShoulder: 90,
            spine: 45,
          },
          confidence: 0.92,
        },
        jointAngles: {
          leftKnee: 120,
          rightKnee: 120,
          leftHip: 120,
          rightHip: 120,
          leftShoulder: 90,
          rightShoulder: 90,
          spine: 45,
        },
        acceptableRanges: {
          spine: { min: 30, max: 60 },
        },
        keyPoints: ['Chest rotated', 'Body compact'],
        commonMistakes: ['Over-rotated'],
        notes: 'Good air position',
        styleVariation: 'compact',
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Apply filters
    let filtered = referencePoses;

    if (filters?.trickName) {
      filtered = filtered.filter((p) => p.trickName === filters.trickName);
    }
    if (filters?.phase) {
      filtered = filtered.filter((p) => p.phase === filters.phase);
    }
    if (filters?.stance) {
      filtered = filtered.filter((p) => p.stance === filters.stance);
    }
    if (filters?.qualityRating) {
      filtered = filtered.filter((p) => p.qualityRating >= filters.qualityRating!);
    }
    if (filters?.isPrimary !== undefined) {
      filtered = filtered.filter((p) => p.isPrimary === filters.isPrimary);
    }

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

/**
 * Add reference pose
 */
export async function addReferencePose(
  db: Db,
  input: AddReferenceInput
): Promise<{ success: boolean; data?: ReferencePose; error?: string }> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = await collection.findOne({ videoId: input.videoId });

    if (!video) {
      return {
        success: false,
        error: `Video ${input.videoId} not found`,
      };
    }

    const poseTimeline = (video as any).poseTimeline;
    if (!poseTimeline || !poseTimeline[input.frameNumber]) {
      return {
        success: false,
        error: `Frame ${input.frameNumber} not found in video`,
      };
    }

    const poseData = poseTimeline[input.frameNumber];

    const referencePose: ReferencePose = {
      trickName: input.trickName,
      phase: input.phase,
      stance: input.stance,
      qualityRating: input.qualityRating,
      sourceVideoId: input.videoId,
      sourceFrameNumber: input.frameNumber,
      poseData,
      jointAngles: poseData.jointAngles,
      acceptableRanges: {},
      keyPoints: [],
      commonMistakes: [],
      notes: input.notes,
      styleVariation: input.styleVariation,
      isPrimary: false,
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
 * Set video analysis status
 */
export async function setVideoAnalysisStatus(
  db: Db,
  videoId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!['untagged', 'in_progress', 'fully_analyzed'].includes(status)) {
      return {
        success: false,
        error: 'Invalid status. Must be: untagged, in_progress, or fully_analyzed',
      };
    }

    const collection = getVideoAnalysisCollection(db);
    const result = await collection.updateOne(
      { videoId },
      { $set: { analysisStatus: status } }
    );

    if (result.matchedCount === 0) {
      return {
        success: false,
        error: `Video ${videoId} not found`,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
