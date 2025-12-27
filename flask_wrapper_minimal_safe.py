#!/usr/bin/env python3
"""Flask HTTP wrapper for 4D-Humans with PHALP temporal tracking."""

import sys
import json
import base64
import io
import time
import traceback
import os
from pathlib import Path

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# CRITICAL: Patch torch.load BEFORE any other imports for PyTorch 2.6+ compatibility
import torch
import typing
from omegaconf import DictConfig, ListConfig
from omegaconf.base import ContainerMetadata

# Add safe globals for torch.load - include dict which is needed by HMR2 checkpoints
torch.serialization.add_safe_globals([DictConfig, ListConfig, ContainerMetadata, typing.Any, dict])
print("[PATCH] torch.serialization patched to allow OmegaConf classes, typing.Any, and dict")

# Patch torch.load to use weights_only=False for PyTorch 2.6+
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load
print("[PATCH] torch.load patched to use weights_only=False")

# CRITICAL: Add paths BEFORE any imports
# The Flask wrapper runs from /home/ben/pose-service/ where hmr2_loader.py is located
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Add 4D-Humans to path
hmr2_path = os.path.join(current_dir, '4D-Humans')
if hmr2_path not in sys.path:
    sys.path.insert(0, hmr2_path)

# Add PHALP to path
phalp_path = os.path.join(current_dir, 'PHALP')
if phalp_path not in sys.path:
    sys.path.insert(0, phalp_path)

from flask import Flask, request, jsonify

# Initialize Flask app
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Global state
models_loaded = False
hmr2_model = None
hmr2_cfg = None
phalp_tracker = None
device = None
model_load_error = None

# Import HMR2 modules using the working loader
print("[STARTUP] Importing HMR2 loader...")
print(f"[STARTUP] Current directory: {current_dir}")
print(f"[STARTUP] sys.path[0]: {sys.path[0]}")
print(f"[STARTUP] About to import hmr2_loader...")
try:
    from hmr2_loader import get_hmr2_modules
    print("[STARTUP] ✓ hmr2_loader imported")
    print("[STARTUP] HMR2 modules will be loaded lazily on first request")
    HMR2_MODULES = None  # Will be loaded lazily
except Exception as e:
    print(f"[STARTUP] ✗ Failed to import hmr2_loader: {e}")
    HMR2_MODULES = None
    traceback.print_exc()


def initialize_models():
    """Load models - called at startup."""
    global models_loaded, hmr2_model, hmr2_cfg, phalp_tracker, device, model_load_error, HMR2_MODULES
    
    if models_loaded:
        return True
    
    try:
        print("[INIT] Initializing models...")
        
        # Import torch here (not at module level)
        print("[INIT] Importing torch...")
        import torch
        print("[INIT] ✓ Torch imported")
        
        # Determine device
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"[INIT] Using device: {device}")
        
        # Load HMR2 using the exact working pattern
        if HMR2_MODULES is None:
            print("[INIT] Loading HMR2 modules lazily...")
            try:
                HMR2_MODULES = get_hmr2_modules()
                print("[INIT] ✓ HMR2 modules loaded")
            except Exception as e:
                print(f"[INIT] ✗ Failed to load HMR2 modules: {e}")
                HMR2_MODULES = None
                traceback.print_exc()
        
        if HMR2_MODULES:
            print("[INIT] Loading HMR2...")
            try:
                download_models = HMR2_MODULES['download_models']
                load_hmr2 = HMR2_MODULES['load_hmr2']
                cache_dir = HMR2_MODULES['CACHE_DIR_4DHUMANS']
                default_checkpoint = HMR2_MODULES['DEFAULT_CHECKPOINT']
                
                print("[INIT] Downloading HMR2 data...")
                download_models(cache_dir)
                print("[INIT] ✓ HMR2 data ready")
                
                print("[INIT] Loading HMR2 checkpoint...")
                hmr2_model, hmr2_cfg = load_hmr2(default_checkpoint)
                hmr2_model = hmr2_model.to(device)
                hmr2_model.eval()
                print("[INIT] ✓ HMR2 model loaded")
                
            except Exception as e:
                print(f"[INIT] ⚠ Failed to load HMR2: {e}")
                model_load_error = str(e)
                traceback.print_exc()
        else:
            print("[INIT] ⚠ HMR2 modules not available")
        
        # Load PHALP temporal tracker - exactly as in track.py
        print("[INIT] Loading PHALP temporal tracker...")
        try:
            # Patch PHALP's convert_pkl to use the male model we have
            print("[INIT] Patching PHALP utils to use male model...")
            try:
                from phalp.utils import utils
                
                original_convert_pkl = utils.convert_pkl
                
                def patched_convert_pkl(old_pkl):
                    """Use male model instead of trying to download neutral"""
                    print(f"[PATCH] convert_pkl called for: {old_pkl}")
                    
                    # Try to find the male model file
                    male_model_paths = [
                        'basicmodel_m_lbs_10_207_0_v1.1.0.pkl',
                        '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',
                        '/mnt/c/Users/benja/repos/SnowboardingExplained/backend/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',
                    ]
                    
                    for path in male_model_paths:
                        if os.path.exists(path):
                            print(f"[PATCH] Found male model at: {path}")
                            return original_convert_pkl(path)
                    
                    print(f"[PATCH] Male model not found, trying original function")
                    return original_convert_pkl(old_pkl)
                
                utils.convert_pkl = patched_convert_pkl
                print("[INIT] ✓ PHALP utils patched")
            except Exception as patch_err:
                print(f"[INIT] ⚠ Could not patch PHALP utils: {patch_err}")
            
            from phalp.trackers.PHALP import PHALP
            from phalp.configs.base import FullConfig
            from omegaconf import OmegaConf
            
            print("[INIT] ✓ PHALP imported")
            
            # Create config exactly as track.py does
            print("[INIT] Creating PHALP config...")
            cfg = OmegaConf.structured(FullConfig)
            
            # Initialize PHALP with config - exactly as track.py does
            print("[INIT] Initializing PHALP tracker...")
            phalp_tracker = PHALP(cfg)
            print("[INIT] ✓ PHALP tracker loaded")
        except Exception as e:
            print(f"[INIT] ⚠ Failed to load PHALP: {e}")
            phalp_tracker = None
            traceback.print_exc()
        
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
    """Health check endpoint."""
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
    
    try:
        # Initialize models on first request if not already done
        if not models_loaded:
            print("[POSE] First request - initializing models...")
            if not initialize_models():
                return jsonify({'error': 'Failed to initialize models', 'details': model_load_error}), 500
        
        # Parse request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        if 'image_base64' not in data:
            return jsonify({'error': 'Missing image_base64'}), 400
        
        frame_number = data.get('frame_number', 0)
        image_base64 = data['image_base64']
        
        # Decode image
        try:
            import numpy as np
            from PIL import Image
            
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            image_array = np.array(image)
        except Exception as e:
            return jsonify({'error': f'Failed to decode image: {str(e)}'}), 400
        
        # Run HMR2 detection
        if hmr2_model is None:
            return jsonify({'error': 'HMR2 model not loaded'}), 503
        
        try:
            import torch
            import numpy as np
            
            start_time = time.time()
            
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
                
                # Format keypoints
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
                    'phalp_available': phalp_tracker is not None,
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


if __name__ == '__main__':
    print("[STARTUP] Starting Flask wrapper...")
    print("[STARTUP] Listening on 0.0.0.0:5000")
    print("[STARTUP] Loading models at startup...")
    
    # Initialize models before starting the server
    initialize_models()
    
    print("[STARTUP] Starting HTTP server...")
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True,
        use_reloader=False
    )

