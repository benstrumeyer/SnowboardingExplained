/**
 * Script: Fetch Video Titles from YouTube
 * 
 * Fetches video titles for all video IDs and saves them to a database file.
 * Uses YouTube oEmbed API (no API key required) to get video titles.
 */

import fs from 'fs/promises';
import path from 'path';

interface VideoInfo {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
}

async function fetchVideoTitle(videoId: string): Promise<string | null> {
  try {
    // Use YouTube oEmbed API - no API key required
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      console.log(`⚠️  Could not fetch title for ${videoId}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data.title;
  } catch (error: any) {
    console.log(`❌ Error fetching ${videoId}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🎬 Fetching video titles from YouTube...\n');
  
  // Load video IDs
  const videoIdsPath = path.join('data', 'video-ids.json');
  const processedPath = path.join('data', 'processed-videos.json');
  
  let videoIds: string[] = [];
  
  // Try processed videos first (more complete list)
  try {
    const content = await fs.readFile(processedPath, 'utf-8');
    videoIds = JSON.parse(content);
    console.log(`📁 Loaded ${videoIds.length} video IDs from processed-videos.json`);
  } catch {
    try {
      const content = await fs.readFile(videoIdsPath, 'utf-8');
      videoIds = JSON.parse(content);
      console.log(`📁 Loaded ${videoIds.length} video IDs from video-ids.json`);
    } catch {
      console.error('❌ No video IDs found!');
      return;
    }
  }
  
  // Load existing video database if it exists
  const videoDatabasePath = path.join('data', 'video-database.json');
  let existingVideos: VideoInfo[] = [];
  try {
    const content = await fs.readFile(videoDatabasePath, 'utf-8');
    existingVideos = JSON.parse(content);
    console.log(`📚 Found ${existingVideos.length} existing videos in database`);
  } catch {
    console.log('📚 Starting fresh video database');
  }
  
  const existingIds = new Set(existingVideos.map(v => v.videoId));
  const newIds = videoIds.filter(id => !existingIds.has(id));
  
  console.log(`🆕 ${newIds.length} new videos to fetch\n`);
  
  const videos: VideoInfo[] = [...existingVideos];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < newIds.length; i++) {
    const videoId = newIds[i];
    console.log(`[${i + 1}/${newIds.length}] Fetching: ${videoId}`);
    
    const title = await fetchVideoTitle(videoId);
    
    if (title) {
      videos.push({
        videoId,
        title,
        url: `https://youtube.com/watch?v=${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      });
      successCount++;
      console.log(`   ✅ ${title}`);
    } else {
      failCount++;
    }
    
    // Small delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Save video database
  await fs.writeFile(
    videoDatabasePath,
    JSON.stringify(videos, null, 2)
  );
  
  console.log('\n📊 Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Total videos in database: ${videos.length}`);
  console.log(`💾 Saved to: data/video-database.json`);
}

main().catch(console.error);
