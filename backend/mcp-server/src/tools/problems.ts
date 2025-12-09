import { getDB } from '../db/connection';
import { getCache } from '../index';
import { MCPTool } from './registry';

export const getCommonMistakesTool: MCPTool = {
  name: 'get_common_mistakes',
  description: 'Get common mistakes and problems for a specific trick',
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
    const cacheKey = `mistakes:${trick_name}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const trick = await db.collection('tricks').findOne({ name: trick_name });

    if (!trick) {
      return { success: false, error: `Trick "${trick_name}" not found` };
    }

    const mistakes = trick.phases.flatMap((phase: any) =>
      (phase.common_problems || []).map((problem: any) => ({
        phase: phase.name,
        problem: problem.problem,
        causes: problem.causes,
        fixes: problem.fixes,
      }))
    );

    const result = {
      success: true,
      data: mistakes,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const diagnoseProblemTool: MCPTool = {
  name: 'diagnose_problem',
  description: 'Diagnose a problem described by the user for a specific trick',
  parameters: {
    trick_name: {
      type: 'string',
      description: 'Name of the trick',
      required: true,
    },
    problem_description: {
      type: 'string',
      description: 'Description of the problem (e.g., "sliding out after landing")',
      required: true,
    },
  },
  handler: async (params) => {
    const { trick_name, problem_description } = params;
    const cache = getCache();
    const cacheKey = `diagnosis:${trick_name}:${problem_description}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const trick = await db.collection('tricks').findOne({ name: trick_name });

    if (!trick) {
      return { success: false, error: `Trick "${trick_name}" not found` };
    }

    // Find matching problems
    const matches: any[] = [];
    trick.phases.forEach((phase: any) => {
      (phase.common_problems || []).forEach((problem: any) => {
        const similarity = calculateSimilarity(
          problem_description.toLowerCase(),
          problem.problem.toLowerCase()
        );
        if (similarity > 0.3) {
          matches.push({
            phase: phase.name,
            problem: problem.problem,
            causes: problem.causes,
            fixes: problem.fixes,
            confidence: similarity,
          });
        }
      });
    });

    if (matches.length === 0) {
      return {
        success: false,
        error: `No matching problems found for "${problem_description}"`,
      };
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    const result = {
      success: true,
      data: matches,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const getProblemSolutionsTool: MCPTool = {
  name: 'get_problem_solutions',
  description: 'Get solutions for a specific problem category',
  parameters: {
    problem_name: {
      type: 'string',
      description: 'Name of the problem',
      required: true,
    },
    trick_name: {
      type: 'string',
      description: 'Optional: specific trick to filter solutions',
    },
  },
  handler: async (params) => {
    const { problem_name, trick_name } = params;
    const cache = getCache();
    const cacheKey = `solutions:${problem_name}:${trick_name || 'all'}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();

    let tricks: any[] = [];
    if (trick_name) {
      const trick = await db.collection('tricks').findOne({ name: trick_name });
      if (trick) tricks = [trick];
    } else {
      tricks = await db.collection('tricks').find({}).toArray();
    }

    const solutions: any[] = [];
    tricks.forEach((trick) => {
      trick.phases.forEach((phase: any) => {
        (phase.common_problems || []).forEach((problem: any) => {
          if (problem.problem.toLowerCase() === problem_name.toLowerCase()) {
            solutions.push({
              trick: trick.name,
              phase: phase.name,
              problem: problem.problem,
              causes: problem.causes,
              fixes: problem.fixes,
            });
          }
        });
      });
    });

    if (solutions.length === 0) {
      return {
        success: false,
        error: `No solutions found for problem "${problem_name}"`,
      };
    }

    const result = {
      success: true,
      data: solutions,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

// Helper function to calculate string similarity
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
