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
 * Use Gemini to extract exactly 3 actionable tips from high-scoring chunks
 */
async function extractTips(chunks: SemanticChunk[], videoTitle: string): Promise<SemanticChunk[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  
  // Filter to chunks with decent actionability scores
  const candidateChunks = chunks
    .map(chunk => ({
      ...chunk,
      relevanceScore: scoreActionability(chunk.text),
    }))
    .filter(chunk => chunk.relevanceScore! > 0.5)
    .sort((a, b) => b.relevanceScore! - a.relevanceScore!)
    .slice(0, 20); // Top 20 chunks to choose from
  
  if (candidateChunks.length === 0) {
    return [];
  }
  
  // Use Gemini to identify the best 5 chunks with actionable tips
  const prompt = `You are analyzing a snowboarding tutorial video titled "${videoTitle}".

Below are transcript segments. Select the 5 BEST segments that contain the most valuable, actionable snowboarding advice.

Choose segments with:
- Specific techniques or tips
- Common mistakes to avoid
- Step-by-step instructions
- Key insights about the trick/skill

Ignore: intros, outros, jokes, storytelling, calls to action (subscribe/like).

Segments:
${candidateChunks.map((chunk, i) => `[${i}] ${chunk.text.substring(0, 250)}...`).join('\n\n')}

Respond with ONLY a JSON array of 5 numbers (the best 5 indices).
Format: [2, 5, 8, 11, 14]`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse the response
    const match = response.match(/\[[\d,\s]+\]/);
    if (!match) {
      console.log('  ⚠️  Could not parse Gemini response, using top 3 by score');
      return candidateChunks.slice(0, 3);
    }
    
    const indices = JSON.parse(match[0]);
    const actionableChunks = indices
      .filter((i: number) => i < candidateChunks.length)
      .slice(0, 5) // Take up to 5
      .map((i: number) => ({
        ...candidateChunks[i],
        isActionable: true,
      }));
    
    // If we got less than 5, fill with top scored chunks
    while (actionableChunks.length < 5 && actionableChunks.length < candidateChunks.length) {
      const nextChunk = candidateChunks.find(c => 
        !actionableChunks.some(ac => ac.text === c.text)
      );
      if (nextChunk) {
        actionableChunks.push({ ...nextChunk, isActionable: true });
      } else {
        break;
      }
    }
    
    return actionableChunks;
    
  } catch (error: any) {
    console.log(`  ⚠️  Gemini error: ${error.message}`);
    console.log(`  Full error:`, JSON.stringify(error, null, 2));
    console.log(`  Using top 5 by score as fallback`);
    return candidateChunks.slice(0, 5);
  }
}

/**
 * Main function: Process transcript into 5 semantic, actionable chunks per video
 */
export async function processTranscript(
  sentences: any[],
  videoTitle: string
): Promise<SemanticChunk[]> {
  // Step 1: Group by topic
  const topicChunks = groupByTopic(sentences);
  console.log(`  📦 Grouped into ${topicChunks.length} topic chunks`);
  
  // Step 2: Extract 5 best actionable tips using AI
  const actionableTips = await extractTips(topicChunks, videoTitle);
  console.log(`  ✨ Selected ${actionableTips.length} tips (target: 5 per video)`);
  
  return actionableTips;
}
