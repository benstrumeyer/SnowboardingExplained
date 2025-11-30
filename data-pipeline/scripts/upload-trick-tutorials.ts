/**
 * Upload Trick Tutorials to Pinecone
 * 
 * Uploads trick tutorial steps with isPrimary=true metadata
 * These will be prioritized when users ask "how to do X trick"
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface TrickStep {
  stepNumber: number;
  summary: string;
  rawText: string;
  timestamp: number;
  endTime: number;
  duration: number;
}

interface TrickTutorial {
  trickId: string;
  trickName: string;
  aliases: string[];
  videoId: string;
  videoTitle: string;
  totalDuration: number;
  steps: TrickStep[];
}

/**
 * Generate embedding for text using Gemini
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Upload tutorials to Pinecone
 */
async function uploadTutorials(tutorials: TrickTutorial[]) {
  console.log('🚀 Uploading trick tutorials to Pinecone...\n');
  
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  
  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  const index = pinecone.index(indexName);
  
  let totalUploaded = 0;
  
  for (const tutorial of tutorials) {
    console.log(`\n📤 Uploading: ${tutorial.trickName} (${tutorial.steps.length} tips)`);
    
    const vectors = [];
    
    for (const step of tutorial.steps) {
      // Create rich text for embedding - use the summary
      const embeddingText = `${tutorial.trickName}: ${step.summary}`;
      
      try {
        const embedding = await generateEmbedding(embeddingText);
        
        vectors.push({
          id: `${tutorial.trickId}-step-${step.stepNumber}`,
          values: embedding,
          metadata: {
            // Core fields
            videoId: tutorial.videoId,
            videoTitle: tutorial.videoTitle,
            text: step.summary,
            timestamp: step.timestamp,
            duration: step.duration,
            
            // Trick tutorial specific fields
            isPrimary: true,
            trickId: tutorial.trickId,
            trickName: tutorial.trickName,
            aliases: tutorial.aliases.join(','),
            stepNumber: step.stepNumber,
            totalSteps: tutorial.steps.length,
            
            // Raw text for reference
            rawText: step.rawText.substring(0, 500),  // Truncate for Pinecone limits
          },
        });
        
        process.stdout.write(`  ✅ ${step.stepNumber}/${tutorial.steps.length}\r`);
        
        // Rate limit for embedding API
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error: any) {
        console.log(`  ❌ Error on step ${step.stepNumber}: ${error.message}`);
      }
    }
    
    // Batch upsert (Pinecone supports up to 100 vectors per upsert)
    if (vectors.length > 0) {
      // Split into batches of 100
      for (let i = 0; i < vectors.length; i += 100) {
        const batch = vectors.slice(i, i + 100);
        await index.upsert(batch);
      }
      totalUploaded += vectors.length;
      console.log(`  📦 Uploaded ${vectors.length} vectors for ${tutorial.trickName}`);
    }
    
    // Rate limit between tutorials
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Total uploaded: ${totalUploaded} vectors`);
}

/**
 * Main function
 */
async function main() {
  console.log('🏂 Trick Tutorial Pinecone Uploader\n');
  console.log('='.repeat(50));
  
  // Load tutorials
  const tutorialsPath = 'data/trick-tutorials/all-tutorials.json';
  
  try {
    const content = await fs.readFile(tutorialsPath, 'utf-8');
    const tutorials: TrickTutorial[] = JSON.parse(content);
    
    console.log(`📂 Loaded ${tutorials.length} tutorials`);
    console.log(`📋 Total steps: ${tutorials.reduce((sum, t) => sum + t.steps.length, 0)}`);
    
    await uploadTutorials(tutorials);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Done! Trick tutorials are now in Pinecone');
    console.log('   with isPrimary=true for priority searching');
    
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('❌ No tutorials found. Run scrape-trick-playlist.ts first.');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

main().catch(console.error);
