/**
 * Show each tip text with its trickName classification
 * Read-only - no writes to Pinecone
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
  
  console.log('📊 Fetching all tips with trickName...\n');
  
  // Group tips by trickName
  const byTrick = new Map<string, string[]>();
  let paginationToken: string | undefined;
  
  do {
    const listResponse = await index.listPaginated({ limit: 100, paginationToken });
    const ids = listResponse.vectors?.map(v => v.id).filter((id): id is string => !!id) || [];
    
    if (ids.length === 0) break;
    
    const fetchResponse = await index.fetch(ids);
    
    for (const [id, vector] of Object.entries(fetchResponse.records || {})) {
      if (!vector?.metadata) continue;
      const { text, trickName } = vector.metadata as any;
      
      const key = trickName || 'Unclassified';
      if (!byTrick.has(key)) byTrick.set(key, []);
      
      // Truncate text to 150 chars for readability
      const shortText = (text || '').substring(0, 150).replace(/\n/g, ' ');
      byTrick.get(key)!.push(shortText);
    }
    
    paginationToken = listResponse.pagination?.next;
  } while (paginationToken);
  
  // Sort by count and print (skip "Other")
  const sorted = [...byTrick.entries()]
    .filter(([name]) => name !== 'Other')
    .sort((a, b) => b[1].length - a[1].length);
  
  for (const [trickName, tips] of sorted) {
    console.log('='.repeat(80));
    console.log(`🏂 ${trickName} (${tips.length} tips)`);
    console.log('='.repeat(80));
    tips.forEach((tip, i) => {
      console.log(`  ${i + 1}. ${tip}...`);
    });
    console.log('');
  }
  
  const otherCount = byTrick.get('Other')?.length || 0;
  console.log(`\n(Skipped ${otherCount} "Other" tips)`);
  console.log(`Total classified: ${sorted.reduce((sum, [, tips]) => sum + tips.length, 0)} tips`);
}
}

main().catch(console.error);
