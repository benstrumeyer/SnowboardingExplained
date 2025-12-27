#!/usr/bin/env python3
"""Simple test to verify Flask wrapper starts and responds."""

import subprocess
import time
import requests
import sys
import signal
import os

def test_flask_wrapper():
    """Start Flask wrapper and test endpoints."""
    
    print("[TEST] Starting Flask wrapper...")
    
    # Start Flask wrapper as subprocess
    process = subprocess.Popen(
        [sys.executable, 'flask_wrapper.py'],
        cwd='/home/ben/pose-service',
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        preexec_fn=os.setsid  # Create new process group
    )
    
    print(f"[TEST] Flask process started (PID: {process.pid})")
    
    # Wait for Flask to start
    print("[TEST] Waiting for Flask to start...")
    time.sleep(3)
    
    try:
        # Test health endpoint
        print("[TEST] Testing /health endpoint...")
        response = requests.get('http://localhost:5000/health', timeout=5)
        print(f"[TEST] Status code: {response.status_code}")
        print(f"[TEST] Response: {response.json()}")
        
        if response.status_code == 200:
            print("[TEST] ✓ Health endpoint works!")
        else:
            print(f"[TEST] ✗ Health endpoint returned {response.status_code}")
    
    except requests.exceptions.ConnectionError as e:
        print(f"[TEST] ✗ Connection error: {e}")
        print("[TEST] Flask may not be listening on port 5000")
    except requests.exceptions.Timeout as e:
        print(f"[TEST] ✗ Timeout: {e}")
        print("[TEST] Flask is not responding")
    except Exception as e:
        print(f"[TEST] ✗ Error: {e}")
    
    finally:
        # Kill Flask process
        print("[TEST] Stopping Flask wrapper...")
        try:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            process.wait(timeout=5)
        except:
            process.kill()
        
        print("[TEST] Done")

if __name__ == '__main__':
    test_flask_wrapper()
