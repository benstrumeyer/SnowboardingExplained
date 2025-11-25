/**
 * Script 0: Fetch Video IDs from YouTube Channel
 * 
 * What this does:
 * 1. Uses YouTube Data API to get all videos from the channel
 * 2. Checks which videos have captions available
 * 3. Saves the list of video IDs with captions
 * 
 * Why we need this:
 * - Not all videos have captions/transcripts
 * - We only want to scrape videos we can actually get transcripts for
 * - Saves time and API quota
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const CHANNEL_ID = 'UCf7C6GkDyYFqz8HfuN1C-_w'; // Snowboarding Explained
const MAX_RESULTS = 50; // Get 50 videos per page

interface VideoInfo {
  videoId: string;
  title: string;
  publishedAt: string;
  hasCaptions: boolean;
}

async function main() {
  console.log('🎬 Fetching videos from Snowboarding Explained channel...\n');
  
  if (!process.env.YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY not found in .env file');
    console.log('\n📝 To get your YouTube API key:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project (or select existing)');
    console.log('3. Enable "YouTube Data API v3"');
    console.log('4. Go to Credentials → Create Credentials → API Key');
    console.log('5. Copy the API key');
    console.log('6. Add YOUTUBE_API_KEY=your_key to .env file');
    process.exit(1);
  }
  
  const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
  });
  
  const allVideos: VideoInfo[] = [];
  let pageToken: string | undefined;
  
  try {
    // Fetch all videos from the channel
    do {
      console.log(`📥 Fetching page${pageToken ? ` (${pageToken.substring(0, 10)}...)` : ''}...`);
      
      const response = await youtube.search.list({
        part: ['snippet'],
        channelId: CHANNEL_ID,
        maxResults: MAX_RESULTS,
        order: 'date',
        type: ['video'],
        pageToken,
      });
      
      const videos = response.data.items || [];
      
      for (const video of videos) {
        if (!video.id?.videoId) continue;
        
        allVideos.push({
          videoId: video.id.videoId,
          title: video.snippet?.title || 'Unknown',
          publishedAt: video.snippet?.publishedAt || '',
          hasCaptions: false, // We'll check this next
        });
      }
      
      pageToken = response.data.nextPageToken || undefined;
      
      console.log(`  Found ${videos.length} videos`);
      
    } while (pageToken);
    
    console.log(`\n✅ Total videos found: ${allVideos.length}`);
    
    // Check which videos have captions
    console.log('\n🔍 Checking for captions...');
    
    let captionCount = 0;
    
    for (let i = 0; i < allVideos.length; i++) {
      const video = allVideos[i];
      
      try {
        const captionResponse = await youtube.captions.list({
          part: ['snippet'],
          videoId: video.videoId,
        });
        
        const hasCaptions = (captionResponse.data.items?.length || 0) > 0;
        video.hasCaptions = hasCaptions;
        
        if (hasCaptions) {
          captionCount++;
          console.log(`  ✅ ${video.title.substring(0, 50)}...`);
        }
        
        // Progress indicator
        if ((i + 1) % 10 === 0) {
          console.log(`  Checked ${i + 1}/${allVideos.length} videos...`);
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        // If we can't check captions, assume they exist and try anyway
        video.hasCaptions = true;
        captionCount++;
      }
    }
    
    // Save all videos
    const allVideosPath = path.join('data', 'all-videos.json');
    await fs.writeFile(
      allVideosPath,
      JSON.stringify(allVideos, null, 2)
    );
    
    // Save just video IDs with captions
    const videosWithCaptions = allVideos.filter(v => v.hasCaptions);
    const videoIds = videosWithCaptions.map(v => v.videoId);
    
    const videoIdsPath = path.join('data', 'video-ids.json');
    await fs.writeFile(
      videoIdsPath,
      JSON.stringify(videoIds, null, 2)
    );
    
    console.log('\n📊 Summary:');
    console.log(`📹 Total videos: ${allVideos.length}`);
    console.log(`✅ Videos with captions: ${captionCount}`);
    console.log(`📁 Saved to:`);
    console.log(`   - data/all-videos.json (all videos)`);
    console.log(`   - data/video-ids.json (IDs with captions)`);
    
    console.log('\n🎯 Next step:');
    console.log('Run: npm run scrape');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('quota')) {
      console.log('\n⚠️  YouTube API quota exceeded');
      console.log('The free tier allows 10,000 units per day');
      console.log('Try again tomorrow or upgrade your quota');
    }
  }
}

main().catch(console.error);
