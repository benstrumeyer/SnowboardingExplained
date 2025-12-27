#!/bin/bash

# Test the mesh data API endpoint
# Usage: ./test-mesh-api.sh <videoId>

VIDEOID="${1:-v_1766828373685_1}"
URL="http://localhost:3001/api/mesh-data/$VIDEOID"

echo "Testing mesh data API..."
echo "URL: $URL"
echo ""

curl -s "$URL" | jq '.' | head -100
