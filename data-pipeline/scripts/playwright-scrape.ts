/**
 * Scrape YouTube transcripts using Playwright
 * This clicks the "Show transcript" button and extracts the text
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

// Group transcript segments into complete sentences
function groupIntoSentences(segments: any[]): any[] {
  const sentences: any[] = [];
  let currentSentence = '';
  let sentenceStart = segments[0]?.timestamp || '0:00';
  let sentenceStartOffset = segments[0]?.offset || 0;
  
  for (const segment of segments) {
    currentSentence += segment.text + ' ';
    
    // Check if this segment ends with sentence-ending punctuation
    const endsWithPunctuation = /[.!?]$/.test(segment.text.trim());
    
    if (endsWithPunctuation) {
      sentences.push({
        text: currentSentence.trim(),
        time: sentenceStart,
        offset: sentenceStartOffset,
      });
      
      // Start new sentence
      currentSentence = '';
      // Next segment will be the start of the next sentence
      const nextIndex = segments.indexOf(segment) + 1;
      if (nextIndex < segments.length) {
        sentenceStart = segments[nextIndex].timestamp;
        sentenceStartOffset = segments[nextIndex].offset;
      }
    }
  }
  
  // Add any remaining text as a final sentence
  if (currentSentence.trim()) {
    sentences.push({
      text: currentSentence.trim(),
      time: sentenceStart,
      offset: sentenceStartOffset,
    });
  }
  
  return sentences;
}

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

async function scrapeTranscript(videoId: string, browser: any, embeddingModel: any, index: any, totalVectors: number) {
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
  console.log('🎭 Starting Playwright transcript scraper with Pinecone upload...\n');
  
  // Initialize Gemini for embeddings
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  // Initialize Pinecone
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  const index = pinecone.index(process.env.PINECONE_INDEX!);
  
  console.log('✅ Connected to Pinecone index:', process.env.PINECONE_INDEX);
  
  const videoIds = await loadVideoIds();
  console.log(`📹 Found ${videoIds.length} videos to scrape\n`);
  
  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: false });
  
  let successCount = 0;
  let failCount = 0;
  let totalVectors = 0;
  
  // Scrape ALL videos
  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    console.log(`\n📥 [${i + 1}/${videoIds.length}] Scraping: ${videoId}`);
    console.log(`   URL: https://youtube.com/watch?v=${videoId}`);
    
    const transcript = await scrapeTranscript(videoId, browser, embeddingModel, index, totalVectors);
    
    if (transcript) {
      // Get video title
      const page = await browser.newPage();
      await page.goto(`https://www.youtube.com/watch?v=${videoId}`);
      const title = await page.title().then(t => t.replace(' - YouTube', ''));
      await page.close();
      
      // Group segments into sentences
      const sentences = groupIntoSentences(transcript);
      
      console.log(`  📝 Processing ${sentences.length} sentences...`);
      
      // Generate embeddings and upload to Pinecone
      const vectors = [];
      
      for (let j = 0; j < sentences.length; j++) {
        const sentence = sentences[j];
        
        try {
          // Generate embedding
          const result = await embeddingModel.embedContent(sentence.text);
          const embedding = result.embedding.values;
          
          // Create vector for Pinecone
          vectors.push({
            id: `${videoId}-${j}`,
            values: embedding,
            metadata: {
              videoId,
              videoTitle: title,
              text: sentence.text,
              timestamp: sentence.offset,
              timestampFormatted: sentence.time,
              url: `https://youtube.com/watch?v=${videoId}&t=${Math.floor(sentence.offset)}s`,
            },
          });
          
          // Show progress
          if ((j + 1) % 10 === 0) {
            console.log(`    Embedded ${j + 1}/${sentences.length} sentences...`);
          }
        } catch (error: any) {
          console.log(`    ⚠️  Failed to embed sentence ${j}: ${error.message}`);
        }
      }
      
      // Upload to Pinecone in batches
      if (vectors.length > 0) {
        console.log(`  ☁️  Uploading ${vectors.length} vectors to Pinecone...`);
        
        const batchSize = 100;
        for (let j = 0; j < vectors.length; j += batchSize) {
          const batch = vectors.slice(j, j + batchSize);
          await index.upsert(batch);
        }
        
        totalVectors += vectors.length;
        console.log(`  ✅ Success! Uploaded ${vectors.length} vectors`);
        successCount++;
      }
    } else {
      failCount++;
    }
    
    // Small delay between videos
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  await browser.close();
  
  console.log('\n📊 Summary:');
  console.log(`✅ Videos processed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`☁️  Total vectors uploaded: ${totalVectors}`);
  console.log(`📊 Pinecone index: ${process.env.PINECONE_INDEX}`);
  
  if (successCount > 0) {
    console.log('\n🎉 All done! Your data is now in Pinecone.');
    console.log('🧪 Test your mobile app to see the coaching responses!');
  }
}

main().catch(console.error);
