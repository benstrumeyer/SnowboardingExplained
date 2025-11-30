/**
 * API Service
 * Handles communication with the backend
 * Updated for simplified coach flow
 */

import axios from 'axios';
import { config } from '../config';

export interface TipWithVideo {
  tip: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  url: string;
  thumbnail: string;
}

export interface ChatResponse {
  greeting?: string;
  interpretation?: {
    original: string;
    understood: string;
    concepts: string[];
  };
  coachMessage: string;
  tips: TipWithVideo[];
  cached: boolean;
  costs?: {
    interpretation: number;
    tipExtraction: number;
    coachMessage: number;
    embedding: number;
    total: number;
  };
}

/**
 * Send a message to the coach
 */
export async function sendMessage(
  message: string,
  sessionId: string = 'default',
  isFollowUp: boolean = false,
  previousContext?: { interpretedMeaning: string; concepts: string[] }
): Promise<ChatResponse> {
  try {
    const url = `${config.apiUrl}/api/chat`;
    console.log('=== API Request ===');
    console.log('URL:', url);
    console.log('Message:', message);
    console.log('SessionId:', sessionId);
    console.log('IsFollowUp:', isFollowUp);
    
    const response = await axios.post(url, {
      message,
      sessionId,
      isFollowUp,
      previousContext,
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('=== API Response ===');
    console.log('Status:', response.status);
    console.log('Cached:', response.data.cached);
    console.log('Tips count:', response.data.tips?.length);
    if (response.data.costs) {
      console.log('Costs:', response.data.costs);
    }
    
    return response.data;
  } catch (error: any) {
    console.error('=== API Error ===');
    console.error('Error:', error.message);
    console.error('Response:', error.response?.data);
    
    throw new Error(error.response?.data?.message || error.message || 'Failed to get coaching response');
  }
}

/**
 * Get initial greeting (no message)
 */
export async function getGreeting(sessionId: string = 'default'): Promise<ChatResponse> {
  return sendMessage('', sessionId);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${config.apiUrl}/api/health`);
    return response.data.status === 'ok';
  } catch (error) {
    return false;
  }
}
