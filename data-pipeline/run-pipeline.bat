@echo off
echo Running Data Pipeline...
echo.

echo Step 1: Fetching video IDs...
node node_modules\tsx\dist\cli.mjs scripts\0-fetch-video-ids.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo Step 2: Scraping transcripts...
node node_modules\tsx\dist\cli.mjs scripts\1-scrape-transcripts.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo Step 3: Chunking transcripts...
node node_modules\tsx\dist\cli.mjs scripts\2-chunk-transcripts.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo Step 4: Generating embeddings...
node node_modules\tsx\dist\cli.mjs scripts\3-generate-embeddings.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo Step 5: Uploading to Pinecone...
node node_modules\tsx\dist\cli.mjs scripts\4-upload-pinecone.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo Pipeline complete!
