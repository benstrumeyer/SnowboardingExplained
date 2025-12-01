import { Pinecone } from '@pinecone-database/pinecone';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

async function main() {
  console.log('🔌 Connecting to Pinecone...\n');

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  const index = pinecone.index(indexName);

  console.log(`📊 Fetching all data from index: ${indexName}\n`);

  // Get index stats first
  const stats = await index.describeIndexStats();
  console.log('Index Stats:');
  console.log(`  Total vectors: ${stats.totalRecordCount}`);
  console.log(`  Dimension: ${stats.dimension}\n`);

  // Fetch all records (Pinecone doesn't have a "get all" so we query with dummy vector)
  const dummyVector = new Array(stats.dimension).fill(0);
  
  const results = await index.query({
    vector: dummyVector,
    topK: 10000, // Max allowed
    includeMetadata: true,
  });

  console.log(`✅ Fetched ${results.matches.length} records\n`);

  // Save to JSON
  const outputPath = path.join(__dirname, '../data/pinecone-dump.json');
  fs.writeFileSync(outputPath, JSON.stringify(results.matches, null, 2));

  console.log(`💾 Saved to: ${outputPath}\n`);

  // Show sample of first 10
  console.log('=== SAMPLE DATA (First 10 records) ===\n');
  results.matches.slice(0, 10).forEach((match, i) => {
    console.log(`[${i + 1}] ID: ${match.id}`);
    console.log(`    Score: ${match.score}`);
    console.log(`    Metadata:`, JSON.stringify(match.metadata, null, 2));
    console.log('');
  });
}

main().catch(console.error);
