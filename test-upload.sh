#!/bin/bash

# Test large video upload
# Usage: ./test-upload.sh <path-to-video> <role>

VIDEO_FILE="${1:-.}"
ROLE="${2:-rider}"
API_URL="http://localhost:3001"

if [ ! -f "$VIDEO_FILE" ]; then
  echo "❌ Video file not found: $VIDEO_FILE"
  exit 1
fi

FILE_SIZE=$(stat -f%z "$VIDEO_FILE" 2>/dev/null || stat -c%s "$VIDEO_FILE" 2>/dev/null)
FILE_SIZE_MB=$((FILE_SIZE / 1024 / 1024))

echo "📹 Testing video upload"
echo "   File: $VIDEO_FILE"
echo "   Size: ${FILE_SIZE_MB}MB"
echo "   Role: $ROLE"
echo ""

# Upload with verbose output
echo "🚀 Starting upload..."
RESPONSE=$(curl -v -X POST \
  -F "video=@$VIDEO_FILE" \
  -F "role=$ROLE" \
  "$API_URL/api/upload-video-with-pose" 2>&1)

echo ""
echo "📊 Response:"
echo "$RESPONSE" | grep -E '(HTTP|videoId|error|success)' || echo "$RESPONSE"

# Extract videoId if successful
VIDEO_ID=$(echo "$RESPONSE" | grep -o '"videoId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$VIDEO_ID" ]; then
  echo ""
  echo "✅ Upload successful!"
  echo "   Video ID: $VIDEO_ID"
  echo ""
  echo "🔍 Checking status..."
  
  # Poll status
  for i in {1..60}; do
    STATUS=$(curl -s "$API_URL/api/upload-status/$VIDEO_ID")
    PROGRESS=$(echo "$STATUS" | grep -o '"processingProgress":[0-9]*' | cut -d':' -f2)
    CURRENT=$(echo "$STATUS" | grep -o '"currentFrame":[0-9]*' | cut -d':' -f2)
    TOTAL=$(echo "$STATUS" | grep -o '"totalFrames":[0-9]*' | cut -d':' -f2)
    
    echo "   Progress: ${PROGRESS}% (Frame $CURRENT/$TOTAL)"
    
    if echo "$STATUS" | grep -q '"status":"complete"'; then
      echo "✅ Processing complete!"
      break
    elif echo "$STATUS" | grep -q '"status":"error"'; then
      ERROR=$(echo "$STATUS" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
      echo "❌ Processing failed: $ERROR"
      break
    fi
    
    sleep 2
  done
else
  echo ""
  echo "❌ Upload failed!"
  echo "   Check backend logs for details"
fi
