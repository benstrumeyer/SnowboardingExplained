#!/bin/bash
# Check if track.py exists in WSL and is accessible

echo "=========================================="
echo "CHECK track.py IN WSL"
echo "=========================================="

echo ""
echo "[1] Check if track.py exists:"
ls -la ~/pose-service/4D-Humans/track.py 2>&1

echo ""
echo "[2] Check if it's a symlink:"
file ~/pose-service/4D-Humans/track.py 2>&1

echo ""
echo "[3] Check if it's readable:"
head -5 ~/pose-service/4D-Humans/track.py 2>&1

echo ""
echo "[4] Check directory contents:"
ls -la ~/pose-service/4D-Humans/ | head -20

echo ""
echo "[5] Try to run track.py --help:"
cd ~/pose-service/4D-Humans
python track.py --help 2>&1 | head -20

echo ""
echo "=========================================="
