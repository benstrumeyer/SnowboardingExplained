/**
 * Script 4: Upload to Pinecone
 * 
 * What is Pinecone?
 * - A vector database (stores embeddings in the cloud)
 * - Like a search engine for meanings, not keywords
 * - You search with an embedding, it returns similar ones
 * 
 * How to view your data:
 * 1. Go to https://app.pinecone.io/
 * 2. Click on your index name
 * 3. You'll see stats (total vectors, dimensions, etc.)
 * 4. You can query it to test search
 * 
 * Why Pinecone?
 * - Fast search (milliseconds)
 * - Scales to millions of vectors
 * - Free tier: 100k vectors
 * - No server management needed
 */

import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface ChunkWithEmbedding {
  id: string;
  videoId: string;
  videoTitle: string;
  text: string;
  timestamp: number;
  duration: number;
  topics: string[];
  embedding: number[];
}

async function main() {
  console.log('☁️  Starting Pinecone upload...\n');
  
  // Check environment variables
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY not found in .env file');
    console.log('\n📝 To get your Pinecone API key:');
    console.log('1. Go to https://app.pinecone.io/');
    console.log('2. Sign up (free tier available)');
    console.log('3. Create a new index:');
    console.log('   - Name: snowboarding-coach');
    console.log('   - Dimensions: 768');
    console.log('   - Metric: cosine');
    console.log('4. Copy your API key from the dashboard');
    console.log('5. Add it to your .env file');
    process.exit(1);
  }
  
  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  
  const indexName = process.env.PINECONE_INDEX || 'snowboarding-coach';
  
  console.log(`📊 Connecting to index: ${indexName}`);
  
  // Get index
  const index = pinecone.index(indexName);
  
  // Read embeddings
  const embeddingsPath = path.join('data', 'embeddings', 'embeddings.json');
  const embeddingsContent = await fs.readFile(embeddingsPath, 'utf-8');
  const chunks: ChunkWithEmbedding[] = JSON.parse(embeddingsContent);
  
  console.log(`📦 Uploading ${chunks.length} vectors...\n`);
  
  // Prepare vectors for Pinecone
  const vectors = chunks.map(chunk => ({
    id: chunk.id,
    values: chunk.embedding,
    metadata: {
      videoId: chunk.videoId,
      videoTitle: chunk.videoTitle,
      text: chunk.text,
      timestamp: chunk.timestamp,
      duration: chunk.duration,
      topics: chunk.topics,
    },
  }));
  
  // Upload in batches of 100
  const batchSize = 100;
  let uploadedCount = 0;
  
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    
    try {
      await index.upsert(batch);
      uploadedCount += batch.length;
      console.log(`✅ Uploaded ${uploadedCount}/${vectors.length} vectors`);
    } catch (error: any) {
      console.error(`❌ Error uploading batch ${i / batchSize + 1}:`, error.message);
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Uploaded: ${uploadedCount} vectors`);
  console.log(`📊 Index: ${indexName}`);
  
  console.log('\n🔍 How to view your data:');
  console.log('1. Go to https://app.pinecone.io/');
  console.log(`2. Click on "${indexName}" index`);
  console.log('3. You\'ll see:');
  console.log('   - Total vectors');
  console.log('   - Dimensions (should be 768)');
  console.log('   - Storage used');
  console.log('4. Try a test query to verify it works!');
  
  // Test query
  console.log('\n🧪 Running test query...');
  try {
    const testEmbedding = chunks[0].embedding;
    const queryResult = await index.query({
      vector: testEmbedding,
      topK: 3,
      includeMetadata: true,
    });
    
    console.log('\n✅ Test query successful!');
    console.log('Top 3 results:');
    queryResult.matches?.forEach((match, i) => {
      console.log(`\n${i + 1}. Score: ${match.score?.toFixed(4)}`);
      console.log(`   Video: ${match.metadata?.videoTitle}`);
      console.log(`   Text: ${(match.metadata?.text as string)?.substring(0, 100)}...`);
    });
  } catch (error: any) {
    console.error('❌ Test query failed:', error.message);
  }
}

main().catch(console.error);
