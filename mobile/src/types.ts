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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  videos?: VideoReference[];
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  context: UserContext;
  messages: ChatMessage[];
  createdAt: Date;
}
