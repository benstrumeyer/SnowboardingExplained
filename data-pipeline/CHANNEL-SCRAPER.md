# Channel-Wide Video Scraper

This script scrapes ALL videos from the Snowboarding Explained YouTube channel and uploads them to Pinecone.

## Features

✅ **Automatic Channel Scraping** - Scrolls through the entire channel to find all ~200 videos
✅ **Deduplication** - Tracks processed videos to avoid re-scraping
✅ **Rate Limiting** - Respects Gemini API limits (15 requests/minute)
✅ **Auto-Retry** - Retries failed videos up to 3 times
✅ **Progress Tracking** - Shows elapsed time and estimated remaining time
✅ **Resumable** - Can stop and resume without losing progress

## Usage

### First Time Setup (If You Have Existing Data)

If you already have videos in Pinecone, run this first to avoid duplicates:

```bash
cd SnowboardingExplained/data-pipeline
extract-existing.bat
```

This will query Pinecone and create `data/processed-videos.json` with all existing video IDs.

### Quick Start

```bash
cd SnowboardingExplained/data-pipeline
scrape-all-videos.bat
```

### Manual Run

```bash
npx tsx scripts/playwright-scrape-pinecone.ts
```

**Note:** The scraper now automatically queries Pinecone on startup to detect existing videos, but running `extract-existing.bat` first is faster and more thorough.

## How It Works

1. **Fetch Existing Videos** - Checks `data/processed-videos.json` to see what's already done
2. **Scrape Channel** - Scrolls through the channel page to get all video IDs
3. **Filter New Videos** - Only processes videos not in the database
4. **For Each Video:**
   - Scrape transcript from YouTube
   - Extract actionable tips using AI
   - Summarize tips into bullet points
   - Generate embeddings
   - Upload to Pinecone
   - Save video ID to processed list

## Progress Tracking

The script saves progress in `data/processed-videos.json`. If the script crashes or you stop it:
- Just run it again
- It will skip already-processed videos
- Continue from where it left off

## Rate Limiting

- **Gemini API**: 4 seconds between requests (15 RPM limit)
- **Auto-backoff**: Waits 60 seconds if rate limit hit
- **Safe to leave running**: Designed for unattended operation

## Output

```
📊 Progress: 50/200 | ✅ 45 | ❌ 5 | ☁️ 225 vectors
⏱️  Elapsed: 120m | Remaining: ~240m
```

- **Progress**: Videos processed / Total videos
- **✅**: Successfully processed
- **❌**: Failed (no transcript, errors, etc.)
- **☁️**: Total vectors uploaded to Pinecone
- **Elapsed**: Time spent so far
- **Remaining**: Estimated time left

## Troubleshooting

### "No transcript available"
Some videos don't have transcripts. These are automatically skipped.

### Rate limit errors
The script automatically waits and retries. Just let it run.

### Browser crashes
The script will retry up to 3 times per video.

### Want to re-process a video?
Delete its ID from `data/processed-videos.json`

## Extracting Existing Videos

If you already have videos in Pinecone and want to avoid re-processing them:

```bash
extract-existing.bat
```

This will:
1. Query your Pinecone database
2. Extract all unique video IDs
3. Save them to `data/processed-videos.json`
4. Show you the list of videos found

The scraper will then skip these videos automatically.

## Files Created

- `data/processed-videos.json` - List of successfully processed video IDs
- Browser will open in non-headless mode so you can see progress
