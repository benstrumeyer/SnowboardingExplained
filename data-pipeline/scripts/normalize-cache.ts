/**
 * Normalize Trick Videos Cache
 * Converts all trick names to use hyphens instead of spaces
 * Copies to backend/data/trick-videos-cache.json
 */

import * as fs from 'fs';
import * as path from 'path';

async function normalizeCache() {
  try {
    // Read the cache
    const cacheFile = path.join(process.cwd(), 'backend', 'data', 'trick-videos-cache.json');
    const data = fs.readFileSync(cacheFile, 'utf-8');
    const cache = JSON.parse(data);
    
    // Normalize keys: replace spaces with hyphens
    const normalized: any = {};
    for (const [key, videos] of Object.entries(cache)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '-');
      normalized[normalizedKey] = videos;
    }
    
    console.log('Original tricks:', Object.keys(cache).length);
    console.log('Normalized tricks:', Object.keys(normalized).length);
    console.log('\nTricks:');
    Object.keys(normalized).forEach(trick => {
      const count = (normalized[trick] as any[]).length;
      console.log(`  ${trick}: ${count} videos`);
    });
    
    // Write to backend
    const backendPath = path.join(process.cwd(), '..', 'backend', 'data', 'trick-videos-cache.json');
    fs.writeFileSync(backendPath, JSON.stringify(normalized, null, 2));
    
    console.log(`\n✓ Normalized cache written to: ${backendPath}`);
    
  } catch (error) {
    console.error('Error normalizing cache:', error);
    process.exit(1);
  }
}

normalizeCache().then(() => {
  console.log('\n✓ Done!');
  process.exit(0);
});
