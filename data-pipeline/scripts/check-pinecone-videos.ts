/**
 * Check what video IDs exist in Pinecone
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

async function main() {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX || 'snowboarding-explained');
  
  console.log('📊 Checking unique video IDs in Pinecone...\n');
  
  const videoIds = new Map<string, { count: number; title?: string; hasTrickName: boolean }>();
  let paginationToken: string | undefined;
  let totalRecords = 0;
  
  do {
    const listResponse = await index.listPaginated({ limit: 100, paginationToken });
    const ids = listResponse.vectors?.map(v => v.id).filter((id): id is string => !!id) || [];
    
    if (ids.length === 0) break;
    
    const fetchResponse = await index.fetch(ids);
    
    for (const [id, vector] of Object.entries(fetchResponse.records || {})) {
      if (!vector?.metadata) continue;
      totalRecords++;
      
      const { videoId, videoTitle, trickName } = vector.metadata as any;
      
      if (videoId) {
        if (!videoIds.has(videoId)) {
          videoIds.set(videoId, { count: 0, title: videoTitle, hasTrickName: false });
        }
        const entry = videoIds.get(videoId)!;
        entry.count++;
        if (trickName && trickName !== 'Other') {
          entry.hasTrickName = true;
        }
      }
    }
    
    paginationToken = listResponse.pagination?.next;
    process.stdout.write(`\rProcessed ${totalRecords} records...`);
  } while (paginationToken);
  
  console.log(`\n\n📹 Found ${videoIds.size} unique videos with ${totalRecords} total records\n`);
  
  // Sort by count
  const sorted = [...videoIds.entries()].sort((a, b) => b[1].count - a[1].count);
  
  console.log('Top videos by record count:');
  console.log('='.repeat(100));
  
  for (const [videoId, info] of sorted.slice(0, 30)) {
    const trickStatus = info.hasTrickName ? '✅' : '❌';
    console.log(`${trickStatus} ${videoId} (${info.count} records) - ${info.title?.substring(0, 60) || 'No title'}`);
  }
  
  console.log('\n' + '='.repeat(100));
  console.log(`Videos with trickName: ${sorted.filter(([, i]) => i.hasTrickName).length}`);
  console.log(`Videos without trickName: ${sorted.filter(([, i]) => !i.hasTrickName).length}`);
}

main().catch(console.error);
