/**
 * Scrape YouTube transcripts and upload directly to Pinecone
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
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
    
    const endsWithPunctuation = /[.!?]$/.test(segment.text.trim());
    
    if (endsWithPunctuation) {
      sentences.push({
        text: currentSentence.trim(),
        time: sentenceStart,
        offset: sentenceStartOffset,
      });
      
      currentSentence = '';
      const nextIndex = segments.indexOf(segment) + 1;
      if (nextIndex < segments.length) {
        sentenceStart = segments[nextIndex].timestamp;
        sentenceStartOffset = segments[nextIndex].offset;
      }
    }
  }
  
  if (currentSentence.trim()) {
    sentences.push({
      text: currentSentence.trim(),
      time: sentenceStart,
      offset: sentenceStartOffset,
    });
  }
  
  return sentences;
}

async function loadVideoIds(): Promise<string[]> {
  try {
    const data = await fs.readFile('data/video-ids.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    console.log('⚠️  No video-ids.json found');
    return [];
  }
}

async function scrapeTranscript(videoId: string, browser: any) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(1000);
    
    // Click "Show more" if exists
    try {
      const showMore = await page.$('tp-yt-paper-button#expand');
      if (showMore) await showMore.click();
      await page.waitForTimeout(500);
    } catch {}
    
    // Find transcript button
    const selectors = [
      'button:has-text("Show transcript")',
      'button[aria-label*="Show transcript"]',
      'ytd-video-description-transcript-section-renderer button',
    ];
    
    let transcriptButton = null;
    for (const selector of selectors) {
      try {
        transcriptButton = await page.$(selector);
        if (transcriptButton) break;
      } catch {}
    }
    
    if (!transcriptButton) {
      await page.close();
      return null;
    }
    
    await transcriptButton.click();
    await page.waitForTimeout(2000);
    await page.waitForSelector('ytd-transcript-segment-renderer', { timeout: 5000 });
    
    // Extract segments
    const segments = await page.$$eval(
      'ytd-transcript-segment-renderer',
      (elements: any[]) => {
        return elements.map(el => {
          const timeEl = el.querySelector('[class*="segment-timestamp"]');
          const textEl = el.querySelector('yt-formatted-string[class*="segment-text"]');
          
          if (!timeEl || !textEl) return null;
          
          const timeText = timeEl.textContent.trim();
          const parts = timeText.split(':').map(Number);
          let offset = 0;
          
          if (parts.length === 2) {
            offset = (parts[0] * 60) + parts[1];
          } else if (parts.length === 3) {
            offset = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
          }
          
          return {
            text: textEl.textContent.trim(),
            offset,
            timestamp: timeText,
          };
        }).filter(Boolean);
      }
    );
    
    // Get title
    const title = await page.title();
    await page.close();
    
    return {
      videoId,
      title: title.replace(' - YouTube', ''),
      segments,
    };
    
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🎭 Scraping transcripts and uploading to Pinecone...\n');
  
  // Initialize
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX!);
  
  console.log('✅ Connected to Pinecone:', process.env.PINECONE_INDEX);
  
  const videoIds = await loadVideoIds();
  console.log(`📹 Found ${videoIds.length} videos\n`);
  
  const browser = await chromium.launch({ headless: false });
  
  let successCount = 0;
  let failCount = 0;
  let totalVectors = 0;
  
  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    console.log(`\n📥 [${i + 1}/${videoIds.length}] ${videoId}`);
    
    const result = await scrapeTranscript(videoId, browser);
    
    if (!result) {
      failCount++;
      continue;
    }
    
    const sentences = groupIntoSentences(result.segments);
    console.log(`  📝 ${sentences.length} sentences`);
    
    // Generate embeddings and upload
    const vectors = [];
    
    for (let j = 0; j < sentences.length; j++) {
      try {
        const embedding = await embeddingModel.embedContent(sentences[j].text);
        
        vectors.push({
          id: `${videoId}-${j}`,
          values: embedding.embedding.values,
          metadata: {
            videoId,
            videoTitle: result.title,
            text: sentences[j].text,
            timestamp: sentences[j].offset,
            url: `https://youtube.com/watch?v=${videoId}&t=${Math.floor(sentences[j].offset)}s`,
          },
        });
        
        if ((j + 1) % 10 === 0) {
          console.log(`    ${j + 1}/${sentences.length} embedded...`);
        }
      } catch (error: any) {
        console.log(`    ⚠️  Failed sentence ${j}`);
      }
    }
    
    // Upload to Pinecone
    if (vectors.length > 0) {
      console.log(`  ☁️  Uploading ${vectors.length} vectors...`);
      
      const batchSize = 100;
      for (let j = 0; j < vectors.length; j += batchSize) {
        const batch = vectors.slice(j, j + batchSize);
        await index.upsert(batch);
      }
      
      totalVectors += vectors.length;
      console.log(`  ✅ Uploaded!`);
      successCount++;
    }
  }
  
  await browser.close();
  
  console.log('\n📊 Summary:');
  console.log(`✅ Videos: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`☁️  Vectors: ${totalVectors}`);
  console.log('\n🎉 Done! Test your mobile app now!');
}

main().catch(console.error);
