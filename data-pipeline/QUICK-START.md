# Quick Start Guide

## You Already Have 30 Videos in Pinecone

Follow these steps to avoid re-processing them:

### Step 1: Extract Existing Videos

```bash
cd SnowboardingExplained/data-pipeline
extract-existing.bat
```

This will:
- Query Pinecone for all existing videos
- Create `data/processed-videos.json` with the video IDs
- Show you which videos are already in the database

### Step 2: Scrape Remaining Videos

```bash
scrape-all-videos.bat
```

This will:
- Scrape all ~200 videos from the channel
- Skip the 30 videos already in Pinecone
- Process only the remaining ~170 videos
- Take approximately 5-6 hours (with rate limiting)

### What Happens

```
🔍 Fetching existing videos from Pinecone...
  Found 150 total vectors in database
  Loaded 30 videos from processed-videos.json
  Querying Pinecone for additional videos...
  Total unique videos found: 30

📦 Already processed: 30 videos

🎬 Scraping channel for all video IDs...
  Found 50 videos...
  Found 100 videos...
  Found 150 videos...
  Found 200 videos...

✅ Found 200 total videos on channel

📹 New videos to process: 170

⏱️  Estimated time: ~340 minutes (with rate limiting)
```

### Monitor Progress

The script shows real-time progress:

```
📥 [1/170] abc123xyz
   https://youtube.com/watch?v=abc123xyz
  📝 45 sentences
  🤖 Summarizing 5 tips into bullet points...
  ☁️  Uploading 5 vectors...
  ✅ Uploaded!

📊 Progress: 1/170 | ✅ 1 | ❌ 0 | ☁️ 5 vectors
⏱️  Elapsed: 2m | Remaining: ~338m
```

### Safe to Stop Anytime

- Press `Ctrl+C` to stop
- Progress is saved after each video
- Just run `scrape-all-videos.bat` again to resume
- It will skip already-processed videos

### Troubleshooting

**"It's re-processing videos I already have!"**
- Run `extract-existing.bat` first
- Check `data/processed-videos.json` has your video IDs

**"Rate limit errors"**
- The script automatically waits and retries
- This is normal, just let it run

**"Some videos fail"**
- Videos without transcripts are automatically skipped
- The script retries up to 3 times per video
- Failed videos are logged but don't stop the process

### After Completion

Test your mobile app - all ~200 videos will be searchable!
