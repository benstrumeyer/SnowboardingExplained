/**
 * Delete specific tips from Pinecone by ID
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

// IDs to delete
const IDS_TO_DELETE = [
  'UhQs6N2PzL0-3',
  'back-double-cork-1080-step-11',
  'aoz79oUO9ko-0',
  'jmEhkaCK_EY-1',
  '5cDLnB4ybH0-0',
  '5cDLnB4ybH0-1',
  'jmEhkaCK_EY-4',
  'QyO4D0YRG3Y-0',
  'aoz79oUO9ko-3',
  'nIKiHZ_YoSI-3',
  'z74Yl5-dw8A-3',
  'WjdBqH7jA7o-1',
  'z74Yl5-dw8A-0',
  'jmEhkaCK_EY-3',
  '-P77zGgNg_c-4',
  '1dgmtcQeZfs-4',
  '29e4uRO7YBQ-0',
  '29e4uRO7YBQ-1',
  '29e4uRO7YBQ-2',
  '29e4uRO7YBQ-3',
  '29e4uRO7YBQ-4',
  '71M4ad8nsAs-0',
  '8m5F5rHukqA-0',
  'aoz79oUO9ko-1',
  'aoz79oUO9ko-2',
  'asg7kfawh64-0',
  'asg7kfawh64-1',
  'asg7kfawh64-2',
  'asg7kfawh64-3',
  'asg7kfawh64-4',
  'DAbUPOYW-bw-0',
  'DAbUPOYW-bw-1',
  'DAbUPOYW-bw-2',
  'exoEn-r5AZ4-0',
  'exoEn-r5AZ4-1',
  'exoEn-r5AZ4-2',
  'exoEn-r5AZ4-3',
  'exoEn-r5AZ4-4',
  'eYCFNjrryYM-0',
  'JFh_BMzTqOU-0',
  'm9mcgAfGeRk-2',
  'm9mcgAfGeRk-4',
  'MGc-0XmRe0w-1',
  'nkwk__n1k10-3',
  'nkwk__n1k10-4',
  'OhLO3H9oLy8-1',
  'OhLO3H9oLy8-2',
  'OhLO3H9oLy8-3',
  'OhLO3H9oLy8-4',
  's86n54CfJfg-3',
  's86n54CfJfg-4',
  'wAMAAZSoUCc-0',
  'WLq-Za-nDPU-1',
];

async function main() {
  console.log(`🗑️  Deleting ${IDS_TO_DELETE.length} tips from Pinecone...\n`);
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX || 'snowboarding-explained');
  
  // Delete in batches of 100
  const batchSize = 100;
  for (let i = 0; i < IDS_TO_DELETE.length; i += batchSize) {
    const batch = IDS_TO_DELETE.slice(i, i + batchSize);
    await index.deleteMany(batch);
    console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`);
  }
  
  console.log(`\n✅ Done! Deleted ${IDS_TO_DELETE.length} tips.`);
}

main().catch(console.error);
