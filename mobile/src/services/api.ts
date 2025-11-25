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
    const response = await axios.post(`${config.apiUrl}/api/chat`, {
      context,
      message,
      sessionId,
    });
    
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error);
    throw new Error(error.response?.data?.message || 'Failed to get coaching response');
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
