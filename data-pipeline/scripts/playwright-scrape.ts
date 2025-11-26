/**
 * Scrape YouTube transcripts using Playwright
 * This clicks the "Show transcript" button and extracts the text
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

// Load video IDs from the file we created
async function loadVideoIds(): Promise<string[]> {
  try {
    const data = await fs.readFile('data/video-ids.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    console.log('⚠️  No video-ids.json found, using sample IDs');
    return ['JNWqEZg1OBM', 'WLq-Za-nDPU', 'mePZ-fCKCeQ']; // First 3 from the list
  }
}

async function scrapeTranscript(videoId: string, browser: any) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Click the "Show transcript" button
    // Try multiple selectors as YouTube's UI can vary
    const transcriptSelectors = [
      'button[aria-label*="transcript"]',
      'button[aria-label*="Transcript"]',
      'button:has-text("Show transcript")',
      'ytd-video-description-transcript-section-renderer button',
    ];
    
    let transcriptButton = null;
    for (const selector of transcriptSelectors) {
      try {
        transcriptButton = await page.$(selector);
        if (transcriptButton) break;
      } catch {}
    }
    
    if (!transcriptButton) {
      console.log(`  ⚠️  No transcript button found`);
      await page.close();
      return null;
    }
    
    // Click the button
    await transcriptButton.click();
    await page.waitForTimeout(1000);
    
    // Extract transcript segments
    const segments = await page.$$eval(
      'ytd-transcript-segment-renderer',
      (elements: any[]) => {
        return elements.map(el => {
          const timeEl = el.querySelector('.segment-timestamp');
          const textEl = el.querySelector('.segment-text');
          
          if (!timeEl || !textEl) return null;
          
          // Parse timestamp (format: "0:00" or "1:23")
          const timeText = timeEl.textContent.trim();
          const [mins, secs] = timeText.split(':').map(Number);
          const offset = (mins * 60) + secs;
          
          return {
            text: textEl.textContent.trim(),
            offset,
            duration: 0, // We don't have duration from UI
          };
        }).filter(Boolean);
      }
    );
    
    await page.close();
    
    if (segments.length === 0) {
      console.log(`  ⚠️  No transcript segments found`);
      return null;
    }
    
    return segments;
    
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🎭 Starting Playwright transcript scraper...\n');
  
  const videoIds = await loadVideoIds();
  console.log(`📹 Found ${videoIds.length} videos to scrape\n`);
  
  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: false }); // Set to false to see what's happening
  
  let successCount = 0;
  let failCount = 0;
  
  // Create output directory
  await fs.mkdir('data/transcripts', { recursive: true });
  
  // Scrape each video
  for (let i = 0; i < Math.min(videoIds.length, 5); i++) { // Start with first 5
    const videoId = videoIds[i];
    console.log(`\n📥 [${i + 1}/${Math.min(videoIds.length, 5)}] Scraping: ${videoId}`);
    console.log(`   URL: https://youtube.com/watch?v=${videoId}`);
    
    const transcript = await scrapeTranscript(videoId, browser);
    
    if (transcript) {
      // Get video title from the page
      const page = await browser.newPage();
      await page.goto(`https://www.youtube.com/watch?v=${videoId}`);
      const title = await page.title();
      await page.close();
      
      // Save transcript
      const outputPath = path.join('data', 'transcripts', `${videoId}.json`);
      await fs.writeFile(
        outputPath,
        JSON.stringify({
          videoId,
          title: title.replace(' - YouTube', ''),
          transcript,
        }, null, 2)
      );
      
      console.log(`  ✅ Success! Saved ${transcript.length} segments`);
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay between videos
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  await browser.close();
  
  console.log('\n📊 Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Transcripts saved to: data/transcripts/`);
  
  if (successCount > 0) {
    console.log('\n🎯 Next steps:');
    console.log('1. Run: node node_modules\\tsx\\dist\\cli.mjs scripts\\2-chunk-transcripts.ts');
    console.log('2. Run: node node_modules\\tsx\\dist\\cli.mjs scripts\\3-generate-embeddings.ts');
    console.log('3. Run: node node_modules\\tsx\\dist\\cli.mjs scripts\\4-upload-pinecone.ts');
  }
}

main().catch(console.error);
