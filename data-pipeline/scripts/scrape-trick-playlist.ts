/**
 * Trick Tutorial Playlist Scraper
 * 
 * Scrapes the "How to" trick tutorial playlist from Snowboarding Explained
 * Uses Playwright to click "Show transcript" and extract captions
 * Chunks transcript into ~20 second segments and summarizes each
 * 
 * Playlist: https://www.youtube.com/playlist?list=PLBMGwWHdh0Ea7yIm6y2JP3HrBKXMV3t8G
 */

import { chromium, Browser, Page } from 'playwright';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const PLAYLIST_ID = 'PLBMGwWHdh0Ea7yIm6y2JP3HrBKXMV3t8G';
// Skip intro and foundational technique videos (not specific tricks)
const SKIP_VIDEOS = [
  'Take Your Snowboarding to New Heights',
  'The Secrets Of Popping On A Snowboard',
  'How To Hit Your Jumps Snowboarding',
];
const CHUNK_DURATION_SECONDS = 20;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface PlaylistVideo {
  videoId: string;
  title: string;
  position: number;
}

interface TranscriptSegment {
  text: string;
  offset: number;
  timestamp: string;
}

interface TrickStep {
  stepNumber: number;
  summary: string;
  rawText: string;
  timestamp: number;
  endTime: number;
  duration: number;
}

interface TrickTutorial {
  trickId: string;
  trickName: string;
  aliases: string[];
  videoId: string;
  videoTitle: string;
  totalDuration: number;
  steps: TrickStep[];
}

/**
 * Fetch all videos from the trick tutorial playlist using YouTube API
 */
async function fetchPlaylistVideos(): Promise<PlaylistVideo[]> {
  console.log('📋 Fetching playlist videos...\n');
  
  const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
  });
  
  const videos: PlaylistVideo[] = [];
  let pageToken: string | undefined;
  
  do {
    const response = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: PLAYLIST_ID,
      maxResults: 50,
      pageToken,
    });
    
    for (const item of response.data.items || []) {
      const title = item.snippet?.title || '';
      const videoId = item.snippet?.resourceId?.videoId;
      
      // Skip specified videos
      if (SKIP_VIDEOS.some(skip => title.toLowerCase().includes(skip.toLowerCase()))) {
        console.log(`  ⏭️  Skipping: ${title}`);
        continue;
      }
      
      if (videoId) {
        videos.push({
          videoId,
          title,
          position: item.snippet?.position || 0,
        });
        console.log(`  ✅ ${title}`);
      }
    }
    
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);
  
  console.log(`\n📹 Found ${videos.length} trick tutorial videos\n`);
  return videos;
}

/**
 * Scrape transcript using Playwright (clicks "Show transcript" button)
 */
async function scrapeTranscriptWithPlaywright(
  videoId: string,
  browser: Browser
): Promise<TranscriptSegment[]> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  let page: Page | null = null;
  
  try {
    page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Scroll down to make description visible
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(1000);
    
    // Click "Show more" in description if it exists
    try {
      const showMoreButton = await page.$('tp-yt-paper-button#expand');
      if (showMoreButton) {
        await showMoreButton.click();
        await page.waitForTimeout(500);
      }
    } catch {}
    
    // Find and click "Show transcript" button
    let transcriptButton = null;
    const selectors = [
      'button:has-text("Show transcript")',
      'button[aria-label*="Show transcript"]',
      'ytd-video-description-transcript-section-renderer button',
    ];
    
    for (const selector of selectors) {
      try {
        transcriptButton = await page.$(selector);
        if (transcriptButton) {
          break;
        }
      } catch {}
    }
    
    if (!transcriptButton) {
      console.log(`  ⚠️  No transcript button found`);
      await page.close();
      return [];
    }
    
    await transcriptButton.click();
    await page.waitForTimeout(2000);
    
    // Wait for transcript panel
    await page.waitForSelector('ytd-transcript-segment-renderer', { timeout: 5000 });
    
    // Extract all transcript segments
    const segments = await page.$$eval(
      'ytd-transcript-segment-renderer',
      (elements) => {
        return elements.map(el => {
          const timeEl = el.querySelector('[class*="segment-timestamp"]');
          const textEl = el.querySelector('yt-formatted-string[class*="segment-text"]');
          
          if (!timeEl || !textEl) return null;
          
          const timeText = (timeEl as HTMLElement).innerText.trim();
          const parts = timeText.split(':').map(Number);
          let offset = 0;
          
          if (parts.length === 2) {
            offset = (parts[0] * 60) + parts[1];
          } else if (parts.length === 3) {
            offset = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
          }
          
          return {
            text: (textEl as HTMLElement).innerText.trim(),
            offset,
            timestamp: timeText,
          };
        }).filter(Boolean);
      }
    );
    
    await page.close();
    return segments as TranscriptSegment[];
    
  } catch (error: any) {
    console.log(`  ❌ Error scraping: ${error.message}`);
    if (page) await page.close();
    return [];
  }
}


/**
 * Chunk transcript into ~20 second segments
 */
function chunkTranscript(segments: TranscriptSegment[]): { text: string; startTime: number; endTime: number }[] {
  const chunks: { text: string; startTime: number; endTime: number }[] = [];
  
  let currentChunk: string[] = [];
  let chunkStartTime = 0;
  let lastOffset = 0;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (currentChunk.length === 0) {
      chunkStartTime = segment.offset;
    }
    
    currentChunk.push(segment.text);
    lastOffset = segment.offset;
    
    // Check if we've hit ~20 seconds
    if (lastOffset - chunkStartTime >= CHUNK_DURATION_SECONDS) {
      chunks.push({
        text: currentChunk.join(' ').trim(),
        startTime: chunkStartTime,
        endTime: lastOffset,
      });
      currentChunk = [];
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join(' ').trim(),
      startTime: chunkStartTime,
      endTime: lastOffset,
    });
  }
  
  return chunks;
}

/**
 * Extract trick name and aliases from video title using AI
 */
async function extractTrickInfo(videoTitle: string): Promise<{ trickId: string; trickName: string; aliases: string[] }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  
  const prompt = `Extract the snowboarding trick name from this video title and generate common aliases.

Video title: "${videoTitle}"

Respond with JSON only:
{
  "trickId": "frontside-180",
  "trickName": "Frontside 180",
  "aliases": ["fs 180", "front 180", "frontside one eighty"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (error) {
    console.log(`  ⚠️  Could not extract trick info, using title`);
  }
  
  const trickName = videoTitle.replace(/How to |Snowboard |Tutorial/gi, '').trim();
  const trickId = trickName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return { trickId, trickName, aliases: [] };
}

/**
 * Summarize a chunk into an actionable tip
 */
async function summarizeChunk(
  chunk: { text: string; startTime: number; endTime: number },
  trickName: string,
  stepNumber: number
): Promise<TrickStep | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  
  const prompt = `Summarize this snowboarding instruction into a clear, actionable tip for learning "${trickName}".

Transcript segment (${Math.floor(chunk.startTime)}s - ${Math.floor(chunk.endTime)}s):
"${chunk.text}"

Rules:
- If this contains useful instruction, summarize it into 1-2 sentences
- Focus on what the rider should DO (body position, timing, technique)
- If this is just intro/outro/filler with no instruction, respond with: SKIP
- Keep it concise and actionable

Respond with either:
SKIP
or
Your summarized tip here`;

  try {
    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();
    
    if (summary.toUpperCase() === 'SKIP' || summary.toLowerCase().startsWith('skip')) {
      return null;
    }
    
    return {
      stepNumber,
      summary,
      rawText: chunk.text,
      timestamp: Math.floor(chunk.startTime),
      endTime: Math.floor(chunk.endTime),
      duration: Math.floor(chunk.endTime - chunk.startTime),
    };
  } catch (error: any) {
    console.log(`    ⚠️  Error summarizing: ${error.message}`);
    return null;
  }
}

/**
 * Process a single trick tutorial video
 */
async function processTrickVideo(video: PlaylistVideo, browser: Browser): Promise<TrickTutorial | null> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎬 Processing: ${video.title}`);
  console.log(`   URL: https://youtube.com/watch?v=${video.videoId}`);
  
  // 1. Scrape transcript with Playwright
  const transcript = await scrapeTranscriptWithPlaywright(video.videoId, browser);
  if (transcript.length === 0) {
    console.log(`  ❌ No transcript found, skipping`);
    return null;
  }
  console.log(`  📝 Got ${transcript.length} transcript segments`);
  
  // 2. Extract trick info
  const trickInfo = await extractTrickInfo(video.title);
  console.log(`  🎯 Trick: ${trickInfo.trickName} (aliases: ${trickInfo.aliases.join(', ') || 'none'})`);
  
  // 3. Chunk transcript into ~20 second segments
  const chunks = chunkTranscript(transcript);
  console.log(`  📦 Created ${chunks.length} chunks (~20s each)`);
  
  // 4. Summarize each chunk and log tips
  console.log(`\n  📋 Extracting tips:\n`);
  const steps: TrickStep[] = [];
  let stepNumber = 1;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const step = await summarizeChunk(chunk, trickInfo.trickName, stepNumber);
    
    if (step) {
      steps.push(step);
      // Log each tip as we get it
      console.log(`  ✅ TIP ${stepNumber} [${step.timestamp}s]: ${step.summary}`);
      console.log('');
      stepNumber++;
    } else {
      console.log(`  ⏭️  [${Math.floor(chunk.startTime)}s] Skipped (no instruction)`);
    }
    
    // Rate limit for Gemini API
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\n  ✨ Total: ${steps.length} tips extracted from ${chunks.length} chunks`);
  
  if (steps.length === 0) {
    console.log(`  ❌ No tips extracted, skipping`);
    return null;
  }
  
  // Calculate total duration from last segment
  const totalDuration = transcript[transcript.length - 1]?.offset || 0;
  
  return {
    trickId: trickInfo.trickId,
    trickName: trickInfo.trickName,
    aliases: trickInfo.aliases,
    videoId: video.videoId,
    videoTitle: video.title,
    totalDuration,
    steps,
  };
}

/**
 * Main function
 */
async function main() {
  console.log('🏂 Trick Tutorial Playlist Scraper (Playwright)');
  console.log('   Using browser to extract transcripts');
  console.log('   Chunking every ~20 seconds, summarizing each\n');
  console.log('='.repeat(60));
  
  // Ensure data directories exist
  await fs.mkdir('data/trick-tutorials', { recursive: true });
  
  // 1. Fetch playlist videos
  const videos = await fetchPlaylistVideos();
  
  // Save playlist info
  await fs.writeFile(
    'data/trick-tutorials/playlist-videos.json',
    JSON.stringify(videos, null, 2)
  );
  
  // 2. Launch browser
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: false });
  
  // 3. Process each video
  const tutorials: TrickTutorial[] = [];
  const trickMapping: Record<string, { videoId: string; aliases: string[]; stepCount: number }> = {};
  
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    console.log(`\n[${i + 1}/${videos.length}]`);
    
    const tutorial = await processTrickVideo(video, browser);
    
    if (tutorial) {
      tutorials.push(tutorial);
      
      // Build trick mapping
      trickMapping[tutorial.trickId] = {
        videoId: tutorial.videoId,
        aliases: tutorial.aliases,
        stepCount: tutorial.steps.length,
      };
      
      // Save individual tutorial
      await fs.writeFile(
        `data/trick-tutorials/${tutorial.trickId}.json`,
        JSON.stringify(tutorial, null, 2)
      );
      
      console.log(`  💾 Saved: ${tutorial.trickId}.json`);
    }
    
    // Delay between videos
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  await browser.close();
  
  // 4. Save combined data
  await fs.writeFile(
    'data/trick-tutorials/all-tutorials.json',
    JSON.stringify(tutorials, null, 2)
  );
  
  await fs.writeFile(
    'data/trick-tutorials/trick-mapping.json',
    JSON.stringify(trickMapping, null, 2)
  );
  
  // Summary
  const totalSteps = tutorials.reduce((sum, t) => sum + t.steps.length, 0);
  const avgSteps = tutorials.length > 0 ? Math.round(totalSteps / tutorials.length) : 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY:');
  console.log(`  📹 Videos processed: ${videos.length}`);
  console.log(`  ✅ Tutorials extracted: ${tutorials.length}`);
  console.log(`  📋 Total tips: ${totalSteps}`);
  console.log(`  📈 Average tips per video: ${avgSteps}`);
  console.log('\n📁 Saved to data/trick-tutorials/');
  console.log('\n🎯 Next: Run upload-trick-tutorials.ts to upload to Pinecone');
}

main().catch(console.error);
