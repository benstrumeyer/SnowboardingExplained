/**
 * MCP Tools: Video Overview
 * Task 8: Video overview tools for LLM data retrieval
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Db } from 'mongodb';
import { VideoMetadata, VideoListItem, VideoAnalysis } from '../../src/types/formAnalysis';
import { getVideoAnalysisCollection } from '../src/db/formAnalysisSchemas';

export function getVideoOverviewTools(): Tool[] {
  return [
    {
      name: 'get_video_summary',
      description: 'Get a pre-computed summary of a processed video analysis',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: {
            type: 'string',
            description: 'The video ID to retrieve summary for',
          },
        },
        required: ['videoId'],
      },
    },
    {
      name: 'get_video_metadata',
      description: 'Get metadata about a processed video (duration, fps, stance, trick)',
      inputSchema: {
        type: 'object',
        properties: {
          videoId: {
            type: 'string',
            description: 'The video ID to retrieve metadata for',
          },
        },
        required: ['videoId'],
      },
    },
    {
      name: 'list_available_videos',
      description: 'List all processed videos with basic info',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of videos to return (default: 50)',
          },
          trick: {
            type: 'string',
            description: 'Filter by trick name (optional)',
          },
        },
      },
    },
  ];
}

/**
 * Get video summary
 */
export async function getVideoSummary(
  db: Db,
  videoId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = (await collection.findOne({ videoId })) as VideoAnalysis | null;

    if (!video) {
      return {
        success: false,
        error: `Video ${videoId} not found`,
      };
    }

    return {
      success: true,
      data: {
        videoId: video.videoId,
        trickIdentified: video.summary.trickIdentified,
        confidence: video.summary.confidence,
        phasesDetected: video.summary.phasesDetected,
        keyIssues: video.summary.keyIssues,
        keyPositives: video.summary.keyPositives,
        recommendedFocusAreas: video.summary.recommendedFocusAreas,
        overallAssessment: video.summary.overallAssessment,
        progressionAdvice: video.summary.progressionAdvice,
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
 * Get video metadata
 */
export async function getVideoMetadata(
  db: Db,
  videoId: string
): Promise<{ success: boolean; data?: VideoMetadata; error?: string }> {
  try {
    const collection = getVideoAnalysisCollection(db);
    const video = (await collection.findOne({ videoId })) as VideoAnalysis | null;

    if (!video) {
      return {
        success: false,
        error: `Video ${videoId} not found`,
      };
    }

    const metadata: VideoMetadata = {
      videoId: video.videoId,
      duration: video.duration,
      frameCount: video.frameCount,
      fps: video.fps,
      stance: video.stance,
      trickIdentified: video.summary.trickIdentified,
      uploadedAt: video.uploadedAt,
    };

    return {
      success: true,
      data: metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * List available videos
 */
export async function listAvailableVideos(
  db: Db,
  limit: number = 50,
  trick?: string
): Promise<{ success: boolean; data?: VideoListItem[]; error?: string }> {
  try {
    const collection = getVideoAnalysisCollection(db);

    const query: any = {};
    if (trick) {
      query['summary.trickIdentified'] = trick;
    }

    const videos = (await collection
      .find(query)
      .sort({ uploadedAt: -1 })
      .limit(limit)
      .toArray()) as VideoAnalysis[];

    const items: VideoListItem[] = videos.map((v) => ({
      videoId: v.videoId,
      trickName: v.summary.trickIdentified,
      uploadedAt: v.uploadedAt,
      analysisStatus: v.analysisStatus,
      stance: v.stance,
    }));

    return {
      success: true,
      data: items,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
