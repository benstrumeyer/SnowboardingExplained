# Transcript Issue - How to Fix

## Problem
The Snowboarding Explained videos don't have auto-generated captions enabled, so we can't scrape transcripts automatically.

## Solutions

### Option 1: Find Videos With Captions (Quick Test)
1. Go to https://www.youtube.com/@SnowboardingExplained/videos
2. Click on a video
3. Click the CC (closed captions) button
4. If captions appear, copy the video ID from the URL
5. Add it to `scripts/1-scrape-transcripts.ts`

### Option 2: Use YouTube Data API (Recommended)
We can use YouTube's API to:
1. Get all video IDs from the channel
2. Check which ones have captions
3. Only scrape those

**I can implement this if you want!**

### Option 3: Manual Transcription (Last Resort)
If the channel doesn't have captions, we'd need to:
1. Use a transcription service (Whisper AI, etc.)
2. Manually transcribe key videos
3. Or ask the channel owner to enable auto-captions

## What Should We Do?

**Recommendation:** Let me implement Option 2 (YouTube Data API).

It requires:
1. YouTube Data API key (free, easy to get)
2. 5 minutes to set up
3. Then we can scrape ALL videos that have captions

Want me to do this?
