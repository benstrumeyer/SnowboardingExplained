#!/usr/bin/env python3
"""
Simple Flask HTTP wrapper for testing.
This version doesn't require HMR2/PHALP - just tests the HTTP server.
"""

import os
import sys
import json
import base64
import io
import time
from flask import Flask, request, jsonify

# Initialize Flask app
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

models_loaded = True

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ready',
        'models': {
            'hmr2': 'loaded',
            'phalp': 'loaded'
        },
        'device': 'cuda',
        'ready': True
    })

@app.route('/pose/hybrid', methods=['POST'])
def pose_hybrid():
    """
    Process a single frame with 4D-Humans + PHALP tracking.
    """
    frame_number = 0
    start_time = time.time()
    
    try:
        # Parse request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        image_base64 = data.get('image_base64')
        frame_number = data.get('frame_number', 0)
        
        if not image_base64:
            return jsonify({'error': 'Missing image_base64'}), 400
        
        print(f"[POSE] Processing frame {frame_number}...")
        
        # Decode image
        try:
            image_data = base64.b64decode(image_base64)
            print(f"[POSE] Image decoded: {len(image_data)} bytes")
        except Exception as e:
            print(f"[POSE] ✗ Failed to decode image: {e}")
            return jsonify({
                'frame_number': frame_number,
                'error': f'Failed to decode image: {str(e)}'
            }), 400
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        print(f"[POSE] ✓ Frame {frame_number} complete ({processing_time_ms:.0f}ms)")
        
        # Return mock response
        return jsonify({
            'frame_number': frame_number,
            'keypoints': [],
            'has_3d': False,
            'mesh_vertices_data': None,
            'mesh_faces_data': None,
            'camera_translation': [0, 0, 5],
            'processing_time_ms': processing_time_ms,
            'error': None
        })
        
    except Exception as e:
        print(f"[POSE] ✗ Error processing frame {frame_number}: {e}")
        processing_time_ms = (time.time() - start_time) * 1000
        return jsonify({
            'frame_number': frame_number,
            'error': str(e),
            'processing_time_ms': processing_time_ms
        }), 500

if __name__ == '__main__':
    print("[STARTUP] Starting Flask server (simple mode)...")
    print("[STARTUP] Starting Flask server on 0.0.0.0:5000...")
    
    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True
    )
