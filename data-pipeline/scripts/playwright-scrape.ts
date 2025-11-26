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
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Scroll down to make description visible
    await page.evaluate(() => {
      window.scrollTo(0, 400);
    });
    await page.waitForTimeout(1000);
    
    // Click "Show more" in description if it exists
    try {
      const showMoreButton = await page.$('tp-yt-paper-button#expand');
      if (showMoreButton) {
        await showMoreButton.click();
        await page.waitForTimeout(500);
      }
    } catch {}
    
    // Find and click "Show transcript" button in description area
    let transcriptButton = null;
    const selectors = [
      'button:has-text("Show transcript")',
      'button[aria-label*="Show transcript"]',
      'ytd-video-description-transcript-section-renderer button',
      '[class*="transcript"] button',
    ];
    
    for (const selector of selectors) {
      try {
        transcriptButton = await page.$(selector);
        if (transcriptButton) {
          console.log(`  Found button with selector: ${selector}`);
          break;
        }
      } catch {}
    }
    
    if (!transcriptButton) {
      console.log(`  ⚠️  No transcript button found`);
      await page.close();
      return null;
    }
    
    // Click the transcript button
    await transcriptButton.click();
    await page.waitForTimeout(2000);
    
    // Wait for transcript panel to appear
    await page.waitForSelector('ytd-transcript-segment-renderer', { timeout: 5000 });
    
    // Extract transcript segments from sidebar
    const segments = await page.$$eval(
      'ytd-transcript-segment-renderer',
      (elements: any[]) => {
        return elements.map(el => {
          // Get the timestamp element
          const timeEl = el.querySelector('[class*="segment-timestamp"]');
          // Get the text element
          const textEl = el.querySelector('yt-formatted-string[class*="segment-text"]');
          
          if (!timeEl || !textEl) return null;
          
          // Parse timestamp (format: "0:00" or "1:23:45")
          const timeText = timeEl.textContent.trim();
          const parts = timeText.split(':').map(Number);
          let offset = 0;
          
          if (parts.length === 2) {
            // MM:SS
            offset = (parts[0] * 60) + parts[1];
          } else if (parts.length === 3) {
            // HH:MM:SS
            offset = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
          }
          
          return {
            text: textEl.textContent.trim(),
            offset,
            duration: 0,
            timestamp: timeText,
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
  
  // Scrape ALL videos
  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    console.log(`\n📥 [${i + 1}/${videoIds.length}] Scraping: ${videoId}`);
    console.log(`   URL: https://youtube.com/watch?v=${videoId}`);
    
    const transcript = await scrapeTranscript(videoId, browser);
    
    if (transcript) {
      // Get video title
      const page = await browser.newPage();
      await page.goto(`https://www.youtube.com/watch?v=${videoId}`);
      const title = await page.title();
      await page.close();
      
      // Create full text (all segments combined)
      const fullText = transcript.map((seg: any) => seg.text).join(' ');
      
      // Save transcript with timestamps
      const outputPath = path.join('data', 'transcripts', `${videoId}.json`);
      await fs.writeFile(
        outputPath,
        JSON.stringify({
          videoId,
          title: title.replace(' - YouTube', ''),
          transcript,
          fullText,
        }, null, 2)
      );
      
      // Also save just the full text for easy reading
      const textPath = path.join('data', 'transcripts', `${videoId}.txt`);
      await fs.writeFile(textPath, fullText);
      
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
