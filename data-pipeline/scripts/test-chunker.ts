/**
 * Test the semantic chunker on one video
 */

import fs from 'fs/promises';
import { processTranscript } from './semantic-chunker.js';

// Update to extract 5 tips instead of 3
async function testChunker() {
  console.log('🧪 Testing semantic chunker on one video...\n');
  
  // Load a sample transcript
  const videoId = '29e4uRO7YBQ'; // Change this to test different videos
  const transcriptPath = `data/transcripts/${videoId}.json`;
  
  try {
    const data = await fs.readFile(transcriptPath, 'utf-8');
    const transcript = JSON.parse(data);
    
    console.log(`📹 Video: ${transcript.title || transcript.videoTitle}`);
    console.log(`📝 Full text length: ${transcript.fullText?.length || 0} chars\n`);
    
    // Convert to sentences format if needed
    let sentences = transcript.timestamps || transcript.transcript;
    
    if (!sentences) {
      console.log('❌ No transcript data found');
      return;
    }
    
    console.log(`Processing ${sentences.length} segments...\n`);
    
    // Process with semantic chunker (will extract 5 tips)
    const tips = await processTranscript(sentences, transcript.title || transcript.videoTitle);
    
    console.log('\n📊 Results:\n');
    console.log(`Found ${tips.length} actionable tips:\n`);
    
    tips.forEach((tip, i) => {
      console.log(`\n--- Tip ${i + 1} ---`);
      console.log(`⏱️  Time: ${tip.timestamp} (${tip.startTime}s)`);
      console.log(`📊 Score: ${tip.relevanceScore?.toFixed(2) || 'N/A'}`);
      console.log(`📝 Text: ${tip.text.substring(0, 300)}${tip.text.length > 300 ? '...' : ''}`);
    });
    
    console.log('\n✅ Test complete!');
    console.log(`\nIf this looks good, run the full scraper to process all videos.`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure you have a transcript file at:', transcriptPath);
    console.log('Run the scraper first to generate transcripts.');
  }
}

testChunker().catch(console.error);
