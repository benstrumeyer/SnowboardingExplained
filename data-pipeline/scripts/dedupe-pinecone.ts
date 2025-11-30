/**
 * Deduplicate Pinecone entries by text field
 * 
 * If multiple entries have the same text, keep only the one with trickName filled out.
 * If none have trickName, keep the first one.
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

interface RecordInfo {
  id: string;
  text: string;
  trickName?: string;
  hasTrickName: boolean;
}

async function main() {
  console.log('🧹 Deduplicating Pinecone entries by text field\n');
  console.log('='.repeat(60));
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX || 'snowboarding-explained');
  
  // Step 1: Fetch all records and group by text
  console.log('\n📊 Fetching all records...\n');
  
  const textToRecords = new Map<string, RecordInfo[]>();
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
      
      if (!text) continue;
      
      const textKey = text.trim().toLowerCase();
      
      if (!textToRecords.has(textKey)) {
        textToRecords.set(textKey, []);
      }
      
      textToRecords.get(textKey)!.push({
        id,
        text,
        trickName,
        hasTrickName: !!(trickName && trickName !== 'Other' && trickName !== ''),
      });
    }
    
    paginationToken = listResponse.pagination?.next;
    process.stdout.write(`\rProcessed ${totalRecords} records...`);
  } while (paginationToken);
  
  console.log(`\n\n📋 Found ${textToRecords.size} unique text entries from ${totalRecords} total records\n`);
  
  // Step 2: Find duplicates and decide which to delete
  const toDelete: string[] = [];
  let duplicateGroups = 0;
  
  for (const [textKey, records] of textToRecords.entries()) {
    if (records.length <= 1) continue;
    
    duplicateGroups++;
    
    // Sort: prefer records WITH trickName first
    records.sort((a, b) => {
      if (a.hasTrickName && !b.hasTrickName) return -1;
      if (!a.hasTrickName && b.hasTrickName) return 1;
      return 0;
    });
    
    // Keep the first one (has trickName if any do), delete the rest
    const keep = records[0];
    const deleteThese = records.slice(1);
    
    if (duplicateGroups <= 10) {
      console.log(`\n🔄 Duplicate group ${duplicateGroups}:`);
      console.log(`   Text: "${keep.text.substring(0, 80)}..."`);
      console.log(`   ✅ KEEP: ${keep.id} (trickName: ${keep.trickName || 'none'})`);
      for (const d of deleteThese) {
        console.log(`   ❌ DELETE: ${d.id} (trickName: ${d.trickName || 'none'})`);
      }
    }
    
    toDelete.push(...deleteThese.map(r => r.id));
  }
  
  if (duplicateGroups > 10) {
    console.log(`\n... and ${duplicateGroups - 10} more duplicate groups`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 SUMMARY:`);
  console.log(`   Total records: ${totalRecords}`);
  console.log(`   Unique texts: ${textToRecords.size}`);
  console.log(`   Duplicate groups: ${duplicateGroups}`);
  console.log(`   Records to delete: ${toDelete.length}`);
  console.log('='.repeat(60));
  
  if (toDelete.length === 0) {
    console.log('\n✅ No duplicates found!');
    return;
  }
  
  // Step 3: Delete duplicates in batches
  console.log(`\n🗑️  Deleting ${toDelete.length} duplicate records...`);
  
  const batchSize = 100;
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    await index.deleteMany(batch);
    process.stdout.write(`\r   Deleted ${Math.min(i + batchSize, toDelete.length)}/${toDelete.length}...`);
  }
  
  console.log(`\n\n✅ Done! Deleted ${toDelete.length} duplicate records.`);
  console.log(`   Remaining records: ${totalRecords - toDelete.length}`);
}

main().catch(console.error);
