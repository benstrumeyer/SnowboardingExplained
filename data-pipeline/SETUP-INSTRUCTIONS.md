# Setup Instructions (Git Bash)

## Step 1: Install Playwright

Open **Git Bash** and run:

```bash
cd ~/repos/SnowboardingExplained/data-pipeline

# Install playwright
npm install playwright

# Install Chromium browser
npx playwright install chromium
```

## Step 2: Run the Scraper

```bash
# Run the Playwright scraper
npx tsx scripts/playwright-scrape.ts
```

This will:
- Open Chrome browser (you'll see it)
- Visit first 5 YouTube videos
- Click "Show transcript" on each
- Extract and save transcripts to `data/transcripts/`

## Step 3: Process the Data

After scraping, run the rest of the pipeline:

```bash
# Chunk transcripts into 30-second segments
npx tsx scripts/2-chunk-transcripts.ts

# Generate embeddings with Gemini
npx tsx scripts/3-generate-embeddings.ts

# Upload to Pinecone
npx tsx scripts/4-upload-pinecone.ts
```

## All-in-One Command

Or run everything at once:

```bash
npx tsx scripts/playwright-scrape.ts && \
npx tsx scripts/2-chunk-transcripts.ts && \
npx tsx scripts/3-generate-embeddings.ts && \
npx tsx scripts/4-upload-pinecone.ts
```

## Troubleshooting

**"npx: command not found"**
- Make sure Node.js is installed: `node --version`
- Restart Git Bash after installing Node

**"Cannot find module 'playwright'"**
- Run: `npm install` in the data-pipeline folder

**Browser doesn't open**
- Run: `npx playwright install chromium`

**Scraper finds no transcripts**
- Check that transcripts are enabled on the videos
- Try opening a video manually and clicking "Show transcript"
- The script might need selector updates if YouTube changed their UI

## Scrape More Videos

To scrape all 30 videos instead of just 5, edit `scripts/playwright-scrape.ts`:

Change line:
```typescript
for (let i = 0; i < Math.min(videoIds.length, 5); i++) {
```

To:
```typescript
for (let i = 0; i < videoIds.length; i++) {
```
