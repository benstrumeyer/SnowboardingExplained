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
    const url = `${config.apiUrl}/api/chat`;
    console.log('=== API Request ===');
    console.log('URL:', url);
    console.log('Context:', JSON.stringify(context, null, 2));
    console.log('Message:', message);
    console.log('SessionId:', sessionId);
    
    const response = await axios.post(url, {
      context,
      message,
      sessionId,
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('=== API Response ===');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error: any) {
    console.error('=== API Error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Response headers:', JSON.stringify(error.response?.headers, null, 2));
    console.error('Request config:', JSON.stringify({
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data,
    }, null, 2));
    
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
