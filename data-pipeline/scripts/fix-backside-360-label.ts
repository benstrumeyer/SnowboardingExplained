/**
 * Fix mislabeled video: "backside 360s fully explained"
 * Currently labeled as backside-720, should be backside-360
 * Updates Pinecone index and local data files
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const INDEX_NAME = 'snowboarding-explained';

async function fixBackside360Label() {
  try {
    const index = pc.Index(INDEX_NAME);
    
    console.log('Searching for "backside 360s fully explained" video...');
    
    // List all vectors to find the one we're looking for
    // We'll use a dummy vector query with a high topK to get many results
    const dummyVector = new Array(768).fill(0);
    
    const allResults = await index.query({
      vector: dummyVector,
      topK: 10000,
      includeMetadata: true,
    });
    
    const matches = allResults.matches.filter(m => 
      m.metadata?.videoTitle?.toLowerCase().includes('360') &&
      m.metadata?.videoTitle?.toLowerCase().includes('explained') &&
      m.metadata?.videoTitle?.toLowerCase().includes('backside')
    );
    
    if (matches.length === 0) {
      console.log('No matching videos found');
      return;
    }
    
    console.log(`Found ${matches.length} potential matches:`);
    matches.forEach((m, i) => {
      console.log(`${i + 1}. ${m.metadata?.videoTitle} (trickName: ${m.metadata?.trickName})`);
    });
    
    // Update all matches
    for (const match of matches) {
      await updateVideoLabel(index, match.id, match.metadata);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function updateVideoLabel(index: any, vectorId: string, metadata: any) {
  try {
    console.log(`\nUpdating video: ${metadata.videoTitle}`);
    console.log(`  Current trickName: ${metadata.trickName}`);
    console.log(`  New trickName: backside-360`);
    
    // Update the metadata in Pinecone
    const updatedMetadata = {
      ...metadata,
      trickName: 'backside-360',
      trickId: 'backside-360',
    };
    
    await index.update({
      id: vectorId,
      metadata: updatedMetadata,
    });
    
    console.log(`✓ Updated in Pinecone`);
    
    // Also update local chunks file if it exists
    const chunksPath = path.join(__dirname, '../data/chunks/all-chunks.json');
    if (fs.existsSync(chunksPath)) {
      const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));
      let updated = false;
      
      for (const chunk of chunks) {
        if (chunk.videoId === metadata.videoId && 
            chunk.videoTitle === metadata.videoTitle) {
          chunk.trickName = 'backside-360';
          chunk.trickId = 'backside-360';
          updated = true;
        }
      }
      
      if (updated) {
        fs.writeFileSync(chunksPath, JSON.stringify(chunks, null, 2));
        console.log(`✓ Updated local chunks file`);
      }
    }
    
  } catch (error) {
    console.error(`Error updating video: ${error}`);
  }
}

fixBackside360Label().then(() => {
  console.log('\n✓ Done!');
  process.exit(0);
});
