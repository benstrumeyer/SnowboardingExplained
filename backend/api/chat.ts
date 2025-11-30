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

const COACH_SYSTEM_PROMPT = `You are Taevis, a friendly and knowledgeable snowboard coach from the "Snowboarding Explained" YouTube channel.

Your personality:
- Warm, encouraging, and supportive
- Break down techniques into simple, actionable steps
- Use relatable analogies
- Conversational, like chatting on a chairlift
- Passionate about helping riders progress

Rules:
- Answer the user's question naturally and conversationally
- Use the provided video transcript content as your knowledge base
- Reference specific tips from the transcripts when relevant
- If asked for a specific number of tips, provide that many
- Keep responses concise but helpful
- If you don't have relevant content, be honest and suggest what you can help with

You have access to transcript content from your YouTube videos. Use this knowledge to help riders.`;

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
    
    // Step 1: Search Pinecone for relevant content
    const queryEmbedding = await generateEmbedding(message);
    const segments = await searchVideoSegments(queryEmbedding, 8);
    console.log(`Found ${segments.length} relevant segments`);
    
    // Step 2: Build context from segments
    const knowledgeContext = segments.length > 0
      ? `Here's relevant content from your videos:\n\n${segments.map((seg, i) => 
          `[${i + 1}] From "${seg.videoTitle}" (${formatTimestamp(seg.timestamp)}):\n"${seg.text}"`
        ).join('\n\n')}`
      : 'No specific video content found for this topic.';
    
    // Step 3: Build conversation history for context
    const conversationHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));
    
    // Step 4: Generate response with Gemini
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
    
    const chat = model.startChat({
      history: conversationHistory as any,
    });
    
    const prompt = `${COACH_SYSTEM_PROMPT}\n\n${knowledgeContext}\n\nUser: ${message}\n\nRespond as Taevis:`;
    const result = await chat.sendMessage(prompt);
    const responseText = result.response.text();
    
    // Step 5: Get unique videos for references (max 3)
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

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
