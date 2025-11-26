/**
 * Extract existing video IDs from Pinecone database
 * This creates/updates the processed-videos.json file
 */

import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🔍 Extracting existing video IDs from Pinecone...\n');
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX!);
  
  const stats = await index.describeIndexStats();
  console.log(`📊 Total vectors in database: ${stats.totalRecordCount}\n`);
  
  // Since Pinecone doesn't have a direct "list all IDs" method,
  // we'll use the vector ID pattern: videoId-chunkNumber
  // We need to query with dummy vectors to get sample IDs
  
  console.log('📥 Fetching sample vectors to extract video IDs...');
  
  const videoIds = new Set<string>();
  
  // Create a dummy embedding (768 dimensions for text-embedding-004)
  const dummyVector = new Array(768).fill(0);
  
  // Query multiple times with different dummy vectors to get more coverage
  for (let i = 0; i < 10; i++) {
    try {
      const results = await index.query({
        vector: dummyVector.map(() => Math.random()),
        topK: 100,
        includeMetadata: true,
      });
      
      results.matches?.forEach((match: any) => {
        // Extract video ID from the vector ID (format: videoId-chunkNumber)
        const videoId = match.id.split('-')[0];
        if (videoId && match.metadata?.videoId) {
          videoIds.add(match.metadata.videoId);
        }
      });
      
      console.log(`  Query ${i + 1}/10: Found ${videoIds.size} unique videos so far...`);
    } catch (error: any) {
      console.log(`  ⚠️  Query ${i + 1} failed: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Found ${videoIds.size} unique videos in database\n`);
  
  // Save to file
  const videoIdArray = Array.from(videoIds);
  
  // Ensure data directory exists
  try {
    await fs.mkdir('data', { recursive: true });
  } catch {}
  
  await fs.writeFile(
    'data/processed-videos.json',
    JSON.stringify(videoIdArray, null, 2)
  );
  
  console.log('💾 Saved to data/processed-videos.json');
  console.log('\nVideo IDs:');
  videoIdArray.forEach((id, i) => {
    console.log(`  ${i + 1}. ${id} - https://youtube.com/watch?v=${id}`);
  });
  
  console.log('\n🎉 Done! Now you can run the scraper and it will skip these videos.');
}

main().catch(console.error);
