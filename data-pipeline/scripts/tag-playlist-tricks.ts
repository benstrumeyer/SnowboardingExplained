/**
 * Tag Playlist Tricks with trickName
 * 
 * Maps video titles from the trick tutorial playlist to trickName
 * and updates Pinecone records with the correct trickName metadata
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Video ID to trick name mapping from the playlist
// Extracted from video titles - skipping first 2 intro videos
const PLAYLIST_TRICKS: Record<string, { trickName: string; title: string }> = {
  // Skip: "Take Your Snowboarding to New Heights" and "How To Hit Your Jumps Snowboarding"
  'ln03njzMzuk': { trickName: 'Backside 180', title: 'Master The Backside 180 On Your Snowboard' },
  'sBbL8FsRvXc': { trickName: 'Frontside 180', title: 'Master The Frontside 180 On Your Snowboard' },
  'wcz_QMCy2-s': { trickName: 'Backside 360', title: 'How To Backside 360 On A Snowboard' },
  'dLZwlLgohFw': { trickName: 'Frontside 360', title: 'How To Frontside 360 On A Snowboard' },
  'tCoQ3sSYT2A': { trickName: 'Backside 540', title: 'How To Backside 540 On A Snowboard' },
  'MS6LSphIbRo': { trickName: 'Frontside 540', title: 'How To Frontside 540 On A Snowboard' },
  'C2EJwuxG4Fs': { trickName: 'Backside 720', title: 'How To Perfect Your Backside 720' },
  'qDJSAetVz1k': { trickName: 'Frontside 720', title: 'How To Dial In Your Frontside 720' },
  'CdshWEEKjXc': { trickName: 'Backside 900', title: 'How To Backside 900 Like A Pro' },
  'Tdj5eI7SLC4': { trickName: 'Frontside 900', title: 'How To Frontside 900 Like A Pro' },
  '0luOaDmSTW4': { trickName: 'Frontside 1080', title: 'The Key For Frontside 1080\'s' },
  'BAPfrEr7NXk': { trickName: 'Back Double Cork 1080', title: 'Make Back Dub 1080\'s Look Easy' },
};

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function main() {
  console.log('🏂 Tag Playlist Tricks with trickName\n');
  console.log('='.repeat(60));
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX || 'snowboarding-explained');
  
  // First, let's see what records exist for each video
  console.log('\n📊 Checking existing records for playlist videos...\n');
  
  const videoIds = Object.keys(PLAYLIST_TRICKS);
  let totalFound = 0;
  let totalUpdated = 0;
  
  for (const videoId of videoIds) {
    const trickInfo = PLAYLIST_TRICKS[videoId];
    console.log(`\n🎬 ${trickInfo.trickName} (${videoId})`);
    console.log(`   Title: ${trickInfo.title}`);
    
    // Query for records with this videoId
    // We'll use a dummy query and filter by videoId
    const dummyEmbedding = await generateEmbedding(trickInfo.trickName);
    
    const queryResponse = await index.query({
      vector: dummyEmbedding,
      topK: 100,
      filter: { videoId: { $eq: videoId } },
      includeMetadata: true,
    });
    
    const matches = queryResponse.matches || [];
    console.log(`   Found: ${matches.length} records`);
    totalFound += matches.length;
    
    if (matches.length === 0) {
      console.log(`   ⚠️  No records found for this video!`);
      continue;
    }
    
    // Check if they already have the correct trickName
    const needsUpdate = matches.filter(m => {
      const currentTrickName = (m.metadata as any)?.trickName;
      return currentTrickName !== trickInfo.trickName;
    });
    
    if (needsUpdate.length === 0) {
      console.log(`   ✅ All records already have correct trickName`);
      continue;
    }
    
    console.log(`   📝 Updating ${needsUpdate.length} records with trickName="${trickInfo.trickName}"...`);
    
    // Update each record with the correct trickName
    const updates = needsUpdate.map(match => ({
      id: match.id,
      metadata: {
        ...(match.metadata as Record<string, any>),
        trickName: trickInfo.trickName,
        isPrimary: true,  // Mark as main trick tutorial
      },
    }));
    
    // Batch update
    for (let i = 0; i < updates.length; i += 100) {
      const batch = updates.slice(i, i + 100);
      await index.update({
        id: batch[0].id,
        metadata: batch[0].metadata,
      });
      
      // Update one at a time since Pinecone update only takes one record
      for (const update of batch) {
        await index.update({
          id: update.id,
          metadata: update.metadata,
        });
      }
    }
    
    totalUpdated += needsUpdate.length;
    console.log(`   ✅ Updated ${needsUpdate.length} records`);
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log(`   Total records found: ${totalFound}`);
  console.log(`   Total records updated: ${totalUpdated}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
