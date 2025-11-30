/**
 * Classify Pinecone Vectors with Trick Names
 * 
 * Fetches all vectors from Pinecone, uses AI to classify each chunk
 * based on text content and video title, then updates metadata in-place.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Load trick taxonomy
const taxonomy = JSON.parse(
  await fs.readFile('../backend/data/trick-taxonomy.json', 'utf-8')
);

// Build flat list of all trick names for the prompt
function getAllTrickNames(): string[] {
  const tricks: string[] = [];
  
  // Spins
  for (const category of Object.values(taxonomy.spins) as any[]) {
    for (const trickId of Object.keys(category)) {
      if (trickId.startsWith('_')) continue;
      // Convert ID to readable name: "frontside-360" -> "Frontside 360"
      const name = trickId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      tricks.push(name);
    }
  }
  
  // Rails
  for (const trickId of Object.keys(taxonomy.rails)) {
    const name = trickId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    tricks.push(name);
  }
  
  // Tricks
  for (const trickId of Object.keys(taxonomy.tricks)) {
    const name = trickId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    tricks.push(name);
  }
  
  // Foundational
  for (const trickId of Object.keys(taxonomy.foundational)) {
    if (trickId.startsWith('_')) continue;
    const name = trickId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    tricks.push(name);
  }
  
  return tricks;
}

const VALID_TRICKS = getAllTrickNames();

/**
 * Use Gemini to classify what trick a chunk is about
 */
async function classifyTrick(videoTitle: string, text: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `You are classifying snowboarding tutorial content.

Given this video title and text excerpt, determine which specific trick this content is teaching.

Video Title: "${videoTitle}"
Text: "${text.substring(0, 500)}"

Valid trick names (pick ONE or "Other"):
${VALID_TRICKS.join(', ')}

Rules:
- If the content is clearly about a specific trick from the list, return that exact trick name
- If it's general advice not specific to one trick, return "Other"
- If it mentions multiple tricks, pick the PRIMARY one being taught
- Be precise: "Frontside 360" is different from "Frontside 180"
- Match the exact casing from the list

Return ONLY the trick name, nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    
    // Validate response is in our list or "Other"
    if (VALID_TRICKS.includes(response) || response === 'Other') {
      return response;
    }
    
    // Try to fuzzy match
    const lower = response.toLowerCase();
    const match = VALID_TRICKS.find(t => t.toLowerCase() === lower);
    return match || 'Other';
    
  } catch (error: any) {
    console.error(`Classification error: ${error.message}`);
    return 'Other';
  }
}

/**
 * Main function to update all Pinecone vectors
 */
async function main() {
  console.log('🏂 Pinecone Trick Classification Script\n');
  console.log('='.repeat(50));
  console.log(`📋 Valid tricks: ${VALID_TRICKS.length}`);
  console.log(VALID_TRICKS.slice(0, 10).join(', ') + '...\n');
  
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  
  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  const index = pinecone.index(indexName);
  
  // Get index stats to know how many vectors we have
  const stats = await index.describeIndexStats();
  const totalVectors = stats.totalRecordCount || 0;
  console.log(`📊 Total vectors in index: ${totalVectors}\n`);
  
  if (totalVectors === 0) {
    console.log('❌ No vectors found in Pinecone. Upload data first.');
    return;
  }
  
  // Fetch vectors in batches using list + fetch
  // Pinecone doesn't have a "get all" so we'll use list with pagination
  let processed = 0;
  let updated = 0;
  let paginationToken: string | undefined;
  
  const batchSize = 100;
  const updateBatch: { id: string; metadata: Record<string, any> }[] = [];
  
  console.log('🔄 Processing vectors...\n');
  
  do {
    // List vector IDs
    const listResponse = await index.listPaginated({
      limit: batchSize,
      paginationToken,
    });
    
    const ids = listResponse.vectors?.map(v => v.id) || [];
    
    if (ids.length === 0) break;
    
    // Fetch full vectors with metadata
    const fetchResponse = await index.fetch(ids);
    
    for (const [id, vector] of Object.entries(fetchResponse.records || {})) {
      if (!vector?.metadata) continue;
      
      const { videoTitle, text, trickName: existingTrickName } = vector.metadata as any;
      
      // Skip if already classified
      if (existingTrickName && existingTrickName !== 'Other') {
        console.log(`  ⏭️  ${id} - already classified as "${existingTrickName}"`);
        processed++;
        continue;
      }
      
      // Classify the trick
      const trickName = await classifyTrick(videoTitle || '', text || '');
      
      console.log(`  ✅ ${id} -> "${trickName}"`);
      
      // Queue update
      updateBatch.push({
        id,
        metadata: { ...vector.metadata, trickName },
      });
      
      processed++;
      updated++;
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Batch update every 50 vectors
      if (updateBatch.length >= 50) {
        await flushUpdates(index, updateBatch);
        updateBatch.length = 0;
      }
    }
    
    paginationToken = listResponse.pagination?.next;
    
    console.log(`\n📈 Progress: ${processed}/${totalVectors}\n`);
    
  } while (paginationToken);
  
  // Flush remaining updates
  if (updateBatch.length > 0) {
    await flushUpdates(index, updateBatch);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Done! Processed ${processed} vectors, updated ${updated}`);
}

async function flushUpdates(
  index: any,
  batch: { id: string; metadata: Record<string, any> }[]
) {
  console.log(`  📤 Updating ${batch.length} vectors...`);
  
  for (const item of batch) {
    await index.update({
      id: item.id,
      metadata: item.metadata,
    });
  }
}

main().catch(console.error);
