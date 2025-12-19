#!/usr/bin/env python3
"""
Test script to process a video file and send frames to the pose detection service.
Useful for debugging mesh/keypoint alignment issues.
"""

import base64
import cv2
import requests
import sys
import argparse
from pathlib import Path

def process_video(video_path, service_url="http://172.24.183.130:5000", frame_skip=1, max_frames=None):
    """
    Process video file and send frames to pose detection service.
    
    Args:
        video_path: Path to video file
        service_url: URL of pose detection service
        frame_skip: Process every Nth frame (1 = all frames)
        max_frames: Maximum number of frames to process
    """
    video_path = Path(video_path)
    if not video_path.exists():
        print(f"Error: Video file not found: {video_path}")
        return
    
    print(f"Opening video: {video_path}")
    cap = cv2.VideoCapture(str(video_path))
    
    if not cap.isOpened():
        print(f"Error: Could not open video file")
        return
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Video info: {total_frames} frames @ {fps} FPS")
    
    frame_count = 0
    processed_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Skip frames if requested
        if frame_count % frame_skip != 0:
            frame_count += 1
            continue
        
        # Stop if max frames reached
        if max_frames and processed_count >= max_frames:
            break
        
        # Encode frame to base64
        _, buffer = cv2.imencode('.png', frame)
        image_base64 = base64.b64encode(buffer).decode()
        
        # Send to service
        print(f"\nFrame {frame_count} (processed #{processed_count})...")
        try:
            response = requests.post(
                f"{service_url}/pose/hybrid",
                json={
                    'image_base64': image_base64,
                    'frame_number': frame_count,
                    'visualize': True
                },
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                has_3d = result.get('has_3d', False)
                keypoint_count = result.get('keypoint_count', 0)
                processing_time = result.get('processing_time_ms', 0)
                
                print(f"  ✓ Response: 3D={has_3d}, keypoints={keypoint_count}, time={processing_time}ms")
                
                # Show mesh info if available
                if result.get('mesh_rendered'):
                    print(f"  ✓ Mesh rendered")
                
                # Show camera info if available
                if result.get('camera_translation'):
                    cam_t = result['camera_translation']
                    print(f"  Camera translation: {cam_t}")
                
                # Show error if any
                if result.get('error'):
                    print(f"  ⚠ Error: {result['error']}")
            else:
                print(f"  ✗ HTTP {response.status_code}: {response.text}")
        
        except requests.exceptions.Timeout:
            print(f"  ✗ Request timeout (120s)")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        frame_count += 1
        processed_count += 1
    
    cap.release()
    print(f"\nProcessed {processed_count} frames from {total_frames} total")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Test pose detection service with video file')
    parser.add_argument('video', help='Path to video file')
    parser.add_argument('--url', default='http://172.24.183.130:5000', help='Service URL')
    parser.add_argument('--skip', type=int, default=1, help='Process every Nth frame')
    parser.add_argument('--max', type=int, help='Maximum frames to process')
    
    args = parser.parse_args()
    
    process_video(args.video, args.url, args.skip, args.max)
