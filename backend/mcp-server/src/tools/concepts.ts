import { getDB } from '../db/connection';
import { getCache } from '../index';
import { MCPTool } from './registry';

export const getConceptInfoTool: MCPTool = {
  name: 'get_concept_info',
  description: 'Get detailed information about a snowboarding concept',
  parameters: {
    concept_name: {
      type: 'string',
      description: 'Name of the concept (e.g., "edge control")',
      required: true,
    },
  },
  handler: async (params) => {
    const { concept_name } = params;
    const cache = getCache();
    const cacheKey = `concept:${concept_name}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const concept = await db.collection('concepts').findOne({ name: concept_name });

    if (!concept) {
      return { success: false, error: `Concept "${concept_name}" not found` };
    }

    const result = {
      success: true,
      data: concept,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const getConceptRelationshipsTool: MCPTool = {
  name: 'get_concept_relationships',
  description: 'Get relationships and dependencies for a concept',
  parameters: {
    concept_name: {
      type: 'string',
      description: 'Name of the concept',
      required: true,
    },
  },
  handler: async (params) => {
    const { concept_name } = params;
    const cache = getCache();
    const cacheKey = `concept_relationships:${concept_name}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const concept = await db.collection('concepts').findOne({ name: concept_name });

    if (!concept) {
      return { success: false, error: `Concept "${concept_name}" not found` };
    }

    const relationships = {
      related_problems: concept.related_problems || [],
      applies_to_phases: concept.applies_to_phases || {},
      techniques: concept.techniques || [],
    };

    const result = {
      success: true,
      data: relationships,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const findTricksByConceptTool: MCPTool = {
  name: 'find_tricks_by_concept',
  description: 'Find all tricks that use a specific concept',
  parameters: {
    concept_name: {
      type: 'string',
      description: 'Name of the concept',
      required: true,
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results',
    },
  },
  handler: async (params) => {
    const { concept_name, limit = 20 } = params;
    const cache = getCache();
    const cacheKey = `tricks_by_concept:${concept_name}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const tricks = await db
      .collection('tricks')
      .find({ concepts: concept_name })
      .limit(limit)
      .toArray();

    if (tricks.length === 0) {
      return {
        success: false,
        error: `No tricks found using concept "${concept_name}"`,
      };
    }

    const result = {
      success: true,
      data: tricks,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};

export const compareConceptsTool: MCPTool = {
  name: 'compare_concepts',
  description: 'Compare two concepts and show their similarities and differences',
  parameters: {
    concept1: {
      type: 'string',
      description: 'First concept name',
      required: true,
    },
    concept2: {
      type: 'string',
      description: 'Second concept name',
      required: true,
    },
  },
  handler: async (params) => {
    const { concept1, concept2 } = params;
    const cache = getCache();
    const cacheKey = `compare_concepts:${concept1}:${concept2}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const db = getDB();
    const c1 = await db.collection('concepts').findOne({ name: concept1 });
    const c2 = await db.collection('concepts').findOne({ name: concept2 });

    if (!c1 || !c2) {
      return {
        success: false,
        error: `One or both concepts not found: "${concept1}", "${concept2}"`,
      };
    }

    const comparison = {
      concept1: {
        name: c1.name,
        definition: c1.definition,
        importance: c1.importance,
      },
      concept2: {
        name: c2.name,
        definition: c2.definition,
        importance: c2.importance,
      },
      shared_problems: (c1.related_problems || []).filter((p: string) =>
        (c2.related_problems || []).includes(p)
      ),
      unique_to_concept1: (c1.related_problems || []).filter(
        (p: string) => !(c2.related_problems || []).includes(p)
      ),
      unique_to_concept2: (c2.related_problems || []).filter(
        (p: string) => !(c1.related_problems || []).includes(p)
      ),
    };

    const result = {
      success: true,
      data: comparison,
      cached: false,
    };

    cache.set(cacheKey, result.data, 300);
    return result;
  },
};
