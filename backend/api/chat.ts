/**
 * Chat API Endpoint
 * POST /api/chat
 * 
 * True conversational AI coach:
 * 1. Understand user's message naturally
 * 2. Search Pinecone for relevant knowledge
 * 3. Generate conversational response using AI with snowboard coach personality
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateEmbedding } from '../lib/gemini';
import { searchVideoSegments } from '../lib/pinecone';
import type { VideoSegment } from '../lib/types';

const COACH_SYSTEM_PROMPT = `You are Taevis, a chill snowboard coach.

Style:
- Short, punchy responses (2-4 sentences max for simple questions)
- Friendly but not overly wordy
- Get to the point quickly
- Use simple language

Rules:
- Keep it brief and digestible
- No citation markers like [1], [2]
- No markdown formatting
- Plain text only
- If listing tips, use short bullet points
- Answer yes/no questions directly first, then explain briefly`;

interface ChatRequest {
  message: string;
  sessionId: string;
  history?: { role: 'user' | 'coach'; content: string }[];
}

interface VideoReference {
  videoId: string;
  videoTitle: string;
  timestamp: number;
  url: string;
  thumbnail: string;
}

interface ChatResponse {
  response: string;
  videos: VideoReference[];
}

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { message, sessionId, history = [] }: ChatRequest = req.body;
    
    // If no message, return greeting
    if (!message || !message.trim()) {
      return res.status(200).json({
        response: "Hey! I'm Taevis, your snowboarding coach. What trick or technique can I help you with today?",
        videos: [],
      });
    }
    
    console.log('=== Chat API ===');
    console.log('Message:', message);
    console.log('History length:', history.length);
    
    // Step 1: Build context-aware search query
    // For follow-up questions, include the conversation topic
    const conversationTopic = extractConversationTopic(history);
    const searchQuery = conversationTopic 
      ? `${conversationTopic} ${message}` 
      : message;
    
    console.log('Conversation topic:', conversationTopic || 'none');
    console.log('Search query:', searchQuery);
    
    // Step 2: Search Pinecone with context-aware query
    const queryEmbedding = await generateEmbedding(searchQuery);
    const segments = await searchVideoSegments(queryEmbedding, 8);
    console.log(`Found ${segments.length} relevant segments`);
    
    // Step 3: Build context from segments
    const knowledgeContext = segments.length > 0
      ? `Here's relevant content from your videos:\n\n${segments.map((seg, i) => 
          `[${i + 1}] From "${seg.videoTitle}" (${formatTimestamp(seg.timestamp)}):\n"${seg.text}"`
        ).join('\n\n')}`
      : 'No specific video content found for this topic.';
    
    // Step 4: Build conversation context summary for the AI
    const conversationContext = conversationTopic
      ? `\n\nIMPORTANT CONTEXT: The user has been asking about "${conversationTopic}". Answer their follow-up question specifically in the context of ${conversationTopic}. Use your knowledge about this trick to give accurate answers.`
      : '';
    
    // Step 5: Build conversation history for Gemini
    const conversationHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));
    
    // Step 6: Generate response with Gemini
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    
    const chat = model.startChat({
      history: conversationHistory as any,
    });
    
    const prompt = `${COACH_SYSTEM_PROMPT}${conversationContext}\n\n${knowledgeContext}\n\nUser: ${message}\n\nRespond as Taevis:`;
    const result = await chat.sendMessage(prompt);
    let responseText = result.response.text();
    
    // Clean up any citation markers the AI might have included
    responseText = cleanResponse(responseText);
    
    console.log('AI Response:', responseText.substring(0, 200) + '...');
    
    // Step 7: Get unique videos for references (max 3)
    const videoMap = new Map<string, VideoSegment>();
    for (const seg of segments) {
      if (!videoMap.has(seg.videoId)) {
        videoMap.set(seg.videoId, seg);
      }
    }
    const videos: VideoReference[] = Array.from(videoMap.values())
      .slice(0, 3)
      .map(seg => ({
        videoId: seg.videoId,
        videoTitle: seg.videoTitle,
        timestamp: seg.timestamp,
        url: `https://youtube.com/watch?v=${seg.videoId}&t=${Math.floor(seg.timestamp)}s`,
        thumbnail: `https://img.youtube.com/vi/${seg.videoId}/maxresdefault.jpg`,
      }));
    
    return res.status(200).json({
      response: responseText,
      videos,
    });
    
  } catch (error: any) {
    console.error('Chat API Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Extract the main topic/trick from conversation history
 * Looks for trick names in the first few messages
 */
function extractConversationTopic(history: { role: string; content: string }[]): string | null {
  if (history.length === 0) return null;
  
  // Common trick patterns to look for
  const trickPatterns = [
    /backside\s*\d+/i,
    /frontside\s*\d+/i,
    /bs\s*\d+/i,
    /fs\s*\d+/i,
    /switch\s+\w+/i,
    /nollie\s+\w+/i,
    /cab\s*\d*/i,
    /method/i,
    /indy/i,
    /melon/i,
    /stalefish/i,
    /mute/i,
    /tail\s*grab/i,
    /nose\s*grab/i,
    /180|360|540|720|900|1080/,
    /carving/i,
    /buttering/i,
    /ollie/i,
    /rail/i,
    /box/i,
    /jump/i,
    /kicker/i,
  ];
  
  // Search through first few user messages for trick mentions
  for (const item of history.slice(0, 6)) {
    if (item.role === 'user') {
      for (const pattern of trickPatterns) {
        const match = item.content.match(pattern);
        if (match) {
          // Expand abbreviations
          let topic = match[0].toLowerCase();
          topic = topic.replace(/\bbs\b/i, 'backside');
          topic = topic.replace(/\bfs\b/i, 'frontside');
          return topic;
        }
      }
    }
  }
  
  // If no trick found, use the first user message as context
  const firstUserMsg = history.find(h => h.role === 'user');
  if (firstUserMsg && firstUserMsg.content.length < 100) {
    return firstUserMsg.content;
  }
  
  return null;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Clean up AI response - remove citation markers and formatting artifacts
 */
function cleanResponse(text: string): string {
  return text
    // Remove citation markers like [1], [2], (See: [1]), etc.
    .replace(/\[[\d,\s]+\]/g, '')
    .replace(/\(See:\s*\[[\d,\s]+\]\)/gi, '')
    .replace(/\(?\[?\d+\]?\)?/g, (match) => {
      // Only remove if it looks like a citation (not a number in context)
      if (match.includes('[') || match.includes(']')) return '';
      return match;
    })
    // Remove markdown formatting
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();
}
