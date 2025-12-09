import { getDB } from '../db/connection';
import { getCache } from '../index';
import { MCPTool } from './registry';

export const searchTipsTool: MCPTool = {
  name: 'search_tips',
  description: 'Search for tips by query, trick, or concept',
  parameters: {
    query: {
      type: 'string',
      description: 'Search query',
    },
    trick: {
      type: 'string',
      description: 'Optional: filter by trick name',
    },
    concept: {
      type: 'string',
      description: 'Optional: filter by concept name',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results',
    },
  },
  handler: async (params) => {
    const { query, trick, concept, limit = 10 } = params;
    const cache = getCache();
    const cacheKey = `tips:${query}:${trick || 'all'}:${concept || 'all'}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const filter: Record<string, any> = {};

    if (trick) filter.trick = trick;
    if (concept) filter.concept = concept;

    let tips = await db
      .collection('tips')
      .find(filter)
      .sort({ relevance_score: -1 })
      .limit(limit)
      .toArray();

    // If query provided, filter by text match
    if (query) {
      const queryLower = query.toLowerCase();
      tips = tips.filter((tip) => tip.content.toLowerCase().includes(queryLower));
    }

    if (tips.length === 0) {
      return {
        success: false,
        error: `No tips found matching criteria`,
      };
    }

    const result = {
      success: true,
      data: tips,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const getTipDetailsTool: MCPTool = {
  name: 'get_tip_details',
  description: 'Get detailed information about a specific tip',
  parameters: {
    tip_id: {
      type: 'string',
      description: 'ID of the tip',
      required: true,
    },
  },
  handler: async (params) => {
    const { tip_id } = params;
    const cache = getCache();
    const cacheKey = `tip_details:${tip_id}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const { ObjectId } = require('mongodb');

    let tip;
    try {
      tip = await db.collection('tips').findOne({ _id: new ObjectId(tip_id) });
    } catch {
      tip = await db.collection('tips').findOne({ _id: tip_id });
    }

    if (!tip) {
      return { success: false, error: `Tip "${tip_id}" not found` };
    }

    const result = {
      success: true,
      data: tip,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const findTipsByProblemTool: MCPTool = {
  name: 'find_tips_by_problem',
  description: 'Find tips that address a specific problem',
  parameters: {
    problem: {
      type: 'string',
      description: 'Problem name or description',
      required: true,
    },
    trick: {
      type: 'string',
      description: 'Optional: filter by trick',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results',
    },
  },
  handler: async (params) => {
    const { problem, trick, limit = 10 } = params;
    const cache = getCache();
    const cacheKey = `tips_by_problem:${problem}:${trick || 'all'}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const filter: Record<string, any> = { problem };

    if (trick) filter.trick = trick;

    const tips = await db
      .collection('tips')
      .find(filter)
      .sort({ relevance_score: -1 })
      .limit(limit)
      .toArray();

    if (tips.length === 0) {
      return {
        success: false,
        error: `No tips found for problem "${problem}"`,
      };
    }

    const result = {
      success: true,
      data: tips,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};
