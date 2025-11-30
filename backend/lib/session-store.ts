/**
 * Session Store
 * Tracks videos shown during a session to prevent duplicates
 */

interface SessionData {
  shownVideoIds: Set<string>;
  createdAt: number;
  lastAccessedAt: number;
}

// In-memory store - will be cleared on server restart
// For production, consider Redis or a database
const sessions = new Map<string, SessionData>();

// Clean up old sessions every 30 minutes
const CLEANUP_INTERVAL = 30 * 60 * 1000;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [sessionId, data] of sessions.entries()) {
    if (now - data.lastAccessedAt > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Session cleanup: removed ${cleaned} expired sessions`);
  }
}, CLEANUP_INTERVAL);

export function getSession(sessionId: string): SessionData {
  let session = sessions.get(sessionId);
  
  if (!session) {
    // Create new session
    session = {
      shownVideoIds: new Set(),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };
    sessions.set(sessionId, session);
    console.log(`Created new session: ${sessionId}`);
  } else {
    // Update last accessed time
    session.lastAccessedAt = Date.now();
  }
  
  return session;
}

export function addShownVideos(sessionId: string, videoIds: string[]): void {
  const session = getSession(sessionId);
  
  for (const videoId of videoIds) {
    session.shownVideoIds.add(videoId);
  }
  
  console.log(`Session ${sessionId}: added ${videoIds.length} videos, total shown: ${session.shownVideoIds.size}`);
}

export function hasShownVideo(sessionId: string, videoId: string): boolean {
  const session = getSession(sessionId);
  return session.shownVideoIds.has(videoId);
}

export function getShownVideos(sessionId: string): string[] {
  const session = getSession(sessionId);
  return Array.from(session.shownVideoIds);
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
  console.log(`Cleared session: ${sessionId}`);
}

export function getSessionStats(): { totalSessions: number; totalVideosTracked: number } {
  let totalVideosTracked = 0;
  
  for (const session of sessions.values()) {
    totalVideosTracked += session.shownVideoIds.size;
  }
  
  return {
    totalSessions: sessions.size,
    totalVideosTracked,
  };
}
