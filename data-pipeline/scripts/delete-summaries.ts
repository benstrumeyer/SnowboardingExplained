/**
 * Delete all summary entries from Pinecone
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

async function deleteSummaries() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  const index = pinecone.index(indexName);

  console.log('Fetching all summary entries from Pinecone...\n');

  // Get all summary entries
  const dummyVector = new Array(768).fill(0);
  const queryResponse = await index.query({
    vector: dummyVector,
    topK: 10000,
    includeMetadata: true,
  });

  const summaryIds: string[] = [];
  for (const match of queryResponse.matches || []) {
    const summaryOnly = match.metadata?.summaryOnly as boolean;
    if (summaryOnly) {
      summaryIds.push(match.id);
    }
  }

  console.log(`Found ${summaryIds.length} summary entries to delete\n`);

  if (summaryIds.length === 0) {
    console.log('No summaries to delete');
    return;
  }

  // Delete in batches
  const batchSize = 100;
  for (let i = 0; i < summaryIds.length; i += batchSize) {
    const batch = summaryIds.slice(i, i + batchSize);
    await index.deleteMany(batch);
    console.log(`Deleted ${Math.min(i + batchSize, summaryIds.length)}/${summaryIds.length}`);
  }

  console.log(`\n✓ Done! Deleted ${summaryIds.length} summary entries from Pinecone`);
}

deleteSummaries().catch(console.error);
