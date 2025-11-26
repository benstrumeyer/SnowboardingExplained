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
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000, // 60 second timeout
  });
  
  let successCount = 0;
  let failCount = 0;
  let totalVectors = 0;
  
  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    console.log(`\n📥 [${i + 1}/${videoIds.length}] ${videoId}`);
    
    let result;
    try {
      result = await scrapeTranscript(videoId, browser);
    } catch (error: any) {
      console.log(`  ❌ Scraping failed: ${error.message}`);
      failCount++;
      continue;
    }
    
    if (!result) {
      failCount++;
      continue;
    }
    
    const sentences = groupIntoSentences(result.segments);
    console.log(`  📝 ${sentences.length} sentences`);
    
    // Use semantic chunker to extract actionable tips
    const { processTranscript } = await import('./semantic-chunker.js');
    const actionableTips = await processTranscript(sentences, result.title);
    
    if (actionableTips.length === 0) {
      console.log(`  ⚠️  No actionable tips found, skipping video`);
      failCount++;
      continue;
    }
    
    console.log(`  🤖 Summarizing ${actionableTips.length} tips into bullet points...`);
    
    // Summarize each tip into a concise bullet point
    const summarizedTips = [];
    const summaryModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    
    for (let j = 0; j < actionableTips.length; j++) {
      try {
        const prompt = `Summarize this snowboarding tip into ONE concise, actionable bullet point (1-2 sentences max).

Transcript: "${actionableTips[j].text}"

Bullet point:`;
        
        const summaryResult = await summaryModel.generateContent(prompt);
        const summary = (await summaryResult.response).text().trim();
        
        summarizedTips.push({
          ...actionableTips[j],
          summary: summary.replace(/^[•\-\*]\s*/, ''), // Remove bullet point prefix if added
          originalText: actionableTips[j].text,
        });
        
        if ((j + 1) % 2 === 0) {
          console.log(`    Summarized ${j + 1}/${actionableTips.length}...`);
        }
      } catch (error: any) {
        console.log(`    ⚠️  Failed to summarize tip ${j}: ${error.message}`);
        summarizedTips.push({
          ...actionableTips[j],
          summary: actionableTips[j].text.substring(0, 150),
          originalText: actionableTips[j].text,
        });
      }
    }
    
    // Generate embeddings for summarized tips
    const vectors = [];
    
    for (let j = 0; j < summarizedTips.length; j++) {
      try {
        // Embed the summary (concise version)
        const embedding = await embeddingModel.embedContent(summarizedTips[j].summary);
        
        vectors.push({
          id: `${videoId}-${j}`,
          values: embedding.embedding.values,
          metadata: {
            videoId,
            videoTitle: result.title,
            text: summarizedTips[j].summary, // Store the concise bullet point
            fullText: summarizedTips[j].originalText, // Keep original for reference
            timestamp: summarizedTips[j].startTime,
            url: `https://youtube.com/watch?v=${videoId}&t=${Math.floor(summarizedTips[j].startTime)}s`,
            relevanceScore: summarizedTips[j].relevanceScore || 0,
          },
        });
      } catch (error: any) {
        console.log(`    ⚠️  Failed to embed tip ${j}`);
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
