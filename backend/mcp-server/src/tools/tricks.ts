import { getDB } from '../db/connection';
import { getCache } from '../index';
import { MCPTool } from './registry';
import { Trick } from '../db/schemas';

export const getTrickInfoTool: MCPTool = {
  name: 'get_trick_info',
  description: 'Get detailed information about a trick including phases, requirements, and common problems',
  parameters: {
    trick_name: {
      type: 'string',
      description: 'Name of the trick (e.g., "backside-360")',
      required: true,
    },
  },
  handler: async (params) => {
    const { trick_name } = params;
    const cache = getCache();
    const cacheKey = `trick:${trick_name}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const trick = await db.collection('tricks').findOne({ name: trick_name });

    if (!trick) {
      return { success: false, error: `Trick "${trick_name}" not found` };
    }

    const result = {
      success: true,
      data: trick,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const getTrickProgressionTool: MCPTool = {
  name: 'get_trick_progression',
  description: 'Get progression path from one trick to another',
  parameters: {
    from_trick: {
      type: 'string',
      description: 'Starting trick name',
      required: true,
    },
    to_trick: {
      type: 'string',
      description: 'Target trick name',
      required: true,
    },
  },
  handler: async (params) => {
    const { from_trick, to_trick } = params;
    const cache = getCache();
    const cacheKey = `progression:${from_trick}:${to_trick}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const progression = await db.collection('progressions').findOne({
      from_trick,
      to_trick,
    });

    if (!progression) {
      return {
        success: false,
        error: `No progression found from "${from_trick}" to "${to_trick}"`,
      };
    }

    const result = {
      success: true,
      data: progression,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const findSimilarTricksTool: MCPTool = {
  name: 'find_similar_tricks',
  description: 'Find tricks similar to a given trick by concepts or difficulty',
  parameters: {
    trick_name: {
      type: 'string',
      description: 'Reference trick name',
      required: true,
    },
    similarity_type: {
      type: 'string',
      description: 'Type of similarity: "concepts", "difficulty", or "all"',
      enum: ['concepts', 'difficulty', 'all'],
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results',
    },
  },
  handler: async (params) => {
    const { trick_name, similarity_type = 'all', limit = 10 } = params;
    const cache = getCache();
    const cacheKey = `similar:${trick_name}:${similarity_type}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const referenceTrick = await db.collection('tricks').findOne({ name: trick_name });

    if (!referenceTrick) {
      return { success: false, error: `Trick "${trick_name}" not found` };
    }

    let query: Record<string, any> = { name: { $ne: trick_name } };

    if (similarity_type === 'concepts' || similarity_type === 'all') {
      query.concepts = { $in: referenceTrick.concepts };
    }

    if (similarity_type === 'difficulty' || similarity_type === 'all') {
      const diffRange = 1;
      query.difficulty = {
        $gte: referenceTrick.difficulty - diffRange,
        $lte: referenceTrick.difficulty + diffRange,
      };
    }

    const similarTricks = await db
      .collection('tricks')
      .find(query)
      .limit(limit)
      .toArray();

    const result = {
      success: true,
      data: similarTricks,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const getTrickVideosTool: MCPTool = {
  name: 'get_trick_videos',
  description: 'Get video URLs and timestamps for a trick',
  parameters: {
    trick_name: {
      type: 'string',
      description: 'Name of the trick',
      required: true,
    },
    limit: {
      type: 'number',
      description: 'Maximum number of videos',
    },
  },
  handler: async (params) => {
    const { trick_name, limit = 5 } = params;
    const cache = getCache();
    const cacheKey = `videos:${trick_name}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const trick = await db.collection('tricks').findOne({ name: trick_name });

    if (!trick) {
      return { success: false, error: `Trick "${trick_name}" not found` };
    }

    const videos = trick.phases
      .filter((phase: any) => phase.video_url)
      .map((phase: any) => ({
        phase: phase.name,
        url: phase.video_url,
        timestamp: phase.video_timestamp,
      }))
      .slice(0, limit);

    const result = {
      success: true,
      data: videos,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};
