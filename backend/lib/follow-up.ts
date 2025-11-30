/**
 * Follow-up Mode Handler
 * Detects and handles follow-up questions after initial coaching
 * Requirements: 12.1, 12.2, 12.3
 */

import type { UserContext } from './types';

export interface SessionState {
  sessionId: string;
  context: UserContext;
  initialCoachingComplete: boolean;
  messageCount: number;
  createdAt: Date;
  lastMessageAt: Date;
}

// In-memory session store (in production, use Redis or similar)
const sessions = new Map<string, SessionState>();

/**
 * Get or create a session
 */
export function getSession(sessionId: string, context?: UserContext): SessionState {
  let session = sessions.get(sessionId);
  
  if (!session && context) {
    session = {
      sessionId,
      context,
      initialCoachingComplete: false,
      messageCount: 0,
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };
    sessions.set(sessionId, session);
  }
  
  return session!;
}

/**
 * Update session after a message
 */
export function updateSession(
  sessionId: string, 
  updates: Partial<SessionState>
): SessionState | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  Object.assign(session, updates, { lastMessageAt: new Date() });
  session.messageCount++;
  
  return session;
}

/**
 * Mark initial coaching as complete
 */
export function markInitialCoachingComplete(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.initialCoachingComplete = true;
    session.lastMessageAt = new Date();
  }
}

/**
 * Check if this is a follow-up message (after initial coaching)
 */
export function isFollowUp(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  return session?.initialCoachingComplete ?? false;
}

/**
 * Get the original context for a session
 */
export function getSessionContext(sessionId: string): UserContext | null {
  const session = sessions.get(sessionId);
  return session?.context ?? null;
}

/**
 * Clear a session
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Clean up old sessions (call periodically)
 */
export function cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, session] of sessions) {
    if (now - session.lastMessageAt.getTime() > maxAgeMs) {
      sessions.delete(id);
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Get session stats
 */
export function getSessionStats(): { total: number; active: number } {
  const now = Date.now();
  const activeThreshold = 30 * 60 * 1000; // 30 minutes
  
  let active = 0;
  for (const session of sessions.values()) {
    if (now - session.lastMessageAt.getTime() < activeThreshold) {
      active++;
    }
  }
  
  return { total: sessions.size, active };
}
