import { getDB } from '../db/connection';
import { getCache } from '../index';
import { MCPTool } from './registry';

export const getLearningPathTool: MCPTool = {
  name: 'get_learning_path',
  description: 'Get a learning path from current level to goal trick',
  parameters: {
    goal_trick: {
      type: 'string',
      description: 'Target trick to learn',
      required: true,
    },
    current_level: {
      type: 'string',
      description: 'Current trick level (e.g., "beginner", "intermediate", "advanced")',
    },
  },
  handler: async (params) => {
    const { goal_trick, current_level = 'beginner' } = params;
    const cache = getCache();
    const cacheKey = `learning_path:${goal_trick}:${current_level}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const goalTrickDoc = await db.collection('tricks').findOne({ name: goal_trick });

    if (!goalTrickDoc) {
      return { success: false, error: `Trick "${goal_trick}" not found` };
    }

    // Build path by following prerequisites
    const path = await buildLearningPath(db, goal_trick, goalTrickDoc.prerequisites || []);

    const result = {
      success: true,
      data: {
        goal: goal_trick,
        current_level,
        path,
        total_steps: path.length,
      },
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const getPrerequisitesTool: MCPTool = {
  name: 'get_prerequisites',
  description: 'Get all prerequisites for a trick',
  parameters: {
    trick_name: {
      type: 'string',
      description: 'Name of the trick',
      required: true,
    },
  },
  handler: async (params) => {
    const { trick_name } = params;
    const cache = getCache();
    const cacheKey = `prerequisites:${trick_name}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const trick = await db.collection('tricks').findOne({ name: trick_name });

    if (!trick) {
      return { success: false, error: `Trick "${trick_name}" not found` };
    }

    const prerequisites = trick.prerequisites || [];

    // Get details for each prerequisite
    const details = await Promise.all(
      prerequisites.map(async (prereq: string) => {
        const prereqTrick = await db.collection('tricks').findOne({ name: prereq });
        return {
          name: prereq,
          difficulty: prereqTrick?.difficulty || 0,
          concepts: prereqTrick?.concepts || [],
        };
      })
    );

    const result = {
      success: true,
      data: {
        trick: trick_name,
        prerequisites: details,
        count: details.length,
      },
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const getNextTricksTool: MCPTool = {
  name: 'get_next_tricks',
  description: 'Get recommended next tricks to learn after current trick',
  parameters: {
    current_trick: {
      type: 'string',
      description: 'Current trick name',
      required: true,
    },
    limit: {
      type: 'number',
      description: 'Maximum number of recommendations',
    },
  },
  handler: async (params) => {
    const { current_trick, limit = 5 } = params;
    const cache = getCache();
    const cacheKey = `next_tricks:${current_trick}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const currentTrickDoc = await db.collection('tricks').findOne({ name: current_trick });

    if (!currentTrickDoc) {
      return { success: false, error: `Trick "${current_trick}" not found` };
    }

    // Find tricks that have current_trick as a prerequisite
    const nextTricks = await db
      .collection('tricks')
      .find({ prerequisites: current_trick })
      .limit(limit)
      .toArray();

    if (nextTricks.length === 0) {
      return {
        success: false,
        error: `No next tricks found for "${current_trick}"`,
      };
    }

    const recommendations = nextTricks.map((trick) => ({
      name: trick.name,
      difficulty: trick.difficulty,
      new_concepts: trick.concepts.filter(
        (c: string) => !(currentTrickDoc.concepts || []).includes(c)
      ),
      prerequisites_met: trick.prerequisites.filter((p: string) =>
        [current_trick, ...(currentTrickDoc.prerequisites || [])].includes(p)
      ).length,
      total_prerequisites: trick.prerequisites.length,
    }));

    const result = {
      success: true,
      data: recommendations,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

// Helper function to build learning path
async function buildLearningPath(db: any, trick: string, prerequisites: string[]): Promise<any[]> {
  const path: any[] = [];
  const visited = new Set<string>();

  async function traverse(currentTrick: string) {
    if (visited.has(currentTrick)) return;
    visited.add(currentTrick);

    const trickDoc = await db.collection('tricks').findOne({ name: currentTrick });
    if (!trickDoc) return;

    // Add prerequisites first
    for (const prereq of trickDoc.prerequisites || []) {
      await traverse(prereq);
    }

    // Then add current trick
    path.push({
      step: path.length + 1,
      trick: currentTrick,
      difficulty: trickDoc.difficulty,
      concepts: trickDoc.concepts,
    });
  }

  await traverse(trick);
  return path;
}
