/**
 * Block Snowboard Addiction Videos
 * 
 * Updates Pinecone records to remove video links from Snowboard Addiction videos.
 * We keep the tips/transcripts but don't link to their videos.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

// Snowboard Addiction video IDs to block
const BLOCKED_VIDEO_IDS = [
  'sf3_cVRWatQ',  // How To Hit Your Jumps
  '-bCYIDG_2wg',  // Secrets Of Popping
  'ln03njzMzuk',  // Backside 180
  'sBbL8FsRvXc',  // Frontside 180
  'wcz_QMCy2-s',  // Backside 360
  'dLZwlLgohFw',  // Frontside 360
  'tCoQ3sSYT2A',  // Backside 540
  'MS6LSphIbRo',  // Frontside 540
  'C2EJwuxG4Fs',  // Backside 720
  'qDJSAetVz1k',  // Frontside 720
  'CdshWEEKjXc',  // Backside 900
  'Tdj5eI7SLC4',  // Frontside 900
  '0luOaDmSTW4',  // Frontside 1080
  'BAPfrEr7NXk',  // Back Dub 1080
];

async function blockSnowboardAddictionVideos() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  const index = pinecone.index(indexName);

  console.log('Fetching all records to find Snowboard Addiction videos...\n');

  let totalUpdated = 0;

  for (const videoId of BLOCKED_VIDEO_IDS) {
    console.log(`\nProcessing videoId: ${videoId}`);
    
    // Query for records with this videoId
    // We need to use a dummy vector since Pinecone requires it
    const dummyVector = new Array(768).fill(0);
    
    const results = await index.query({
      vector: dummyVector,
      topK: 100,
      includeMetadata: true,
      filter: {
        videoId: { $eq: videoId }
      }
    });

    if (!results.matches || results.matches.length === 0) {
      console.log(`  No records found for ${videoId}`);
      continue;
    }

    console.log(`  Found ${results.matches.length} records`);

    // Update each record to mark it as blocked (remove video link capability)
    for (const match of results.matches) {
      const metadata = match.metadata as any;
      
      // Update metadata to mark as blocked - clear the videoId so it won't be linked
      await index.update({
        id: match.id,
        metadata: {
          ...metadata,
          videoId: '',  // Clear the video ID
          videoTitle: metadata.videoTitle + ' [Tips Only]',
          isBlocked: true,  // Mark as blocked
          originalVideoId: videoId,  // Keep original for reference
        }
      });
      
      totalUpdated++;
      process.stdout.write('.');
    }
    
    console.log(` Updated ${results.matches.length} records`);
  }

  console.log(`\n\nDone! Updated ${totalUpdated} total records.`);
  console.log('These videos will no longer be linked in the app.');
}

blockSnowboardAddictionVideos().catch(console.error);
