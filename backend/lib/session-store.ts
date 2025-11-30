/**
 * Session Store - DEPRECATED
 * 
 * NOTE: This was an attempt to track videos server-side, but Vercel serverless functions
 * are stateless - each request may go to a different instance, so in-memory state is lost.
 * 
 * Instead, we rely on the client to track and send back shownVideoIds.
 * This is more reliable for serverless environments.
 */

// Keeping this file for reference but not using it
export function getSession(sessionId: string) {
  return { shownVideoIds: new Set() };
}

export function addShownVideos(sessionId: string, videoIds: string[]): void {
  // No-op - client handles tracking
}

export function hasShownVideo(sessionId: string, videoId: string): boolean {
  // No-op - client handles tracking
  return false;
}

export function getShownVideos(sessionId: string): string[] {
  // No-op - client handles tracking
  return [];
}
