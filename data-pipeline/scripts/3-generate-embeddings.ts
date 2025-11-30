/**
 * Script 3: Generate Embeddings
 * 
 * What are embeddings?
 * - Embeddings are arrays of numbers that represent the "meaning" of text
 * - Similar text = similar numbers
 * - Example: "backside 180" and "backside spin" have similar embeddings
 * 
 * Why we need them:
 * - To search for relevant content
 * - When user asks "how do I land a backside 180?"
 * - We find chunks with similar embeddings
 * - Those chunks contain relevant coaching advice
 * 
 * We use Google's text-embedding-004 model:
 * - Creates 768-dimensional vectors
 * - Very cheap (~$0.00001 per chunk)
 * - High quality
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface Chunk {
  id: string;
  videoId: string;
  videoTitle: string;
  text: string;
  timestamp: number;
  duration: number;
  topics: string[];
}

interface ChunkWithEmbedding extends Chunk {
  embedding: number[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  const result = await model.embedContent(text);
  const embedding = result.embedding.values;
  
  // Pinecone index expects 768 dimensions
  // text-embedding-004 returns 1536, so truncate to 768
  return embedding.slice(0, 768);
}

async function main() {
  console.log('🧠 Starting embedding generation...\n');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    console.log('Get your API key from: https://makersuite.google.com/app/apikey');
    process.exit(1);
  }
  
  // Read chunks
  const chunksPath = path.join('data', 'chunks', 'all-chunks.json');
  const chunksContent = await fs.readFile(chunksPath, 'utf-8');
  const chunks: Chunk[] = JSON.parse(chunksContent);
  
  console.log(`📦 Processing ${chunks.length} chunks...\n`);
  
  const chunksWithEmbeddings: ChunkWithEmbedding[] = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      // Generate embedding for this chunk
      const embedding = await generateEmbedding(chunk.text);
      
      chunksWithEmbeddings.push({
        ...chunk,
        embedding,
      });
      
      successCount++;
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`✅ Processed ${i + 1}/${chunks.length} chunks`);
      }
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error(`❌ Error on chunk ${chunk.id}:`, error.message);
      errorCount++;
    }
  }
  
  // Save embeddings
  const embeddingsPath = path.join('data', 'embeddings', 'embeddings.json');
  await fs.writeFile(
    embeddingsPath,
    JSON.stringify(chunksWithEmbeddings, null, 2)
  );
  
  console.log('\n📊 Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Saved to: data/embeddings/embeddings.json`);
  
  // Show embedding info
  if (chunksWithEmbeddings.length > 0) {
    const firstEmbedding = chunksWithEmbeddings[0].embedding;
    console.log(`\n📏 Embedding dimensions: ${firstEmbedding.length}`);
    console.log(`📝 Example embedding (first 10 values):`);
    console.log(firstEmbedding.slice(0, 10).map(v => v.toFixed(4)).join(', '));
  }
  
  // Calculate cost
  const costPerChunk = 0.00001; // Approximate
  const totalCost = chunks.length * costPerChunk;
  console.log(`\n💰 Estimated cost: $${totalCost.toFixed(4)}`);
}

main().catch(console.error);
