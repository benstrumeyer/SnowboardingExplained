/**
 * Simple Cache Service
 * For now, uses in-memory cache
 * Can be upgraded to Vercel KV later
 */

import type { UserContext } from './types';

// Simple in-memory cache (will reset on each deployment)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function generateCacheKey(context: UserContext): string {
  const normalized = {
    trick: context.trick.toLowerCase().trim(),
    size: context.featureSize || 'unknown',
    issues: (context.issues || '').toLowerCase().trim().substring(0, 50),
  };
  
  return `coaching:${normalized.trick}:${normalized.size}:${normalized.issues}`;
}

export async function getCachedResponse(context: UserContext): Promise<string | null> {
  const key = generateCacheKey(context);
  const cached = cache.get(key);
  
  if (!cached) return null;
  
  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

export async function cacheResponse(context: UserContext, response: string): Promise<void> {
  const key = generateCacheKey(context);
  cache.set(key, {
    data: response,
    timestamp: Date.now(),
  });
}
