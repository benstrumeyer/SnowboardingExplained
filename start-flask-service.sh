#!/bin/bash
# Start Flask wrapper for pose service

cd /home/ben/pose-service
source 4D-Humans/venv/bin/activate

echo "Starting Flask wrapper..."
echo "Log file: /tmp/pose-service-logs/flask_wrapper.log"

python flask_wrapper_minimal_safe.py
