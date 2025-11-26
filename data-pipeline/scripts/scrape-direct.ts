/**
 * Direct scraping approach - manually specify video IDs
 * Since transcripts are now enabled, let's try scraping directly
 */

import { YoutubeTranscript } from 'youtube-transcript';
import fs from 'fs/promises';
import path from 'path';

// Manually add some video IDs from the channel
// You can find these by going to the channel and copying video URLs
const VIDEO_IDS = [
  'jNQXAC9IVRw', // Example - replace with real video IDs
  '9bZkp7q19f0',
  // Add more video IDs here
];

async function main() {
  console.log('🚀 Testing transcript scraping...\n');
  
  for (const videoId of VIDEO_IDS) {
    try {
      console.log(`📥 Trying video: ${videoId}`);
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (transcript && transcript.length > 0) {
        console.log(`✅ Success! Found ${transcript.length} segments`);
        console.log(`   First segment: "${transcript[0].text.substring(0, 50)}..."`);
        
        // Save it
        const outputPath = path.join('data', 'transcripts', `${videoId}.json`);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, JSON.stringify(transcript, null, 2));
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('\n💡 If this works, we can manually add more video IDs');
  console.log('Or we can try a different approach to fetch the channel videos');
}

main().catch(console.error);
