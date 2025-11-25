/**
 * Script 1: Scrape YouTube Transcripts
 * 
 * What this does:
 * 1. Gets all video IDs from the Snowboarding Explained channel
 * 2. Downloads the transcript (captions) for each video
 * 3. Saves each transcript as a JSON file
 * 4. Saves video metadata (title, URL, thumbnail)
 * 
 * Why we need this:
 * - Transcripts contain all the coaching content
 * - We'll use this text to train the AI
 */

import { YoutubeTranscript } from 'youtube-transcript';
import fs from 'fs/promises';
import path from 'path';

// Channel: Snowboarding Explained
// https://www.youtube.com/@SnowboardingExplained
const CHANNEL_ID = 'UCf7C6GkDyYFqz8HfuN1C-_w';

// Using popular snowboarding tutorial videos that HAVE captions
// These are from various channels with good snowboarding content
const MANUAL_VIDEO_IDS = [
  'jNQXAC9IVRw', // "Me at the zoo" - test video with captions
  '9bZkp7q19f0', // PSY - Gangnam Style (has captions, for testing)
  'dQw4w9WgXcQ', // Rick Astley (has captions, for testing)
  // We'll use these to test the pipeline works
  // Then we can add real snowboarding videos with captions
];

async function loadVideoIds(): Promise<string[]> {
  // Try to load from file first
  try {
    const videoIdsPath = path.join('data', 'video-ids.json');
    const content = await fs.readFile(videoIdsPath, 'utf-8');
    const ids = JSON.parse(content);
    if (ids.length > 0) return ids;
  } catch (error) {
    // File doesn't exist, use manual IDs
  }
  
  console.log('⚠️  Using manual video IDs for testing');
  return MANUAL_VIDEO_IDS;
}

interface VideoMetadata {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  transcriptLength: number;
}

async function scrapeTranscript(videoId: string): Promise<VideoMetadata | null> {
  try {
    console.log(`📥 Scraping video: ${videoId}`);
    
    // Get transcript from YouTube
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      console.log(`⚠️  No transcript found for ${videoId}`);
      return null;
    }
    
    // Calculate total duration
    const lastSegment = transcript[transcript.length - 1];
    const duration = lastSegment.offset + lastSegment.duration;
    
    // Get video title (we'll extract from first segment or use videoId)
    // In production, you'd get this from YouTube API
    const title = `Video ${videoId}`;
    
    // Save transcript to file
    const transcriptPath = path.join('data', 'transcripts', `${videoId}.json`);
    await fs.writeFile(
      transcriptPath,
      JSON.stringify(transcript, null, 2)
    );
    
    console.log(`✅ Saved transcript: ${transcript.length} segments`);
    
    return {
      videoId,
      title,
      url: `https://youtube.com/watch?v=${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: duration / 1000, // Convert to seconds
      transcriptLength: transcript.length,
    };
    
  } catch (error: any) {
    console.error(`❌ Error scraping ${videoId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting transcript scraping...\n');
  
  const VIDEO_IDS = await loadVideoIds();
  console.log(`📹 Found ${VIDEO_IDS.length} videos to scrape\n`);
  
  const metadata: VideoMetadata[] = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const videoId of VIDEO_IDS) {
    const result = await scrapeTranscript(videoId);
    
    if (result) {
      metadata.push(result);
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay to be respectful to YouTube
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Save metadata
  const metadataPath = path.join('data', 'metadata.json');
  await fs.writeFile(
    metadataPath,
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('\n📊 Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Transcripts saved to: data/transcripts/`);
  console.log(`📄 Metadata saved to: data/metadata.json`);
}

main().catch(console.error);
