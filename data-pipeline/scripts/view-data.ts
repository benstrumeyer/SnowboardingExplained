import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Video {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
}

const dataPath = path.join(__dirname, '../data/video-database.json');
const videos: Video[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('\n=== SNOWBOARDING EXPLAINED VIDEO DATABASE ===\n');
console.log(`Total Videos: ${videos.length}\n`);

// Show first 10 records
const sample = videos.slice(0, 10);

console.log('┌─────┬──────────────┬────────────────────────────────────────────────────────────────┐');
console.log('│ #   │ Video ID     │ Title                                                          │');
console.log('├─────┼──────────────┼────────────────────────────────────────────────────────────────┤');

sample.forEach((video, index) => {
  const num = String(index + 1).padEnd(3);
  const id = video.videoId.padEnd(12);
  const title = video.title.length > 62 ? video.title.substring(0, 59) + '...' : video.title.padEnd(62);
  console.log(`│ ${num} │ ${id} │ ${title} │`);
});

console.log('└─────┴──────────────┴────────────────────────────────────────────────────────────────┘');

console.log('\n=== DETAILED VIEW ===\n');

sample.forEach((video, index) => {
  console.log(`\n[${index + 1}] ${video.title}`);
  console.log(`    Video ID: ${video.videoId}`);
  console.log(`    URL: ${video.url}`);
  console.log(`    Thumbnail: ${video.thumbnail}`);
});

console.log('\n');
