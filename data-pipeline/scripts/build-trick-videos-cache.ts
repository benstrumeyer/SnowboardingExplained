/**
 * Build Trick Videos Cache
 * Queries Pinecone for all videos grouped by trickName
 * Outputs to backend/data/trick-videos-cache.json
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const INDEX_NAME = 'snowboarding-explained';

interface TrickVideo {
  url: string;
  title: string;
  thumbnail: string;
}

interface TrickVideosCache {
  [trickName: string]: TrickVideo[];
}

async function buildCache() {
  try {
    const index = pc.Index(INDEX_NAME);
    
    console.log('Building trick videos cache from Pinecone...');
    
    // Query with dummy vector to get all results
    const dummyVector = new Array(768).fill(0);
    const allResults = await index.query({
      vector: dummyVector,
      topK: 10000,
      includeMetadata: true,
    });
    
    console.log(`Found ${allResults.matches.length} total vectors`);
    
    const cache: TrickVideosCache = {};
    const videoIds = new Set<string>();
    
    // Group by trickName
    for (const match of allResults.matches) {
      const trickName = match.metadata?.trickName;
      const videoId = match.metadata?.videoId;
      
      if (!trickName || !videoId) continue;
      if (videoIds.has(videoId)) continue; // Skip duplicates
      
      const normalized = trickName.toLowerCase();
      
      if (!cache[normalized]) {
        cache[normalized] = [];
      }
      
      cache[normalized].push({
        url: `https://youtube.com/watch?v=${videoId}`,
        title: match.metadata?.videoTitle || 'Unknown',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      });
      
      videoIds.add(videoId);
    }
    
    // Save to file
    const outputPath = path.join(process.cwd(), 'backend', 'data', 'trick-videos-cache.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(cache, null, 2));
    
    console.log(`\n✓ Cache built successfully!`);
    console.log(`  Tricks: ${Object.keys(cache).length}`);
    console.log(`  Total videos: ${videoIds.size}`);
    console.log(`  Saved to: ${outputPath}`);
    
    // Print summary
    console.log('\nTricks in cache:');
    Object.entries(cache).forEach(([trick, videos]) => {
      console.log(`  ${trick}: ${videos.length} videos`);
    });
    
  } catch (error) {
    console.error('Error building cache:', error);
    process.exit(1);
  }
}

buildCache().then(() => {
  console.log('\n✓ Done!');
  process.exit(0);
});
