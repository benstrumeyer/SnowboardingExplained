# Data Pipeline - Setup Guide

## What This Does

This pipeline scrapes YouTube videos, processes transcripts, and uploads them to Pinecone for AI search.

## Prerequisites

1. **Node.js 18+** installed
2. **API Keys** (I'll show you how to get these)

## Step 1: Get API Keys

### Gemini API Key (for embeddings)
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### Pinecone API Key (for vector database)
1. Go to https://app.pinecone.io/
2. Sign up (free tier available)
3. Click "Create Index":
   - Name: `snowboarding-coach`
   - Dimensions: `768`
   - Metric: `cosine`
4. Copy your API key from the dashboard

## Step 2: Setup Environment

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys:
```env
GEMINI_API_KEY=your_key_here
PINECONE_API_KEY=your_key_here
PINECONE_INDEX=snowboarding-coach
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run the Pipeline

### Option A: Run all steps at once
```bash
npm run all
```

### Option B: Run step by step (recommended for first time)

**Step 1: Scrape transcripts**
```bash
npm run scrape
```
This downloads all video transcripts and saves them to `data/transcripts/`

**Step 2: Chunk transcripts**
```bash
npm run chunk
```
This splits transcripts into 30-second chunks and saves to `data/chunks/`

**Step 3: Generate embeddings**
```bash
npm run embed
```
This creates vector embeddings for each chunk using Gemini

**Step 4: Upload to Pinecone**
```bash
npm run upload
```
This uploads all embeddings to your Pinecone index

## Viewing Your Data

### View Transcripts
```bash
# Look in data/transcripts/
ls data/transcripts/
```

### View Chunks
```bash
# Open the chunks file
cat data/chunks/all-chunks.json
```

### View Embeddings
```bash
# Open the embeddings file (warning: large file!)
cat data/embeddings/embeddings.json
```

### View Pinecone Data
1. Go to https://app.pinecone.io/
2. Click on your `snowboarding-coach` index
3. You'll see:
   - Total vectors
   - Dimensions
   - Storage used
4. Click "Query" to test search

## Troubleshooting

### "GEMINI_API_KEY not found"
- Make sure you created `.env` file (not `.env.example`)
- Make sure you added your actual API key
- Make sure there are no spaces around the `=`

### "Pinecone index not found"
- Make sure you created the index in Pinecone dashboard
- Make sure the name matches exactly: `snowboarding-coach`
- Make sure dimensions are set to `768`

### "Rate limit exceeded"
- The scripts have delays built in
- If you still hit limits, increase the delay in the scripts
- Or run scripts one at a time with breaks

## Cost Estimate

- **Scraping:** FREE
- **Embeddings:** ~$0.50 for 200 videos
- **Pinecone:** FREE (up to 100k vectors)
- **Total:** ~$0.50 one-time cost

## Next Steps

After running the pipeline:
1. Your data is now in Pinecone
2. You can query it from the backend API
3. Move on to Phase 2: Building the API
