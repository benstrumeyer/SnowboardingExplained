#!/usr/bin/env python3
"""
Safe wrapper for running the pose service with crash recovery.

This script:
1. Runs the Flask app as a subprocess
2. Detects crashes and restarts automatically
3. Logs all output to a file
4. Provides better diagnostics
"""

import sys
import os
import time
import subprocess
import logging
from pathlib import Path

# Setup logging
log_dir = Path(__file__).parent / 'logs'
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f'pose_service_{int(time.time())}.log'

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

logger.info("=" * 70)
logger.info("POSE SERVICE SAFE WRAPPER")
logger.info("=" * 70)
logger.info(f"Python: {sys.executable}")
logger.info(f"Version: {sys.version}")
logger.info(f"Working directory: {os.getcwd()}")
logger.info(f"Log file: {log_file}")
logger.info("=" * 70)

def run_app_subprocess():
    """Run the Flask app in a subprocess"""
    # Set environment variables
    env = os.environ.copy()
    env['PYTHONUNBUFFERED'] = '1'
    env['TORCH_HOME'] = str(Path.home() / '.cache' / 'torch')
    env['CUDA_LAUNCH_BLOCKING'] = '1'
    
    logger.info(f"TORCH_HOME: {env.get('TORCH_HOME')}")
    logger.info(f"CUDA_LAUNCH_BLOCKING: {env.get('CUDA_LAUNCH_BLOCKING')}")
    
    # Run app.py directly
    cmd = [sys.executable, 'app.py']
    logger.info(f"Starting subprocess: {' '.join(cmd)}")
    
    try:
        process = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Stream output
        for line in process.stdout:
            print(line, end='')
            logger.info(line.rstrip())
        
        # Wait for process to complete
        returncode = process.wait()
        logger.warning(f"Process exited with code: {returncode}")
        return returncode
        
    except Exception as e:
        logger.error(f"Failed to run subprocess: {e}", exc_info=True)
        return 1

if __name__ == '__main__':
    logger.info("Pose service wrapper starting...")
    
    max_restarts = 5
    restart_count = 0
    restart_delay = 2
    
    while restart_count < max_restarts:
        logger.info(f"Attempt {restart_count + 1}/{max_restarts}")
        
        returncode = run_app_subprocess()
        
        if returncode == 0:
            logger.info("Process exited normally")
            break
        
        restart_count += 1
        if restart_count < max_restarts:
            logger.warning(f"Process crashed, restarting in {restart_delay}s...")
            time.sleep(restart_delay)
        else:
            logger.error(f"Max restarts ({max_restarts}) reached, giving up")
            sys.exit(1)
