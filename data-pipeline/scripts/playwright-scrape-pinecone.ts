/**
 * Scrape YouTube transcripts and upload directly to Pinecone
 * Handles full channel scraping with deduplication and rate limiting
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

const CHANNEL_URL = 'https://www.youtube.com/@SnowboardingExplained/videos';

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

// Get all existing video IDs from Pinecone
async function getExistingVideoIds(index: any): Promise<Set<string>> {
  console.log('🔍 Fetching existing videos from Pinecone...');
  
  const videoIds = new Set<string>();
  
  try {
    const stats = await index.describeIndexStats();
    console.log(`  Found ${stats.totalRecordCount} total vectors in database`);
    
    // First, try to load from file (fastest)
    try {
      const data = await fs.readFile('data/processed-videos.json', 'utf-8');
      const processed = JSON.parse(data);
      processed.forEach((id: string) => videoIds.add(id));
      console.log(`  Loaded ${videoIds.size} videos from processed-videos.json`);
    } catch {
      console.log('  No processed-videos.json found');
    }
    
    // Also query Pinecone to catch any videos not in the file
    console.log('  Querying Pinecone for additional videos...');
    const dummyVector = new Array(768).fill(0);
    
    // Query a few times to get good coverage
    for (let i = 0; i < 5; i++) {
      try {
        const results = await index.query({
          vector: dummyVector.map(() => Math.random()),
          topK: 100,
          includeMetadata: true,
        });
        
        results.matches?.forEach((match: any) => {
          if (match.metadata?.videoId) {
            videoIds.add(match.metadata.videoId);
          }
        });
      } catch (error: any) {
        console.log(`  ⚠️  Query ${i + 1} failed: ${error.message}`);
      }
    }
    
    console.log(`  Total unique videos found: ${videoIds.size}`);
    
    // Update the file with the complete list
    if (videoIds.size > 0) {
      await fs.writeFile(
        'data/processed-videos.json',
        JSON.stringify(Array.from(videoIds), null, 2)
      );
    }
    
    return videoIds;
  } catch (error: any) {
    console.log(`  ⚠️  Error fetching existing IDs: ${error.message}`);
    return videoIds;
  }
}

// Save processed video IDs to avoid re-processing
async function saveProcessedVideoId(videoId: string) {
  try {
    let processed: string[] = [];
    try {
      const data = await fs.readFile('data/processed-videos.json', 'utf-8');
      processed = JSON.parse(data);
    } catch {}
    
    if (!processed.includes(videoId)) {
      processed.push(videoId);
      await fs.writeFile('data/processed-videos.json', JSON.stringify(processed, null, 2));
    }
  } catch (error: any) {
    console.log(`  ⚠️  Failed to save processed video: ${error.message}`);
  }
}

// Scrape all video IDs from the channel page
async function scrapeChannelVideoIds(browser: any): Promise<string[]> {
  console.log('🎬 Scraping channel for all video IDs...\n');
  
  const page = await browser.newPage();
  await page.goto(CHANNEL_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  let previousCount = 0;
  let stableCount = 0;
  const maxStableChecks = 3; // Stop after 3 checks with no new videos
  
  while (stableCount < maxStableChecks) {
    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    
    await page.waitForTimeout(2000);
    
    // Count current videos
    const currentCount = await page.$$eval('ytd-rich-item-renderer', (items: Element[]) => items.length);
    
    console.log(`  Found ${currentCount} videos...`);
    
    if (currentCount === previousCount) {
      stableCount++;
    } else {
      stableCount = 0;
      previousCount = currentCount;
    }
  }
  
  // Extract all video IDs
  const videoIds = await page.$$eval('ytd-rich-item-renderer a#video-title-link', (links: Element[]) => {
    return links
      .map((link: any) => {
        const href = link.href;
        const match = href.match(/watch\?v=([^&]+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
  });
  
  await page.close();
  
  console.log(`\n✅ Found ${videoIds.length} total videos on channel\n`);
  return videoIds;
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
      (elements: Element[]) => {
        return elements.map((el: any) => {
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
  
  // Ensure data directory exists
  try {
    await fs.mkdir('data', { recursive: true });
  } catch {}
  
  // Initialize
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX!);
  
  console.log('✅ Connected to Pinecone:', process.env.PINECONE_INDEX);
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000,
  });
  
  // Get existing videos to avoid duplicates
  const existingVideoIds = await getExistingVideoIds(index);
  console.log(`📦 Already processed: ${existingVideoIds.size} videos\n`);
  
  // Scrape all video IDs from channel
  const allVideoIds = await scrapeChannelVideoIds(browser);
  
  // Filter out already processed videos
  const videoIds = allVideoIds.filter(id => !existingVideoIds.has(id));
  
  console.log(`📹 New videos to process: ${videoIds.length}\n`);
  
  if (videoIds.length === 0) {
    console.log('✅ All videos already processed!');
    await browser.close();
    return;
  }
  
  console.log('⏱️  Estimated time: ~' + Math.ceil(videoIds.length * 2) + ' minutes (with rate limiting)\n');
  
  let successCount = 0;
  let failCount = 0;
  let totalVectors = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    console.log(`\n📥 [${i + 1}/${videoIds.length}] ${videoId}`);
    console.log(`   https://youtube.com/watch?v=${videoId}`);
    
    let result;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        result = await scrapeTranscript(videoId, browser);
        break;
      } catch (error: any) {
        retries++;
        console.log(`  ⚠️  Attempt ${retries}/${maxRetries} failed: ${error.message}`);
        
        if (retries < maxRetries) {
          console.log(`  ⏳ Waiting 10 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          console.log(`  ❌ Scraping failed after ${maxRetries} attempts`);
          failCount++;
        }
      }
    }
    
    if (!result) {
      continue;
    }
    
    const sentences = groupIntoSentences(result.segments);
    console.log(`  📝 ${sentences.length} sentences`);
    console.log(`  🎬 Video: "${result.title}"\n`);
    
    // Use semantic chunker to extract actionable tips
    const { processTranscript } = await import('./semantic-chunker.js');
    const actionableTips = await processTranscript(sentences, result.title);
    
    if (actionableTips.length === 0) {
      console.log(`  ⚠️  No actionable tips found, skipping video`);
      failCount++;
      continue;
    }
    
    console.log(`  💡 Found ${actionableTips.length} actionable tips:`);
    actionableTips.forEach((tip, idx) => {
      console.log(`     ${idx + 1}. ${tip.text.substring(0, 100)}${tip.text.length > 100 ? '...' : ''}`);
    });
    console.log();
    
    console.log(`  🤖 Summarizing ${actionableTips.length} tips into bullet points...`);
    
    // Summarize each tip into a concise bullet point
    const summarizedTips = [];
    const summaryModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    
    for (let j = 0; j < actionableTips.length; j++) {
      try {
        const prompt = `Summarize this snowboarding tip into ONE concise, actionable bullet point (1-2 sentences max).

Transcript: "${actionableTips[j].text}"

Bullet point:`;
        
        const summaryResult = await summaryModel.generateContent(prompt);
        const summary = summaryResult.response.text().trim();
        
        const cleanSummary = summary.replace(/^[•\-\*]\s*/, '');
        
        summarizedTips.push({
          ...actionableTips[j],
          summary: cleanSummary,
          originalText: actionableTips[j].text,
        });
        
        // Log each summarized tip
        console.log(`    ✓ Tip ${j + 1}/${actionableTips.length}: ${cleanSummary}`);
        
        // Rate limit: wait 4 seconds between requests (15 RPM = 1 per 4 seconds)
        await new Promise(resolve => setTimeout(resolve, 4000));
        
      } catch (error: any) {
        if (error.message.includes('429') || error.message.includes('quota')) {
          console.log(`    ⏳ Rate limit hit, waiting 60 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 60000));
          j--; // Retry this tip
        } else {
          console.log(`    ⚠️  Failed to summarize tip ${j}: ${error.message}`);
          summarizedTips.push({
            ...actionableTips[j],
            summary: actionableTips[j].text.substring(0, 150),
            originalText: actionableTips[j].text,
          });
        }
      }
    }
    
    // Show final summary of all tips
    console.log(`\n  📋 Final Tips for "${result.title}":`);
    summarizedTips.forEach((tip, idx) => {
      console.log(`     ${idx + 1}. ${tip.summary}`);
    });
    console.log();
    
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
      
      // Save this video as processed
      await saveProcessedVideoId(videoId);
    } else {
      console.log(`  ⚠️  No vectors to upload`);
    }
    
    // Progress update
    const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
    const avgTimePerVideo = elapsed / (successCount + failCount);
    const remaining = Math.ceil(avgTimePerVideo * (videoIds.length - (successCount + failCount)));
    
    console.log(`\n📊 Progress: ${successCount + failCount}/${videoIds.length} | ✅ ${successCount} | ❌ ${failCount} | ☁️  ${totalVectors} vectors`);
    console.log(`⏱️  Elapsed: ${elapsed}m | Remaining: ~${remaining}m`);
  }
  
  await browser.close();
  
  console.log('\n📊 Final Summary:');
  console.log(`✅ Successfully processed: ${successCount} videos`);
  console.log(`❌ Failed: ${failCount} videos`);
  console.log(`☁️  Total vectors uploaded: ${totalVectors}`);
  console.log(`📦 Total in database: ${existingVideoIds.size + successCount} videos`);
  console.log('\n🎉 Done! Test your mobile app now!');
}

main().catch(console.error);
