/**
 * Shared TypeScript types for the API
 */

export interface UserContext {
  trick: string;
  featureSize?: 'small' | 'medium' | 'large' | 'xl' | 'flat';
  preTrick?: 'yes' | 'sometimes' | 'no' | 'unknown';
  edgeTransfers?: 'good' | 'okay' | 'struggling';
  issues?: string;
  spotLanding?: boolean | 'sometimes' | 'unknown';
  consistency?: 'always' | 'usually' | 'sometimes' | 'rarely' | 'never';
  control?: 'yes' | 'mostly' | 'no' | 'untried';
}

export interface VideoReference {
  videoId: string;
  title: string;
  thumbnail: string;
  timestamp: number;
  quote: string;
  url: string;
}

export interface ChatRequest {
  context: UserContext;
  message?: string;
  sessionId: string;
}

export interface SimilarVideo {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  similarity: number;
}

export interface ChatResponse {
  response: string;
  tips: string[];  // 10 AI-generated tips
  videos: VideoReference[];  // 5 videos from transcript search
  similarVideos: SimilarVideo[];  // 5 videos from title similarity search
  cached: boolean;
}

export interface VideoSegment {
  id: string;
  videoId: string;
  videoTitle: string;
  text: string;
  timestamp: number;
  duration: number;
  topics: string[];
}
