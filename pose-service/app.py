#!/usr/bin/env python3
"""
Pose Service Entry Point

Reads frames from stdin (JSON format), processes them with 4DHumans and ViTPose,
and outputs pose data to stdout (JSON format).

Input format:
{
  "frames": [
    {
      "frameNumber": 0,
      "imageBase64": "base64-encoded-image-data"
    },
    {
      "frameNumber": 1,
      "imagePath": "/path/to/image.jpg"
    }
  ]
}

Output format:
[
  {
    "frameNumber": 0,
    "keypoints": [...],
    "has3d": true,
    "jointAngles3d": {...},
    "mesh_vertices_data": [...],
    "mesh_faces_data": [...],
    "processingTimeMs": 250
  },
  {
    "frameNumber": 1,
    "error": "error message"
  }
]
"""

import json
import sys
import base64
import time
from pathlib import Path
from src.pose_detector import PoseDetector

def main():
    try:
        # Load models once at startup
        detector = PoseDetector(model_cache_dir='.models')
        
        # Read input from stdin with robust error handling
        # Use a timeout to prevent hanging if stdin is closed unexpectedly
        try:
            input_data = sys.stdin.read()
            if not input_data:
                raise ValueError("No input data received on stdin")
            request = json.loads(input_data)
            frames = request.get('frames', [])
        except json.JSONDecodeError as e:
            sys.stderr.write(f"Failed to parse JSON from stdin: {str(e)}\n")
            sys.exit(1)
        except Exception as e:
            sys.stderr.write(f"Failed to read from stdin: {str(e)}\n")
            sys.exit(1)
        
        # Process frames
        results = []
        for frame in frames:
            frame_start = time.time()
            try:
                frame_number = frame.get('frameNumber', 0)
                
                if 'imageBase64' in frame:
                    # Decode base64
                    image_data = base64.b64decode(frame['imageBase64'])
                    result = detector.detect(image_data)
                elif 'imagePath' in frame:
                    # Load from file
                    result = detector.detect_from_file(frame['imagePath'])
                else:
                    raise ValueError("Frame must have either 'imageBase64' or 'imagePath'")
                
                processing_time = (time.time() - frame_start) * 1000
                
                results.append({
                    'frameNumber': frame_number,
                    'keypoints': result['keypoints'],
                    'has3d': result['has3d'],
                    'jointAngles3d': result.get('joint_angles_3d'),
                    'mesh_vertices_data': result.get('mesh_vertices'),
                    'mesh_faces_data': result.get('mesh_faces'),
                    'cameraTranslation': result.get('camera_translation'),
                    'processingTimeMs': processing_time
                })
            except Exception as e:
                processing_time = (time.time() - frame_start) * 1000
                results.append({
                    'frameNumber': frame.get('frameNumber', 0),
                    'error': str(e),
                    'processingTimeMs': processing_time
                })
        
        # Write output to stdout
        json.dump(results, sys.stdout)
        sys.stdout.flush()
        
    except Exception as e:
        # Write error to stderr and exit with error code
        sys.stderr.write(f"Fatal error: {str(e)}\n")
        sys.exit(1)

if __name__ == '__main__':
    main()
