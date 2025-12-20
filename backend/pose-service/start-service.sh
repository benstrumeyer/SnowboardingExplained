#!/bin/bash
# Start Pose Service in WSL with proper background handling
# Usage: ./start-service.sh

echo ""
echo "========================================"
echo "Pose Detection Service (WSL)"
echo "========================================"
echo ""

# Kill any existing service on port 5000
echo "Checking for existing service on port 5000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
sleep 1

# Start service in background with nohup
echo "Starting service in background..."
cd /home/ben/pose-service
source venv/bin/activate
nohup python app.py > /tmp/pose-service.log 2>&1 &
SERVICE_PID=$!

echo "Service started with PID: $SERVICE_PID"
sleep 3

# Check if it's running
echo "Checking service status..."
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✓ Service is running and responding!"
else
    echo "⚠ Service may still be warming up. Check logs:"
    echo "  tail -f /tmp/pose-service.log"
fi

echo ""
echo "========================================"
echo "Service Details"
echo "========================================"
echo ""
echo "Service URL: http://localhost:5000"
echo "WSL IP: 172.24.183.130:5000 (for mobile app)"
echo ""
echo "Endpoints:"
echo "  GET  /health - Health check"
echo "  POST /api/video/process_async - Process video"
echo ""
echo "Useful commands:"
echo "  View logs:"
echo "    tail -f /tmp/pose-service.log"
echo ""
echo "  Stop service:"
echo "    lsof -ti:5000 | xargs kill -9"
echo ""
echo "  Check status:"
echo "    curl -s http://localhost:5000/health | python -m json.tool"
echo ""
