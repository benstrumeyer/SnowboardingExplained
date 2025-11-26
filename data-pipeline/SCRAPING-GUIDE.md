# YouTube Transcript Scraping Guide

## Setup

1. **Install Playwright:**
```bash
cd data-pipeline
# On Windows (if npm doesn't work due to execution policy):
node node_modules\npm\bin\npm-cli.js install
node node_modules\playwright\cli.js install chromium
```

2. **Run the scraper:**
```bash
node node_modules\tsx\dist\cli.mjs scripts\playwright-scrape.ts
```

## How it works

The Playwright script:
1. Opens each YouTube video in a browser
2. Clicks the "Show transcript" button
3. Extracts all transcript segments with timestamps
4. Saves to `data/transcripts/{videoId}.json`

## After scraping

Once you have transcripts, run the rest of the pipeline:

```bash
# Chunk the transcripts
node node_modules\tsx\dist\cli.mjs scripts\2-chunk-transcripts.ts

# Generate embeddings
node node_modules\tsx\dist\cli.mjs scripts\3-generate-embeddings.ts

# Upload to Pinecone
node node_modules\tsx\dist\cli.mjs scripts\4-upload-pinecone.ts
```

## Troubleshooting

**"No transcript button found"**
- The video might not have transcripts enabled
- YouTube's UI might have changed (update selectors in script)

**Browser doesn't open**
- Run: `node node_modules\playwright\cli.js install chromium`

**Slow scraping**
- The script runs with `headless: false` so you can see progress
- Change to `headless: true` for faster scraping
- Adjust delays in the script if needed

## Manual alternative

If automated scraping doesn't work, you can manually:
1. Open each video
2. Click "Show transcript"
3. Copy the transcript text
4. Save to `data/transcripts/{videoId}.txt`
5. Run a converter script to format it properly
