/**
 * Script 2: Chunk Transcripts (Semantic Chunking)
 * 
 * What this does:
 * 1. Reads all transcript files
 * 2. Splits them based on MEANING, not just time
 * 3. Looks for natural breaks (pauses, topic changes)
 * 4. Each chunk keeps its timestamp and video info
 * 
 * Why semantic chunking?
 * - Better search results (complete thoughts, not cut-off sentences)
 * - More coherent coaching advice
 * - Natural video segments
 * 
 * How it works:
 * - Looks for pauses (gaps in transcript)
 * - Detects sentence endings
 * - Groups related sentences together
 * - Aims for 20-40 second chunks (flexible)
 */

import fs from 'fs/promises';
import path from 'path';

interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number; // milliseconds
}

interface Chunk {
  id: string;
  videoId: string;
  videoTitle: string;
  text: string;
  timestamp: number; // seconds
  duration: number; // seconds
  topics: string[]; // We'll add this later
}

const MIN_CHUNK_DURATION = 15; // seconds
const MAX_CHUNK_DURATION = 45; // seconds
const IDEAL_CHUNK_DURATION = 30; // seconds

/**
 * Check if this is a good place to split
 * (sentence ending, pause, topic change)
 */
function isGoodSplitPoint(
  segment: TranscriptSegment,
  nextSegment: TranscriptSegment | undefined,
  currentDuration: number
): boolean {
  // Don't split if chunk is too short
  if (currentDuration < MIN_CHUNK_DURATION) {
    return false;
  }
  
  // Always split if chunk is too long
  if (currentDuration >= MAX_CHUNK_DURATION) {
    return true;
  }
  
  // Check for sentence endings
  const text = segment.text.trim();
  const endsWithPunctuation = /[.!?]$/.test(text);
  
  // Check for pause (gap between segments)
  if (nextSegment) {
    const gap = (nextSegment.offset - (segment.offset + segment.duration)) / 1000;
    const hasPause = gap > 1.5; // 1.5 second pause
    
    // Good split if: sentence ending + pause + near ideal length
    if (endsWithPunctuation && hasPause && currentDuration >= IDEAL_CHUNK_DURATION * 0.7) {
      return true;
    }
  }
  
  // Split at sentence ending if we're past ideal length
  if (endsWithPunctuation && currentDuration >= IDEAL_CHUNK_DURATION) {
    return true;
  }
  
  return false;
}

async function chunkTranscript(
  videoId: string,
  videoTitle: string,
  transcript: TranscriptSegment[]
): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let chunkStartTime = 0;
  let chunkIndex = 0;
  
  for (let i = 0; i < transcript.length; i++) {
    const segment = transcript[i];
    const nextSegment = transcript[i + 1];
    const segmentTime = segment.offset / 1000; // Convert to seconds
    const currentDuration = segmentTime - chunkStartTime;
    
    currentChunk.push(segment.text);
    
    // Check if we should split here
    if (isGoodSplitPoint(segment, nextSegment, currentDuration)) {
      chunks.push({
        id: `${videoId}_${chunkIndex}`,
        videoId,
        videoTitle,
        text: currentChunk.join(' ').trim(),
        timestamp: chunkStartTime,
        duration: currentDuration,
        topics: [],
      });
      
      currentChunk = [];
      chunkStartTime = nextSegment ? nextSegment.offset / 1000 : segmentTime;
      chunkIndex++;
    }
  }
  
  // Save last chunk
  if (currentChunk.length > 0) {
    const lastSegment = transcript[transcript.length - 1];
    const endTime = (lastSegment.offset + lastSegment.duration) / 1000;
    
    chunks.push({
      id: `${videoId}_${chunkIndex}`,
      videoId,
      videoTitle,
      text: currentChunk.join(' ').trim(),
      timestamp: chunkStartTime,
      duration: endTime - chunkStartTime,
      topics: [],
    });
  }
  
  return chunks;
}

async function main() {
  console.log('🔪 Starting transcript chunking...\n');
  
  // Read metadata
  const metadataPath = path.join('data', 'metadata.json');
  const metadataContent = await fs.readFile(metadataPath, 'utf-8');
  const metadata = JSON.parse(metadataContent);
  
  const allChunks: Chunk[] = [];
  
  for (const video of metadata) {
    console.log(`📄 Chunking: ${video.title}`);
    
    // Read transcript
    const transcriptPath = path.join('data', 'transcripts', `${video.videoId}.json`);
    const transcriptContent = await fs.readFile(transcriptPath, 'utf-8');
    const transcript = JSON.parse(transcriptContent);
    
    // Chunk it
    const chunks = await chunkTranscript(
      video.videoId,
      video.title,
      transcript
    );
    
    allChunks.push(...chunks);
    
    console.log(`  ✅ Created ${chunks.length} chunks`);
  }
  
  // Save all chunks
  const chunksPath = path.join('data', 'chunks', 'all-chunks.json');
  await fs.writeFile(
    chunksPath,
    JSON.stringify(allChunks, null, 2)
  );
  
  console.log('\n📊 Summary:');
  console.log(`📹 Videos processed: ${metadata.length}`);
  console.log(`📦 Total chunks: ${allChunks.length}`);
  console.log(`📁 Saved to: data/chunks/all-chunks.json`);
  
  // Show example chunk
  if (allChunks.length > 0) {
    console.log('\n📝 Example chunk:');
    console.log(JSON.stringify(allChunks[0], null, 2));
  }
}

main().catch(console.error);
