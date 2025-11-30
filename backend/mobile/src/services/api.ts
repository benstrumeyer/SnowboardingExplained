/**
 * API Service
 * Handles communication with the conversational coach backend
 */

import axios from 'axios';
import { config } from '../config';

export interface VideoReference {
  videoId: string;
  videoTitle: string;
  timestamp: number;
  url: string;
  thumbnail: string;
  duration?: number;  // Total video duration in seconds
}

export interface ChatMessage {
  type: 'text' | 'tip' | 'follow-up';
  content: string;
  video?: VideoReference;
}

export interface ChatResponse {
  messages: ChatMessage[];
  hasMoreTips: boolean;
  videos: VideoReference[];  // 3 videos per question
  tipIdsShown?: string[];    // Track which tips were shown
}

export interface ChatHistoryItem {
  role: 'user' | 'coach';
  content: string;
}

/**
 * Send a message to the coach
 */
export async function sendMessage(
  message: string,
  sessionId: string,
  history: ChatHistoryItem[] = [],
  shownVideoIds: string[] = [],
  shownTipIds: string[] = []
): Promise<ChatResponse> {
  try {
    const url = `${config.apiUrl}/api/chat`;
    console.log('=== API Request ===');
    console.log('URL:', url);
    console.log('Message:', message);
    console.log('History length:', history.length);
    console.log('Shown videos:', shownVideoIds.length);
    console.log('Shown tips:', shownTipIds.length);
    
    const response = await axios.post(url, {
      message,
      sessionId,
      history,
      shownVideoIds,
      shownTipIds,
    }, {
      timeout: 60000, // 60s for AI response
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('=== API Response ===');
    console.log('Messages:', response.data.messages?.length);
    console.log('Has more tips:', response.data.hasMoreTips);
    
    return response.data;
  } catch (error: any) {
    console.error('=== API Error ===');
    console.error('Error:', error.message);
    console.error('Response:', error.response?.data);
    
    throw new Error(error.response?.data?.message || error.message || 'Failed to get response');
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${config.apiUrl}/api/health`);
    return response.data.status === 'ok';
  } catch (error) {
    return false;
  }
}
