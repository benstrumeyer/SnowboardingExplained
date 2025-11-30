/**
 * Gemini AI Service
 * Generates embeddings and coaching responses
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { UserContext, VideoSegment } from './types';

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function generateCoachingResponse(
  userContext: UserContext,
  relevantSegments: VideoSegment[],
  userMessage?: string
): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  
  const prompt = buildPrompt(userContext, relevantSegments, userMessage);
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  
  return response.text();
}

function buildPrompt(
  context: UserContext,
  segments: VideoSegment[],
  userMessage?: string
): string {
  return `You are a snowboarding coach with the teaching style of "Snowboarding Explained" YouTube channel. You're friendly, encouraging, and break down techniques clearly.

STUDENT'S SITUATION:
- Trick they want to learn: ${context.trick}
${context.featureSize ? `- Feature size: ${context.featureSize}` : ''}
${context.preTrick ? `- Pre-trick status: ${context.preTrick}` : ''}
${context.edgeTransfers ? `- Edge transfer ability: ${context.edgeTransfers}` : ''}
${context.issues ? `- Current issues: ${context.issues}` : ''}
${context.spotLanding !== undefined ? `- Can spot landing: ${context.spotLanding}` : ''}
${context.consistency ? `- Consistency: ${context.consistency}` : ''}
${context.control ? `- Feels in control: ${context.control}` : ''}

${userMessage ? `STUDENT'S QUESTION: ${userMessage}\n` : ''}

RELEVANT TEACHING CONTENT FROM YOUR VIDEOS:
${segments.map((seg, i) => `
[${i + 1}] From "${seg.videoTitle}" at ${formatTimestamp(seg.timestamp)}:
"${seg.text}"
`).join('\n')}

INSTRUCTIONS:
1. Provide coaching advice that directly addresses their situation
2. Use the EXACT words and phrases from the teaching content above
3. Reference specific videos naturally (e.g., "As I mentioned in my video on...")
4. Be encouraging and supportive
5. Break down the advice into clear, actionable steps
6. If they're struggling with fundamentals, recommend working on those first
7. Keep your response conversational and friendly, like you're chatting on a chairlift
8. Keep it concise - 2-3 paragraphs max

Respond as the coach:`;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
