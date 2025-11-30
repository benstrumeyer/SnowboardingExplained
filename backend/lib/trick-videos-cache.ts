/**
 * Trick Videos Cache
 * Pre-built index of all video URLs grouped by trickName
 * Built once and loaded into memory for fast lookups
 */

interface TrickVideo {
  url: string;
  title: string;
  thumbnail: string;
}

interface TrickVideosCache {
  [trickName: string]: TrickVideo[];
}

let cache: TrickVideosCache | null = null;

export async function initializeTrickVideosCache(): Promise<void> {
  if (cache) return; // Already initialized
  
  try {
    // Try to load from file
    const fs = await import('fs');
    const path = await import('path');
    const cacheFile = path.join(process.cwd(), 'data', 'trick-videos-cache.json');
    
    if (fs.existsSync(cacheFile)) {
      const data = fs.readFileSync(cacheFile, 'utf-8');
      const parsed = JSON.parse(data) as TrickVideosCache;
      cache = parsed;
      console.log(`Loaded trick videos cache with ${Object.keys(cache || {}).length} tricks`);
      return;
    }
  } catch (error) {
    console.log('Could not load trick videos cache from file, will build on demand');
  }
  
  // Initialize empty cache
  cache = {};
}

export function getTrickVideos(trickName: string): TrickVideo[] {
  if (!cache) {
    console.warn('Trick videos cache not initialized');
    return [];
  }
  
  const normalized = trickName.toLowerCase();
  return cache[normalized] || [];
}

export function addTrickVideos(trickName: string, videos: TrickVideo[]): void {
  if (!cache) {
    cache = {};
  }
  
  const normalized = trickName.toLowerCase();
  cache[normalized] = videos;
}

export function getAllTricks(): string[] {
  if (!cache) return [];
  return Object.keys(cache);
}

export function getCacheStats(): { totalTricks: number; totalVideos: number } {
  if (!cache) return { totalTricks: 0, totalVideos: 0 };
  
  let totalVideos = 0;
  const tricks = Object.values(cache);
  for (const videos of tricks) {
    totalVideos += videos.length;
  }
  
  return {
    totalTricks: Object.keys(cache).length,
    totalVideos,
  };
}
