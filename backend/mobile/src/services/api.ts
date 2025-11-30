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

export interface ChatResponse {
  response: string;
  videos: VideoReference[];
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
  shownVideoIds: string[] = []
): Promise<ChatResponse> {
  try {
    const url = `${config.apiUrl}/api/chat`;
    console.log('=== API Request ===');
    console.log('URL:', url);
    console.log('Message:', message);
    console.log('History length:', history.length);
    console.log('Shown videos:', shownVideoIds.length);
    
    const response = await axios.post(url, {
      message,
      sessionId,
      history,
      shownVideoIds,
    }, {
      timeout: 60000, // 60s for AI response
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('=== API Response ===');
    console.log('Response length:', response.data.response?.length);
    console.log('Videos:', response.data.videos?.length);
    
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
