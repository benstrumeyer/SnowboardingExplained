/**
 * Get video IDs from channel without YouTube API
 * Scrapes the channel page HTML to extract video IDs
 */

async function main() {
  const channelUrl = 'https://www.youtube.com/@SnowboardingExplained/videos';
  
  console.log('🎬 Fetching videos from channel page...\n');
  console.log(`📍 URL: ${channelUrl}\n`);
  
  try {
    const response = await fetch(channelUrl);
    const html = await response.text();
    
    // Extract video IDs from the HTML
    // YouTube embeds video data in the page as JSON
    const videoIdMatches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    const videoIds = new Set<string>();
    
    for (const match of videoIdMatches) {
      videoIds.add(match[1]);
    }
    
    const uniqueIds = Array.from(videoIds);
    
    console.log(`✅ Found ${uniqueIds.length} unique video IDs\n`);
    
    if (uniqueIds.length > 0) {
      console.log('📹 First 10 videos:');
      uniqueIds.slice(0, 10).forEach((id, i) => {
        console.log(`   ${i + 1}. https://youtube.com/watch?v=${id}`);
      });
      
      // Save to file
      const fs = await import('fs/promises');
      const path = await import('path');
      
      await fs.mkdir('data', { recursive: true });
      await fs.writeFile(
        path.join('data', 'video-ids.json'),
        JSON.stringify(uniqueIds, null, 2)
      );
      
      console.log(`\n📁 Saved to: data/video-ids.json`);
      console.log(`\n🎯 Next: Run the scrape script to get transcripts`);
    } else {
      console.log('❌ No videos found. The page structure might have changed.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);
