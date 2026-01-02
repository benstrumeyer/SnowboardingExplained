#!/bin/bash
set -x

cd ~/repos/4D-Humans
source /home/ben/repos/SnowboardingExplained/backend/pose-service/venv/bin/activate
export PYTHONUNBUFFERED=1

echo "Starting track.py in isolation..."
python -u track.py \
  video.source=/tmp/not2.mp4 \
  video.output_dir=/tmp/test_output_not2 \
  phalp.end_frame=5 \
  hydra.run.dir=. \
  hydra.output_subdir=null
