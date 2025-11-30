/**
 * Export all tips with trickName for manual review
 * Outputs one tip per line in format: ID | trickName | text
 */

import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs/promises';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

interface TipRecord {
  id: string;
  trickName: string;
  text: string;
}

async function main() {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX || 'snowboarding-explained');
  
  console.log('📊 Fetching all tips from Pinecone...\n');
  
  const tips: TipRecord[] = [];
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
      
      const { text, trickName } = vector.metadata as any;
      
      tips.push({
        id,
        trickName: trickName || 'Unclassified',
        text: (text || '').replace(/\n/g, ' ').replace(/\|/g, '-'),
      });
    }
    
    paginationToken = listResponse.pagination?.next;
    process.stdout.write(`\rProcessed ${totalRecords} records...`);
  } while (paginationToken);
  
  // Sort by trickName then by id
  tips.sort((a, b) => {
    if (a.trickName !== b.trickName) return a.trickName.localeCompare(b.trickName);
    return a.id.localeCompare(b.id);
  });
  
  // Write to file - one line per tip
  const lines = tips.map(t => `${t.id} | ${t.trickName} | ${t.text}`);
  const output = lines.join('\n');
  
  await fs.writeFile('data/tips-for-review.txt', output);
  
  console.log(`\n\n✅ Exported ${tips.length} tips to data/tips-for-review.txt`);
  console.log(`\nFormat: ID | trickName | text`);
  console.log(`\nTo delete tips, remove the lines you want to delete and run delete-tips.ts`);
}

main().catch(console.error);
