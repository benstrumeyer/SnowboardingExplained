/**
 * Query Interpreter
 * Uses AI to interpret user input and extract meaning
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getInterpretationPrompt } from './coach-personality';

export interface InterpretedQuery {
  originalInput: string;
  interpretedMeaning: string;
  trickName: string | null;
  concepts: string[];
  searchTerms: string[];
  confidence: number;
}

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

/**
 * Interpret user input using AI
 * Handles abbreviations, typos, and extracts concepts
 */
export async function interpretQuery(userInput: string): Promise<InterpretedQuery> {
  const trimmedInput = userInput.trim();
  
  if (!trimmedInput) {
    return {
      originalInput: userInput,
      interpretedMeaning: '',
      trickName: null,
      concepts: [],
      searchTerms: [],
      confidence: 0,
    };
  }

  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
    
    const prompt = getInterpretationPrompt(trimmedInput);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        originalInput: userInput,
        interpretedMeaning: parsed.interpretedMeaning || trimmedInput,
        trickName: parsed.trickName || null,
        concepts: parsed.concepts || [],
        searchTerms: parsed.searchTerms || [trimmedInput],
        confidence: parsed.confidence || 0.5,
      };
    }
    
    // Fallback if JSON parsing fails
    return createFallbackInterpretation(userInput);
    
  } catch (error) {
    console.error('Query interpretation error:', error);
    return createFallbackInterpretation(userInput);
  }
}

/**
 * Create a fallback interpretation when AI fails
 */
function createFallbackInterpretation(userInput: string): InterpretedQuery {
  const expanded = expandAbbreviations(userInput);
  
  return {
    originalInput: userInput,
    interpretedMeaning: expanded,
    trickName: expanded,
    concepts: extractBasicConcepts(expanded),
    searchTerms: [expanded, ...expanded.split(' ')].filter(Boolean),
    confidence: 0.3,
  };
}

/**
 * Basic abbreviation expansion (fallback)
 */
function expandAbbreviations(input: string): string {
  const abbreviations: Record<string, string> = {
    'bs': 'backside',
    'fs': 'frontside',
    'sw': 'switch',
    '3': '360',
    '5': '540',
    '7': '720',
    '9': '900',
    'nollie': 'nose ollie',
  };
  
  let result = input.toLowerCase();
  for (const [abbr, full] of Object.entries(abbreviations)) {
    result = result.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), full);
  }
  
  return result;
}

/**
 * Extract basic concepts from input (fallback)
 */
function extractBasicConcepts(input: string): string[] {
  const concepts: string[] = [];
  const lower = input.toLowerCase();
  
  if (lower.includes('180') || lower.includes('360') || lower.includes('540') || lower.includes('720')) {
    concepts.push('rotation', 'spinning');
  }
  if (lower.includes('backside') || lower.includes('frontside')) {
    concepts.push('direction');
  }
  if (lower.includes('edge') || lower.includes('carve')) {
    concepts.push('edge control');
  }
  if (lower.includes('land') || lower.includes('landing')) {
    concepts.push('landing');
  }
  if (lower.includes('jump') || lower.includes('kicker')) {
    concepts.push('jumping');
  }
  if (lower.includes('rail') || lower.includes('box')) {
    concepts.push('jibbing');
  }
  
  return concepts;
}

/**
 * Get estimated cost for interpretation (Gemini 1.5 Flash 8B pricing)
 * Input: $0.0375 per 1M tokens
 * Output: $0.15 per 1M tokens
 * This is the cheapest Gemini model!
 */
export function estimateInterpretationCost(): { inputCost: number; outputCost: number; totalCost: number } {
  // Approximate tokens for interpretation prompt (~300 input, ~80 output)
  const inputTokens = 300;
  const outputTokens = 80;
  
  const inputCost = (inputTokens / 1_000_000) * 0.0375;
  const outputCost = (outputTokens / 1_000_000) * 0.15;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
