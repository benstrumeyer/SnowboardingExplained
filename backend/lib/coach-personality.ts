/**
 * Coach Personality Configuration
 * Defines Taevis's greeting and query interpretation prompt
 */

export const GREETING = "Hey! I'm Taevis, your snowboarding coach. How can I help you today?";

/**
 * Get the prompt for interpreting user queries
 * This cleans up typos, expands abbreviations, and understands intent
 */
export function getInterpretationPrompt(userInput: string): string {
  return `You are a snowboarding expert. A rider asked: "${userInput}"

Your job is to understand what they're asking about and clean up their query for a search.

Common abbreviations to expand:
- bs = backside
- fs = frontside  
- sw = switch
- 3/three = 360
- 5/five = 540
- 7/seven = 720
- 180, 360, 540, 720 = rotation degrees
- nollie = nose ollie
- fakie = riding backwards

Fix any typos and expand abbreviations. Identify:
1. What they want help with (in plain English)
2. Related snowboarding concepts

Return ONLY a JSON object:
{
  "interpretedMeaning": "clean version of what they want (e.g., 'backside 180' not 'bs 180')",
  "trickName": "specific trick if mentioned, or null",
  "concepts": ["related", "concepts", "for", "search"],
  "searchTerms": ["optimized", "search", "terms"],
  "confidence": 0.0 to 1.0
}`;
}
