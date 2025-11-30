/**
 * TypeScript types for the mobile app
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

export interface SimilarVideo {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tips?: string[];  // 10 AI-generated tips
  videos?: VideoReference[];  // Videos from transcript search
  similarVideos?: SimilarVideo[];  // Videos from title similarity
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  context: UserContext;
  messages: ChatMessage[];
  createdAt: Date;
}
