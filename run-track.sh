#!/bin/bash
# Run track.py directly - exactly like 4D-Humans does it
# No Flask, no subprocess complexity, just Hydra + PHALP

set -e

cd /home/ben/pose-service

# Activate venv
source venv/bin/activate

# Run track.py with streaming mode to avoid OOM
# Pass video path as first argument
python -B 4D-Humans/track.py \
  video.video_path="$1" \
  video.extract_video=False \
  "$@"
