/**
 * API Service
 * Handles communication with the conversational coach backend
 */

import axios from 'axios';
import { config, DEBUG } from '../config';

// Create axios instance with logging
const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: config.timeout,
});

// Add request interceptor
apiClient.interceptors.request.use(
  (request) => {
    if (DEBUG) {
      console.log(`[API] ${request.method?.toUpperCase()} ${request.url}`);
      console.log('[API] Headers:', request.headers);
      if (request.data) {
        console.log('[API] Body:', JSON.stringify(request.data, null, 2));
      }
    }
    return request;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (DEBUG) {
      console.log(`[API] Response ${response.status}:`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.message);
    if (error.response) {
      console.error('[API] Status:', error.response.status);
      console.error('[API] Data:', error.response.data);
    } else if (error.request) {
      console.error('[API] No response received:', error.request);
    }
    return Promise.reject(error);
  }
);

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
  videos: VideoReference[];  // Videos to show this turn
  allTrickVideos?: VideoReference[];  // All videos for this trick (ranked by relevance)
  tipIdsShown?: string[];    // Track which tips were shown
  currentTrick?: string;     // Current trick being discussed (for follow-ups)
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
  shownVideoUrls: string[] = [],
  shownTipIds: string[] = [],
  currentTrick?: string
): Promise<ChatResponse> {
  try {
    const response = await apiClient.post('/api/chat', {
      message,
      sessionId,
      history,
      shownVideoUrls,
      shownTipIds,
      currentTrick,
    });
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to get response');
  }
}

export async function checkHealth(): Promise<{ ok: boolean; message: string; uptime?: number }> {
  try {
    console.log('[Health Check] 🔍 Connecting to:', config.apiUrl);
    console.log('[Health Check] ⏱️ Timeout: 5000ms');
    
    const startTime = Date.now();
    const response = await apiClient.get('/api/health', { timeout: 5000 });
    const duration = Date.now() - startTime;
    
    console.log('[Health Check] ✅ Backend is healthy (took', duration, 'ms)');
    console.log('[Health Check] Response:', response.data);
    
    return {
      ok: true,
      message: 'Backend is running',
      uptime: response.data.data?.uptime
    };
  } catch (error: any) {
    console.error('[Health Check] ❌ Backend is unreachable');
    console.error('[Health Check] Error type:', error.code || error.name);
    console.error('[Health Check] Error message:', error.message);
    
    if (error.response) {
      console.error('[Health Check] Response status:', error.response.status);
      console.error('[Health Check] Response data:', error.response.data);
    } else if (error.request) {
      console.error('[Health Check] Request made but no response received');
      console.error('[Health Check] Request:', error.request);
    } else {
      console.error('[Health Check] Error during request setup:', error);
    }
    
    return {
      ok: false,
      message: error.message || 'Backend is unreachable'
    };
  }
}

export function getApiUrl(): string {
  return config.apiUrl;
}
