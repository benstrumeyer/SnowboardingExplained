/**
 * Fetch Video Durations from YouTube
 * 
 * Fetches video durations from YouTube API and updates Pinecone metadata
 * with the totalDuration field for all videos
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

async function fetchVideoDurations() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX || 'snowboarding-explained';
  const index = pinecone.index(indexName);
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;

  if (!youtubeApiKey) {
    console.error('YOUTUBE_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('Fetching all unique videos from Pinecone...\n');

  // Get all videos
  const dummyVector = new Array(768).fill(0);
  const queryResponse = await index.query({
    vector: dummyVector,
    topK: 1000,
    includeMetadata: true,
  });

  // Get unique video IDs
  const videoIds = new Set<string>();
  const videoMap = new Map<string, { title: string; duration: number }>();

  for (const match of queryResponse.matches || []) {
    const videoId = match.metadata?.videoId as string;
    const videoTitle = match.metadata?.videoTitle as string;
    const existingDuration = match.metadata?.totalDuration as number;

    if (videoId && !videoIds.has(videoId)) {
      videoIds.add(videoId);
      videoMap.set(videoId, {
        title: videoTitle || 'Untitled',
        duration: existingDuration || 0,
      });
    }
  }

  console.log(`Found ${videoIds.size} unique videos\n`);

  // Fetch durations from YouTube API
  const videosNeedingDuration = Array.from(videoIds).filter(
    (id) => !videoMap.get(id)?.duration || videoMap.get(id)!.duration === 0
  );

  console.log(`Fetching durations for ${videosNeedingDuration.length} videos...\n`);

  let processed = 0;
  const updatedVideos: Array<{ videoId: string; duration: number }> = [];

  for (const videoId of videosNeedingDuration) {
    processed++;
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=contentDetails`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const duration = data.items[0].contentDetails.duration;
        // Parse ISO 8601 duration (e.g., PT1H23M45S)
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(match?.[1] || '0', 10);
        const minutes = parseInt(match?.[2] || '0', 10);
        const seconds = parseInt(match?.[3] || '0', 10);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        videoMap.set(videoId, {
          ...videoMap.get(videoId)!,
          duration: totalSeconds,
        });

        updatedVideos.push({ videoId, duration: totalSeconds });
        console.log(`[${processed}/${videosNeedingDuration.length}] ${videoMap.get(videoId)?.title}: ${totalSeconds}s`);
      }
    } catch (err) {
      console.error(`Error fetching duration for ${videoId}:`, err);
    }

    // Rate limiting: YouTube API has quotas
    if (processed % 50 === 0) {
      console.log('Waiting 1 second to avoid rate limiting...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`\nUpdating Pinecone with ${updatedVideos.length} video durations...\n`);

  // Update Pinecone metadata for all vectors
  let totalUpdated = 0;
  for (const { videoId, duration } of updatedVideos) {
    try {
      // Query all vectors for this video
      const videoResponse = await index.query({
        vector: dummyVector,
        topK: 500,
        includeMetadata: true,
        filter: {
          videoId: { $eq: videoId },
        },
      });

      // Update each vector with the duration
      if (videoResponse.matches && videoResponse.matches.length > 0) {
        // Update vectors one at a time (Pinecone SDK limitation)
        for (const match of videoResponse.matches) {
          const updatedMetadata = match.metadata ? { ...match.metadata } : {};
          updatedMetadata.totalDuration = duration;
          
          await index.update({
            id: match.id,
            metadata: updatedMetadata,
          });
          totalUpdated++;
        }

        console.log(`Updated ${videoResponse.matches.length} vectors for video ${videoId}`);
      }
    } catch (err) {
      console.error(`Error updating video ${videoId}:`, err);
    }
  }

  console.log(`\nCompleted! Updated ${totalUpdated} total vectors with duration information.`);
}

fetchVideoDurations().catch(console.error);
