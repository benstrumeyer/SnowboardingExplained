/**
 * Show existing Pinecone classifications with video titles
 * Usage: npx tsx scripts/show-classifications.ts
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
  
  console.log('📊 Fetching all classifications...\n');
  
  let paginationToken: string | undefined;
  const classifications: { id: string; title: string; trickName: string }[] = [];
  
  do {
    const listResponse = await index.listPaginated({ limit: 100, paginationToken });
    const ids = listResponse.vectors?.map(v => v.id).filter((id): id is string => !!id) || [];
    
    if (ids.length === 0) break;
    
    const fetchResponse = await index.fetch(ids);
    
    for (const [id, vector] of Object.entries(fetchResponse.records || {})) {
      if (!vector?.metadata) continue;
      const { videoTitle, trickName } = vector.metadata as any;
      classifications.push({ id, title: videoTitle || 'Unknown', trickName: trickName || 'Unclassified' });
    }
    
    paginationToken = listResponse.pagination?.next;
  } while (paginationToken);
  
  // Group by trickName
  const byTrick = new Map<string, { id: string; title: string }[]>();
  for (const c of classifications) {
    if (!byTrick.has(c.trickName)) byTrick.set(c.trickName, []);
    byTrick.get(c.trickName)!.push({ id: c.id, title: c.title });
  }
  
  // Sort by count
  const sorted = [...byTrick.entries()].sort((a, b) => b[1].length - a[1].length);
  
  console.log('='.repeat(80));
  console.log('CLASSIFICATIONS BY TRICK');
  console.log('='.repeat(80));
  
  for (const [trickName, items] of sorted) {
    console.log(`\n🏂 ${trickName} (${items.length} segments)`);
    console.log('-'.repeat(60));
    
    // Group by video title
    const byTitle = new Map<string, string[]>();
    for (const item of items) {
      if (!byTitle.has(item.title)) byTitle.set(item.title, []);
      byTitle.get(item.title)!.push(item.id);
    }
    
    for (const [title, ids] of byTitle) {
      console.log(`  "${title}" (${ids.length} chunks)`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Total: ${classifications.length} segments across ${byTrick.size} trick categories`);
}

main().catch(console.error);
