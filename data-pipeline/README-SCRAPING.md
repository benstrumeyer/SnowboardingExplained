# Channel Scraping Guide

## 🎯 Goal
Scrape all ~200 videos from the Snowboarding Explained YouTube channel and upload to Pinecone.

## 📋 Two Scenarios

### Scenario A: Starting Fresh (No Videos in Pinecone)

Just run:
```bash
scrape-all-videos.bat
```

### Scenario B: You Already Have Videos in Pinecone ⭐ (YOUR CASE)

**Step 1:** Extract existing videos
```bash
extract-existing.bat
```

**Step 2:** Scrape remaining videos
```bash
scrape-all-videos.bat
```

## 🔍 What Each Script Does

### `extract-existing.bat`
- Queries Pinecone database
- Finds all video IDs already uploaded
- Saves them to `data/processed-videos.json`
- Takes ~30 seconds

**Output:**
```
✅ Found 30 unique videos in database
💾 Saved to data/processed-videos.json

Video IDs:
  1. abc123xyz - https://youtube.com/watch?v=abc123xyz
  2. def456uvw - https://youtube.com/watch?v=def456uvw
  ...
```

### `scrape-all-videos.bat`
- Scrolls through entire YouTube channel
- Gets all ~200 video IDs
- Skips videos in `processed-videos.json`
- Processes remaining videos
- Takes ~2 minutes per video (with rate limiting)

**Output:**
```
📦 Already processed: 30 videos
✅ Found 200 total videos on channel
📹 New videos to process: 170
⏱️  Estimated time: ~340 minutes
```

## ⚡ Quick Commands

```bash
# If you have existing videos (YOUR CASE)
cd SnowboardingExplained/data-pipeline
extract-existing.bat
scrape-all-videos.bat

# If starting fresh
cd SnowboardingExplained/data-pipeline
scrape-all-videos.bat
```

## 🛡️ Safety Features

✅ **Deduplication** - Won't process same video twice
✅ **Rate Limiting** - Respects API limits automatically
✅ **Auto-Retry** - Retries failed videos up to 3 times
✅ **Resumable** - Stop and restart anytime
✅ **Progress Tracking** - Shows time elapsed and remaining

## 📊 Progress Display

```
📥 [45/170] abc123xyz
   https://youtube.com/watch?v=abc123xyz
  📝 52 sentences
  🤖 Summarizing 5 tips into bullet points...
    Summarized 2/5...
    Summarized 4/5...
  ☁️  Uploading 5 vectors...
  ✅ Uploaded!

📊 Progress: 45/170 | ✅ 43 | ❌ 2 | ☁️ 215 vectors
⏱️  Elapsed: 90m | Remaining: ~250m
```

## 🚨 Common Issues

### "It's processing videos I already have!"
**Solution:** Run `extract-existing.bat` first

### "Rate limit errors"
**Solution:** Script handles this automatically - just wait

### "Some videos fail"
**Solution:** Normal - some videos don't have transcripts

### "Want to stop and resume later?"
**Solution:** Press `Ctrl+C`, then run `scrape-all-videos.bat` again

## 📁 Files Created

- `data/processed-videos.json` - List of completed video IDs
- Browser window opens (non-headless) so you can watch progress

## ⏱️ Time Estimates

- **Extract existing:** ~30 seconds
- **Per video:** ~2 minutes (includes rate limiting)
- **170 new videos:** ~5-6 hours
- **200 videos (fresh):** ~6-7 hours

## 🎉 After Completion

All videos will be searchable in your mobile app!

Test with queries like:
- "How do I carve better?"
- "Tips for riding powder"
- "How to do a backside 180"
