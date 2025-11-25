/**
 * API Service
 * Handles communication with the backend
 */

import axios from 'axios';
import { config } from '../config';
import type { UserContext, VideoReference } from '../types';

interface ChatResponse {
  response: string;
  videos: VideoReference[];
  cached: boolean;
}

export async function sendChatMessage(
  context: UserContext,
  message?: string,
  sessionId: string = 'default'
): Promise<ChatResponse> {
  try {
    console.log('Sending request to:', `${config.apiUrl}/api/chat`);
    console.log('Context:', context);
    
    const response = await axios.post(
      `${config.apiUrl}/api/chat`,
      {
        context,
        message,
        sessionId,
      },
      {
        timeout: 30000, // 30 second timeout (AI can be slow)
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('Response received:', response.status);
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error);
    console.error('Error details:', error.response?.data);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The AI is taking too long to respond. Try again.');
    }
    
    throw new Error(error.response?.data?.message || error.message || 'Failed to get coaching response');
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
