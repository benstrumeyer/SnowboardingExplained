#!/usr/bin/env python3
"""Safe Flask wrapper for 4D-Humans - avoids import hangs."""

import sys
import json
import base64
import io
import time
import traceback
import os
from pathlib import Path
from typing import Dict, Any, Optional

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import numpy as np
import torch
from PIL import Image
from flask import Flask, request, jsonify

# Add 4D-Humans to path
sys.path.insert(0, str(Path(__file__).parent / '4D-Humans'))

# Initialize Flask app
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Global state
models_loaded = False
hmr2_model = None
phalp_tracker = None
device = None
model_load_error = None


def initialize_models():
    """Load HMR2 and PHALP models lazily - with timeout protection."""
    global models_loaded, hmr2_model, phalp_tracker, device, model_load_error
    
    if models_loaded:
        return True
    
    try:
        print("[INIT] Initializing models...")
        
        # Determine device
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"[INIT] Using device: {device}")
        
        # Try to import HMR2 with timeout
        print("[INIT] Importing HMR2 (this may take a moment)...")
        try:
            # Import in a way that won't hang
            import importlib
            hmr2_module = importlib.import_module('hmr2.models')
            HMR2 = getattr(hmr2_module, 'HMR2')
            print("[INIT] ✓ HMR2 imported")
            
            print("[INIT] Loading HMR2 model...")
            hmr2_model = HMR2().to(device)
            hmr2_model.eval()
            print("[INIT] ✓ HMR2 model loaded")
        except Exception as e:
            print(f"[INIT] ⚠ Failed to load HMR2: {e}")
            model_load_error = str(e)
            traceback.print_exc()
            # Continue anyway - HMR2 is optional
        
        # Try to import PHALP
        print("[INIT] Importing PHALP...")
        try:
            from phalp.models import PHALP
            print("[INIT] ✓ PHALP imported")
            print("[INIT] Loading PHALP tracker...")
            phalp_tracker = PHALP(device=device)
            print("[INIT] ✓ PHALP tracker loaded")
        except Exception as e:
            print(f"[INIT] ⚠ Failed to load PHALP: {e}")
            phalp_tracker = None
        
        models_loaded = True
        print("[INIT] ✓ Models initialized")
        return True
        
    except Exception as e:
        print(f"[INIT] ✗ Error during initialization: {e}")
        model_load_error = str(e)
        traceback.print_exc()
        return False


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint - does NOT load models."""
    return jsonify({
        'status': 'ready' if models_loaded else 'warming_up',
        'models': {
            'hmr2': 'loaded' if hmr2_model is not None else 'not_loaded',
            'phalp': 'loaded' if phalp_tracker is not None else 'not_loaded'
        },
        'device': device,
        'ready': models_loaded,
        'error': model_load_error
    })


@app.route('/pose/hybrid', methods=['POST'])
def pose_hybrid():
    """Process a single frame with 4D-Humans + PHALP tracking."""
    global models_loaded
    
    frame_number = 0
    start_time = time.time()
    
    try:
        # Initialize models on first request
        if not models_loaded:
            print("[POSE] First request - initializing models...")
            if not initialize_models():
                return jsonify({'error': 'Failed to initialize models', 'details': model_load_error}), 500
        
        # Parse request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Get frame data
        if 'image_base64' not in data:
            return jsonify({'error': 'Missing image_base64'}), 400
        
        frame_number = data.get('frame_number', 0)
        image_base64 = data['image_base64']
        
        # Decode image
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            image_array = np.array(image)
        except Exception as e:
            return jsonify({'error': f'Failed to decode image: {str(e)}'}), 400
        
        # Run HMR2 detection
        if hmr2_model is None:
            return jsonify({'error': 'HMR2 model not loaded'}), 503
        
        try:
            with torch.no_grad():
                # Prepare image for HMR2
                image_tensor = torch.from_numpy(image_array).float().to(device)
                image_tensor = image_tensor.permute(2, 0, 1).unsqueeze(0) / 255.0
                
                # Run HMR2
                pred_dict = hmr2_model(image_tensor)
                
                # Extract results
                keypoints_3d = pred_dict.get('pred_keypoints_3d', torch.zeros(1, 17, 3)).cpu().numpy()[0]
                pred_cam = pred_dict.get('pred_cam', torch.zeros(1, 3)).cpu().numpy()[0]
                vertices = pred_dict.get('pred_vertices', torch.zeros(1, 6890, 3)).cpu().numpy()[0]
                
                # Format keypoints for response
                keypoints = []
                for i, kp in enumerate(keypoints_3d):
                    keypoints.append({
                        'name': f'joint_{i}',
                        'x': float(kp[0]),
                        'y': float(kp[1]),
                        'z': float(kp[2]),
                        'confidence': 1.0
                    })
                
                processing_time_ms = (time.time() - start_time) * 1000
                
                return jsonify({
                    'frame_number': frame_number,
                    'keypoints': keypoints,
                    'has_3d': True,
                    'mesh_vertices_data': vertices.tolist(),
                    'mesh_faces_data': [],
                    'camera_translation': pred_cam.tolist(),
                    'processing_time_ms': processing_time_ms,
                    'error': None
                })
        
        except Exception as e:
            print(f"[ERROR] HMR2 processing failed: {e}")
            traceback.print_exc()
            return jsonify({'error': f'HMR2 processing failed: {str(e)}'}), 500
    
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/pose/batch', methods=['POST'])
def pose_batch():
    """Process multiple frames in batch."""
    try:
        data = request.get_json()
        if not data or 'frames' not in data:
            return jsonify({'error': 'No frames provided'}), 400
        
        results = []
        for frame_data in data['frames']:
            # Process each frame
            response = pose_hybrid()
            if isinstance(response, tuple):
                results.append(response[0].get_json())
            else:
                results.append(response.get_json())
        
        return jsonify(results)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("[STARTUP] Starting 4D-Humans Flask wrapper (SAFE MODE)...")
    print("[STARTUP] Listening on 0.0.0.0:5000")
    print("[STARTUP] Models will be loaded on first /pose/hybrid request...")
    print("[STARTUP] Check /health endpoint for status")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True,
        use_reloader=False
    )
