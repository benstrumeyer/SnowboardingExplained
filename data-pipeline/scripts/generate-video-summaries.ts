/**
 * Generate Video Summaries
 * 
 * For each unique video in Pinecone, generate a concise 3-5 point summary
 * and add it as summaryOnly entries to Pinecone
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

interface VideoInfo {
  videoId: string;
  title: string;
  segments: string[];
}

const SUMMARY_PROMPT = `Create a 3-5 point summary of what this snowboarding video teaches. Each point should be one concise sentence with enough detail to be useful. Return only a JSON array of strings, nothing else.

Transcript:
{SEGMENTS}`;

async function generateVideoSummaries() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  const index = pinecone.index(indexName);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  console.log('Fetching all videos from Pinecone...\n');

  // Get all videos
  const dummyVector = new Array(768).fill(0);
  const queryResponse = await index.query({
    vector: dummyVector,
    topK: 1000,
    includeMetadata: true,
  });

  // Get videos that already have summaries
  const videosWithSummaries = new Set<string>();
  for (const match of queryResponse.matches || []) {
    const summaryOnly = match.metadata?.summaryOnly as boolean;
    const videoId = match.metadata?.videoId as string;
    if (summaryOnly && videoId) {
      videosWithSummaries.add(videoId);
    }
  }

  console.log(`Found ${videosWithSummaries.size} videos that already have summaries\n`);

  // Group by videoId (excluding videos that already have summaries)
  const videoMap = new Map<string, VideoInfo>();

  for (const match of queryResponse.matches || []) {
    const videoId = match.metadata?.videoId as string;
    const videoTitle = match.metadata?.videoTitle as string;
    const text = match.metadata?.text as string;
    const summaryOnly = match.metadata?.summaryOnly as boolean;

    // Skip if this is a summary entry or if video already has summaries
    if (summaryOnly || videosWithSummaries.has(videoId)) {
      continue;
    }

    if (videoId && !videoMap.has(videoId)) {
      videoMap.set(videoId, {
        videoId,
        title: videoTitle || 'Untitled',
        segments: [],
      });
    }

    if (videoId && text) {
      videoMap.get(videoId)!.segments.push(text);
    }
  }

  console.log(`Found ${videoMap.size} unique videos needing summaries\n`);

  let processed = 0;
  const summaries: Array<{ videoId: string; title: string; summaryPoints: string[] }> = [];

  for (const [videoId, videoInfo] of videoMap) {
    processed++;
    console.log(`[${processed}/${videoMap.size}] Processing: ${videoInfo.title}`);

    let retries = 0;
    let success = false;

    while (!success) {
      try {
        // Take first 10 segments for context
        const contextSegments = videoInfo.segments.slice(0, 10).join('\n\n');

        const prompt = SUMMARY_PROMPT.replace('{SEGMENTS}', contextSegments);
        const result = await textModel.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON array from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.log(`  ⚠️  Could not parse summary for ${videoId}`);
          break;
        }

        const summaryPoints = JSON.parse(jsonMatch[0]) as string[];
        summaries.push({
          videoId,
          title: videoInfo.title,
          summaryPoints: summaryPoints.slice(0, 5), // Max 5 points
        });

        console.log(`  ✓ Generated ${summaryPoints.length} summary points`);
        success = true;
      } catch (error: any) {
        const errorMsg = error?.toString() || '';
        if (errorMsg.includes('429') || errorMsg.includes('Resource exhausted')) {
          retries++;
          const delay = Math.min(Math.pow(2, retries) * 2000, 60000); // Exponential backoff, max 60s
          console.log(`  ⏳ Rate limited, waiting ${delay}ms before retry (attempt ${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.log(`  ✗ Error generating summary: ${error}`);
          break;
        }
      }
    }

    // Small delay between videos
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n\nGenerated summaries for ${summaries.length} videos`);
  console.log('Uploading to Pinecone...\n');

  // Upload summaries to Pinecone
  let uploaded = 0;
  for (const summary of summaries) {
    try {
      // Create a summary entry for each point
      for (let i = 0; i < summary.summaryPoints.length; i++) {
        const point = summary.summaryPoints[i];
        const id = `${summary.videoId}-summary-${i}`;

        // Generate embedding for the summary point
        const embeddingResponse = await embeddingModel.embedContent(point);
        const embedding = embeddingResponse.embedding.values;

        await index.upsert([
          {
            id,
            values: embedding,
            metadata: {
              videoId: summary.videoId,
              videoTitle: summary.title,
              text: point,
              summaryOnly: true,
              pointIndex: i,
            },
          },
        ]);

        uploaded++;
      }

      console.log(`✓ Uploaded ${summary.summaryPoints.length} points for: ${summary.title}`);
    } catch (error) {
      console.log(`✗ Error uploading summary for ${summary.videoId}: ${error}`);
    }
  }

  console.log(`\n✓ Done! Uploaded ${uploaded} summary points to Pinecone`);
}

generateVideoSummaries().catch(console.error);
