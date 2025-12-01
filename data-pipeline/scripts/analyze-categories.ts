import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PineconeRecord {
  id: string;
  score: number;
  metadata: {
    trickId?: string;
    trickName?: string;
    videoId?: string;
    videoTitle?: string;
    text?: string;
    fullText?: string;
    aliases?: string;
    stepNumber?: number;
    totalSteps?: number;
    summaryOnly?: boolean;
    relevanceScore?: number;
  };
}

const dataPath = path.join(__dirname, '../data/pinecone-dump.json');
const records: PineconeRecord[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('\n=== PINECONE DATABASE ANALYSIS ===\n');
console.log(`Total Records: ${records.length}\n`);

// Group by trick
const trickMap = new Map<string, PineconeRecord[]>();
const videoMap = new Map<string, Set<string>>();

records.forEach(record => {
  const trickName = record.metadata.trickName || record.metadata.trickId || 'uncategorized';
  
  if (!trickMap.has(trickName)) {
    trickMap.set(trickName, []);
  }
  trickMap.get(trickName)!.push(record);
  
  // Track videos per trick
  if (record.metadata.videoId) {
    if (!videoMap.has(trickName)) {
      videoMap.set(trickName, new Set());
    }
    videoMap.get(trickName)!.add(record.metadata.videoId);
  }
});

// Sort by count
const sortedTricks = Array.from(trickMap.entries()).sort((a, b) => b[1].length - a[1].length);

console.log('=== TRICKS/CATEGORIES ===\n');
console.log('┌────┬─────────────────────────────┬─────────┬────────┐');
console.log('│ #  │ Trick Name                  │ Records │ Videos │');
console.log('├────┼─────────────────────────────┼─────────┼────────┤');

sortedTricks.forEach(([trick, records], index) => {
  const num = String(index + 1).padStart(2);
  const name = trick.padEnd(27);
  const count = String(records.length).padStart(7);
  const videos = String(videoMap.get(trick)?.size || 0).padStart(6);
  console.log(`│ ${num} │ ${name} │ ${count} │ ${videos} │`);
});

console.log('└────┴─────────────────────────────┴─────────┴────────┘');

// Analyze record types
const summaries = records.filter(r => r.metadata.summaryOnly);
const fullTexts = records.filter(r => r.metadata.fullText);
const steps = records.filter(r => r.metadata.stepNumber);
const tips = records.filter(r => !r.metadata.summaryOnly && !r.metadata.fullText && !r.metadata.stepNumber);

console.log('\n=== RECORD TYPES ===\n');
console.log(`Summaries: ${summaries.length}`);
console.log(`Full Transcripts: ${fullTexts.length}`);
console.log(`Step-by-step: ${steps.length}`);
console.log(`Tips: ${tips.length}`);

// Show sample of top 5 tricks
console.log('\n=== TOP 5 TRICKS - SAMPLE DATA ===\n');

sortedTricks.slice(0, 5).forEach(([trick, records]) => {
  console.log(`\n[${trick}] - ${records.length} records, ${videoMap.get(trick)?.size || 0} videos`);
  
  const sample = records.slice(0, 3);
  sample.forEach((record, i) => {
    console.log(`\n  ${i + 1}. ${record.id}`);
    if (record.metadata.text) {
      const text = record.metadata.text.length > 100 
        ? record.metadata.text.substring(0, 97) + '...'
        : record.metadata.text;
      console.log(`     ${text}`);
    }
    if (record.metadata.stepNumber) {
      console.log(`     Step ${record.metadata.stepNumber}/${record.metadata.totalSteps}`);
    }
    if (record.metadata.videoTitle) {
      console.log(`     Video: ${record.metadata.videoTitle}`);
    }
  });
});

console.log('\n');
