/**
 * Search Pinecone by trickName metadata
 * Usage: npx ts-node scripts/search-by-trickname.ts "frontside 720"
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../backend/.env' });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'snowboarding-explained';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

async function generateEmbedding(text: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function searchByTrickName(trickName: string) {
  console.log(`\n🔍 Searching for trickName: "${trickName}"\n`);
  
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.index(PINECONE_INDEX);
  
  // Generate embedding for the search query
  const queryEmbedding = await generateEmbedding(trickName);
  
  // Search with trickName filter
  const results = await index.query({
    vector: queryEmbedding,
    topK: 20,
    includeMetadata: true,
    filter: {
      trickName: { $eq: trickName }
    }
  });
  
  console.log(`Found ${results.matches?.length || 0} results with exact trickName match\n`);
  
  if (results.matches && results.matches.length > 0) {
    console.log('=== Results ===\n');
    results.matches.forEach((match, i) => {
      const meta = match.metadata as any;
      console.log(`${i + 1}. ID: ${match.id}`);
      console.log(`   Score: ${match.score?.toFixed(4)}`);
      console.log(`   trickName: ${meta.trickName}`);
      console.log(`   videoTitle: ${meta.videoTitle}`);
      console.log(`   text: ${meta.text?.substring(0, 100)}...`);
      console.log(`   isPrimary: ${meta.isPrimary}`);
      console.log(`   stepNumber: ${meta.stepNumber || 'N/A'}`);
      console.log('');
    });
  }
  
  // Also try a contains-style search (case insensitive workaround)
  console.log('\n--- Trying broader search without exact filter ---\n');
  
  const broadResults = await index.query({
    vector: queryEmbedding,
    topK: 20,
    includeMetadata: true,
  });
  
  // Filter client-side for partial matches
  const matchingResults = broadResults.matches?.filter(match => {
    const meta = match.metadata as any;
    const segTrickName = (meta.trickName || '').toLowerCase();
    const searchTerm = trickName.toLowerCase();
    return segTrickName.includes(searchTerm) || searchTerm.includes(segTrickName);
  });
  
  console.log(`Found ${matchingResults?.length || 0} results with partial trickName match\n`);
  
  if (matchingResults && matchingResults.length > 0) {
    console.log('=== Partial Match Results ===\n');
    matchingResults.forEach((match, i) => {
      const meta = match.metadata as any;
      console.log(`${i + 1}. ID: ${match.id}`);
      console.log(`   Score: ${match.score?.toFixed(4)}`);
      console.log(`   trickName: ${meta.trickName}`);
      console.log(`   videoTitle: ${meta.videoTitle}`);
      console.log(`   text: ${meta.text?.substring(0, 100)}...`);
      console.log('');
    });
  }
  
  // Show all unique trickNames in the results
  console.log('\n--- All trickNames in top 20 results ---\n');
  const allTrickNames = new Set<string>();
  broadResults.matches?.forEach(match => {
    const meta = match.metadata as any;
    if (meta.trickName) {
      allTrickNames.add(meta.trickName);
    }
  });
  console.log([...allTrickNames].join('\n'));
}

// Get trickName from command line
const trickName = process.argv[2];
if (!trickName) {
  console.log('Usage: npx ts-node scripts/search-by-trickname.ts "frontside 720"');
  process.exit(1);
}

searchByTrickName(trickName).catch(console.error);
