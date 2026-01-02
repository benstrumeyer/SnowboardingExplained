#!/bin/bash
set -x

echo "Uploading video to backend..."
RESPONSE=$(curl -s -X POST \
  -F "video=@/home/ben/videos/not2.mp4" \
  -F "max_frames=5" \
  http://localhost:3001/api/pose/video)

echo "Response: $RESPONSE"

# Extract job_id manually (simple grep)
JOB_ID=$(echo "$RESPONSE" | grep -o '"job_id":"[^"]*' | cut -d'"' -f4)
echo "Job ID: $JOB_ID"

if [ -z "$JOB_ID" ]; then
  echo "Failed to get job ID"
  exit 1
fi

# Wait and check logs
echo ""
echo "Waiting 5 seconds before checking logs..."
sleep 5

echo ""
echo "Checking job logs..."
curl -s http://localhost:5000/logs/$JOB_ID

echo ""
echo "Checking job status..."
curl -s http://localhost:5000/job_status/$JOB_ID
