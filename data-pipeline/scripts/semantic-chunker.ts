/**
 * Semantic Chunker - Groups transcript by meaning, not time
 * Extracts actionable snowboarding tips using AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface TranscriptSegment {
  text: string;
  offset: number;
  timestamp: string;
}

interface SemanticChunk {
  text: string;
  startTime: number;
  endTime: number;
  timestamp: string;
  isActionable: boolean;
  relevanceScore?: number;
}

/**
 * Group sentences into semantic chunks (paragraphs about the same topic)
 */
function groupByTopic(sentences: any[]): SemanticChunk[] {
  const chunks: SemanticChunk[] = [];
  let currentChunk: string[] = [];
  let chunkStart = sentences[0]?.offset || 0;
  let chunkStartTime = sentences[0]?.time || '0:00';
  let lastOffset = chunkStart;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    currentChunk.push(sentence.text);
    lastOffset = sentence.offset;
    
    // Create a chunk every 3-5 sentences OR when there's a long pause
    const shouldChunk = currentChunk.length >= 4 || 
                       (i < sentences.length - 1 && sentences[i + 1].offset - sentence.offset > 5);
    
    if (shouldChunk || i === sentences.length - 1) {
      chunks.push({
        text: currentChunk.join(' '),
        startTime: chunkStart,
        endTime: lastOffset,
        timestamp: chunkStartTime,
        isActionable: false, // Will be determined later
      });
      
      currentChunk = [];
      if (i < sentences.length - 1) {
        chunkStart = sentences[i + 1].offset;
        chunkStartTime = sentences[i + 1].time;
      }
    }
  }
  
  return chunks;
}

/**
 * Score chunks for actionable content using keyword heuristics
 */
function scoreActionability(chunk: string): number {
  const actionKeywords = [
    'tip', 'make sure', 'avoid', 'common mistake', 'i recommend',
    'you want to', 'you need to', 'important to', 'key is',
    'technique', 'how to', 'the way', 'what you do',
    'focus on', 'remember to', 'try to', 'practice',
  ];
  
  const lowerChunk = chunk.toLowerCase();
  let score = 0;
  
  for (const keyword of actionKeywords) {
    if (lowerChunk.includes(keyword)) {
      score += 1;
    }
  }
  
  // Bonus for question words (often followed by explanations)
  if (lowerChunk.includes('how') || lowerChunk.includes('why') || lowerChunk.includes('what')) {
    score += 0.5;
  }
  
  // Penalty for intro/outro phrases
  const fluffKeywords = ['subscribe', 'like this video', 'comment below', 'check out', 'link in description'];
  for (const keyword of fluffKeywords) {
    if (lowerChunk.includes(keyword)) {
      score -= 2;
    }
  }
  
  return Math.max(0, score);
}

/**
 * Use Gemini to extract actionable tips from high-scoring chunks
 */
async function extractTips(chunks: SemanticChunk[], videoTitle: string): Promise<SemanticChunk[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  // Filter to chunks with decent actionability scores
  const candidateChunks = chunks
    .map(chunk => ({
      ...chunk,
      relevanceScore: scoreActionability(chunk.text),
    }))
    .filter(chunk => chunk.relevanceScore! > 0.5)
    .sort((a, b) => b.relevanceScore! - a.relevanceScore!)
    .slice(0, 15); // Top 15 chunks
  
  if (candidateChunks.length === 0) {
    return [];
  }
  
  // Use Gemini to identify which chunks contain actual tips
  const prompt = `You are analyzing a snowboarding tutorial video titled "${videoTitle}".

Below are transcript segments. For each segment, determine if it contains actionable snowboarding advice (techniques, tips, common mistakes to avoid, etc.).

Respond with ONLY a JSON array of numbers representing the indices of segments that contain actionable tips.
Ignore: intros, outros, jokes, storytelling, calls to action (subscribe/like), and general chit-chat.

Segments:
${candidateChunks.map((chunk, i) => `[${i}] ${chunk.text.substring(0, 200)}...`).join('\n\n')}

Response format: [0, 2, 5, 7] (just the array of indices)`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse the response
    const match = response.match(/\[[\d,\s]+\]/);
    if (!match) {
      console.log('  ⚠️  Could not parse Gemini response, using heuristics only');
      return candidateChunks.slice(0, 8); // Fallback to top 8
    }
    
    const indices = JSON.parse(match[0]);
    const actionableChunks = indices
      .filter((i: number) => i < candidateChunks.length)
      .map((i: number) => ({
        ...candidateChunks[i],
        isActionable: true,
      }));
    
    return actionableChunks;
    
  } catch (error: any) {
    console.log(`  ⚠️  Gemini error: ${error.message}, using heuristics`);
    return candidateChunks.slice(0, 8);
  }
}

/**
 * Main function: Process transcript into semantic, actionable chunks
 */
export async function processTranscript(
  sentences: any[],
  videoTitle: string
): Promise<SemanticChunk[]> {
  // Step 1: Group by topic
  const topicChunks = groupByTopic(sentences);
  console.log(`  📦 Grouped into ${topicChunks.length} topic chunks`);
  
  // Step 2: Extract actionable tips using AI
  const actionableTips = await extractTips(topicChunks, videoTitle);
  console.log(`  ✨ Found ${actionableTips.length} actionable tips`);
  
  return actionableTips;
}
