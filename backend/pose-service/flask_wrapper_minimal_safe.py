#!/usr/bin/env python3
"""Flask HTTP wrapper for 4D-Humans with PHALP temporal tracking."""

print("=" * 60)
print("[KIRO-DEBUG] FILE LOADED - VERSION 2024-12-27-15:20")
print("=" * 60)

import sys
import json
import base64
import io
import time
import traceback
import os
from pathlib import Path
import numpy as np

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
smpl_faces = None  # SMPL face indices (triangles)

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
    global models_loaded, hmr2_model, hmr2_cfg, phalp_tracker, device, model_load_error, HMR2_MODULES, smpl_faces
    
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
        
        print("[INIT] About to load SMPL faces...", flush=True)
        import sys
        sys.stderr.write("[INIT] About to load SMPL faces (stderr)...\n")
        sys.stderr.flush()
        sys.stdout.flush()
        
        # Load SMPL face indices from pickle file
        print("[INIT] Loading SMPL face indices from pickle...", flush=True)
        sys.stdout.flush()
        try:
            import pickle
            # Try multiple possible filenames
            possible_paths = [
                '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0_p3.pkl',
                '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',
            ]
            
            male_model_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    male_model_path = path
                    print(f"[INIT] Found male model at {path}", flush=True)
                    sys.stdout.flush()
                    break
            
            if male_model_path:
                with open(male_model_path, 'rb') as f:
                    smpl_data = pickle.load(f, encoding='latin1')
                if 'f' in smpl_data:
                    smpl_faces = smpl_data['f']
                    print(f"[INIT] ✓ SMPL faces loaded from pickle: shape {smpl_faces.shape}", flush=True)
                    sys.stdout.flush()
                else:
                    print(f"[INIT] ⚠ 'f' key not found in SMPL pickle, keys: {list(smpl_data.keys())}", flush=True)
                    sys.stdout.flush()
                    smpl_faces = None
            else:
                print(f"[INIT] ⚠ Male SMPL model not found in any of: {possible_paths}", flush=True)
                sys.stdout.flush()
                smpl_faces = None
        except Exception as e:
            print(f"[INIT] ⚠ Error loading SMPL faces: {e}", flush=True)
            sys.stdout.flush()
            traceback.print_exc()
            smpl_faces = None
        
        models_loaded = True
        print("[INIT] ✓ Models initialized", flush=True)
        import sys
        sys.stdout.flush()
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


@app.route('/debug/faces', methods=['GET'])
def debug_faces():
    """Debug endpoint to check SMPL faces status."""
    global smpl_faces
    
    try:
        if smpl_faces is None:
            return jsonify({
                'status': 'not_loaded',
                'message': 'SMPL faces not loaded yet',
                'hmr2_available': hmr2_model is not None,
                'phalp_available': phalp_tracker is not None
            })
        
        # Get faces info
        faces_type = str(type(smpl_faces))
        faces_shape = str(getattr(smpl_faces, 'shape', 'N/A'))
        
        # Try to convert to list
        try:
            if hasattr(smpl_faces, 'tolist'):
                faces_list = smpl_faces.tolist()
            else:
                faces_list = list(smpl_faces)
            
            # Try to serialize to JSON
            import json
            json_test = json.dumps(faces_list[:10])  # Test with first 10 faces
            
            return jsonify({
                'status': 'loaded',
                'type': faces_type,
                'shape': faces_shape,
                'total_faces': len(faces_list),
                'first_face': faces_list[0] if len(faces_list) > 0 else None,
                'json_serializable': True,
                'sample_json_size': len(json_test)
            })
        except Exception as e:
            return jsonify({
                'status': 'loaded_but_error',
                'type': faces_type,
                'shape': faces_shape,
                'error': str(e)
            })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/pose/hybrid', methods=['POST'])
def pose_hybrid():
    """Process a single frame with 4D-Humans + PHALP tracking."""
    global models_loaded, smpl_faces
    
    try:
        # Initialize models on first request if not already done
        if not models_loaded:
            print("[🔴 POSE] First request - initializing models...")
            if not initialize_models():
                print("[🔴 POSE] ❌ Failed to initialize models")
                return jsonify({'error': 'Failed to initialize models', 'details': model_load_error}), 500
        
        # Load SMPL faces on first pose request if not already loaded
        if smpl_faces is None:
            print("[🔴 POSE] Loading SMPL faces from HMR2 model...")
            try:
                if hmr2_model is not None and hasattr(hmr2_model, 'smpl'):
                    smpl_faces = hmr2_model.smpl.faces
                    print(f"[🔴 POSE] ✓ SMPL faces loaded from HMR2: shape {smpl_faces.shape}, type {type(smpl_faces)}")
                else:
                    print("[🔴 POSE] ⚠ Could not extract faces from HMR2, trying pickle file...")
                    import pickle
                    # Try multiple possible filenames
                    possible_paths = [
                        '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0_p3.pkl',
                        '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',
                    ]
                    
                    for pkl_path in possible_paths:
                        if os.path.exists(pkl_path):
                            print(f"[🔴 POSE] Found pickle at {pkl_path}")
                            try:
                                with open(pkl_path, 'rb') as f:
                                    smpl_data = pickle.load(f, encoding='latin1')
                                if 'f' in smpl_data:
                                    smpl_faces = smpl_data['f']
                                    print(f"[🔴 POSE] ✓ SMPL faces loaded from pickle: shape {smpl_faces.shape}, type {type(smpl_faces)}")
                                    break
                            except Exception as e:
                                print(f"[🔴 POSE] ✗ Failed to load from {pkl_path}: {e}")
                                continue
            except Exception as e:
                print(f"[🔴 POSE] ⚠ Failed to load SMPL faces: {e}")
                traceback.print_exc()
                smpl_faces = None
        
        # Parse request
        data = request.get_json()
        if not data:
            print("[🔴 POSE] ❌ No JSON data provided")
            return jsonify({'error': 'No JSON data provided'}), 400
        
        if 'image_base64' not in data:
            print("[🔴 POSE] ❌ Missing image_base64 in request")
            return jsonify({'error': 'Missing image_base64'}), 400
        
        frame_number = data.get('frame_number', 0)
        image_base64 = data['image_base64']
        print(f"[🔴 POSE] 📥 Frame {frame_number}: Received {len(image_base64)} bytes of base64 image data")
        
        # Decode image
        try:
            import numpy as np
            from PIL import Image
            
            image_data = base64.b64decode(image_base64)
            print(f"[🔴 POSE] 📥 Frame {frame_number}: Decoded to {len(image_data)} bytes")
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            image_array = np.array(image)
            print(f"[🔴 POSE] 📥 Frame {frame_number}: Image shape {image_array.shape}")
        except Exception as e:
            print(f"[🔴 POSE] ❌ Frame {frame_number}: Failed to decode image: {str(e)}")
            return jsonify({'error': f'Failed to decode image: {str(e)}'}), 400
        
        # Run HMR2 detection
        if hmr2_model is None:
            print(f"[🔴 POSE] ❌ Frame {frame_number}: HMR2 model not loaded")
            return jsonify({'error': 'HMR2 model not loaded'}), 503
        
        try:
            import torch
            import numpy as np
            from torchvision.transforms import Normalize
            from PIL import Image
            
            print(f"[🔴 POSE] 🔄 Frame {frame_number}: Starting HMR2 processing...")
            start_time = time.time()
            
            with torch.no_grad():
                # Resize image to HMR2 expected input size (256x256)
                print(f"[🔴 POSE] 🔄 Frame {frame_number}: Resizing image to 256x256...")
                pil_image = Image.fromarray(image_array)
                pil_image = pil_image.resize((256, 256), Image.BILINEAR)
                image_array_resized = np.array(pil_image)
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Resized to {image_array_resized.shape}")
                
                # Prepare image for HMR2 - must match training preprocessing
                image_tensor = torch.from_numpy(image_array_resized).float().to(device)
                image_tensor = image_tensor.permute(2, 0, 1).unsqueeze(0) / 255.0
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Tensor shape {image_tensor.shape}")
                
                # Normalize using ImageNet stats (required by HMR2)
                normalize = Normalize(mean=[0.485, 0.456, 0.406], 
                                    std=[0.229, 0.224, 0.225])
                image_tensor = normalize(image_tensor)
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Normalized tensor")
                
                # Create batch dict as HMR2 expects
                batch = {
                    'img': image_tensor,
                    'img_metas': [{
                        'ori_shape': image_array.shape,
                        'img_shape': image_tensor.shape,
                        'scale_factor': 1.0,
                        'flip': False,
                    }]
                }
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Created batch dict")
                
                # Run HMR2
                print(f"[🔴 POSE] 🔄 Frame {frame_number}: Running HMR2 forward pass...")
                pred_dict = hmr2_model(batch)
                print(f"[🔴 POSE] ✅ Frame {frame_number}: HMR2 forward pass complete")
                print(f"[🔴 POSE] 🔍 Frame {frame_number}: HMR2 output keys: {list(pred_dict.keys())}")
                
                # Extract results
                keypoints_3d = pred_dict.get('pred_keypoints_3d', torch.zeros(1, 17, 3)).cpu().numpy()[0]
                pred_cam = pred_dict.get('pred_cam', torch.zeros(1, 3)).cpu().numpy()[0]
                vertices = pred_dict.get('pred_vertices', torch.zeros(1, 6890, 3)).cpu().numpy()[0]
                
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Extracted keypoints shape {keypoints_3d.shape}")
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Extracted vertices shape {vertices.shape}")
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Camera translation {pred_cam}")
                
                # CRITICAL: Apply camera translation to vertices
                # HMR2 outputs vertices in SMPL model space, pred_cam positions them in world space
                # pred_cam format: [tx, ty, tz] - translation in world coordinates
                print(f"[🔴 POSE] 🔄 Frame {frame_number}: Applying camera translation to vertices...")
                vertices_translated = vertices + pred_cam[np.newaxis, :]  # Broadcast translation to all vertices
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Vertices translated")
                print(f"[🔴 POSE]   Original vertex range: X=[{vertices[:, 0].min():.3f}, {vertices[:, 0].max():.3f}], Y=[{vertices[:, 1].min():.3f}, {vertices[:, 1].max():.3f}], Z=[{vertices[:, 2].min():.3f}, {vertices[:, 2].max():.3f}]")
                print(f"[🔴 POSE]   Translated vertex range: X=[{vertices_translated[:, 0].min():.3f}, {vertices_translated[:, 0].max():.3f}], Y=[{vertices_translated[:, 1].min():.3f}, {vertices_translated[:, 1].max():.3f}], Z=[{vertices_translated[:, 2].min():.3f}, {vertices_translated[:, 2].max():.3f}]")
                
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
                
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Formatted {len(keypoints)} keypoints")
                
                # Format faces for Three.js
                faces_list = []
                if smpl_faces is not None:
                    print(f"[🔴 POSE] 🔄 Frame {frame_number}: Formatting SMPL faces...")
                    print(f"[🔴 POSE] 🔍 Frame {frame_number}: smpl_faces type: {type(smpl_faces)}, shape: {getattr(smpl_faces, 'shape', 'N/A')}")
                    
                    # SMPL faces are Nx3 array of vertex indices
                    # Convert to nested list format [[v0, v1, v2], [v3, v4, v5], ...]
                    if hasattr(smpl_faces, 'tolist'):
                        faces_list = smpl_faces.tolist()
                        print(f"[🔴 POSE] ✅ Frame {frame_number}: Converted numpy array to list")
                    else:
                        faces_list = smpl_faces.tolist() if isinstance(smpl_faces, list) else list(smpl_faces)
                        print(f"[🔴 POSE] ✅ Frame {frame_number}: Converted to list")
                    
                    print(f"[🔴 POSE] ✅ Frame {frame_number}: Formatted faces - {len(faces_list)} faces")
                    if len(faces_list) > 0:
                        print(f"[🔴 POSE] 🔍 Frame {frame_number}: First face: {faces_list[0]}, type: {type(faces_list[0])}")
                        print(f"[🔴 POSE] 🔍 Frame {frame_number}: Last face: {faces_list[-1]}")
                else:
                    print(f"[🔴 POSE] ⚠️  Frame {frame_number}: SMPL faces not loaded, sending empty faces")
                
                processing_time_ms = (time.time() - start_time) * 1000
                
                response_data = {
                    'frame_number': frame_number,
                    'keypoints': keypoints,
                    'has_3d': True,
                    'mesh_vertices_data': vertices_translated.tolist(),
                    'mesh_faces_data': faces_list,
                    'camera_translation': pred_cam.tolist(),
                    'phalp_available': phalp_tracker is not None,
                    'processing_time_ms': processing_time_ms,
                    'error': None
                }
                
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Response ready - {len(keypoints)} keypoints, {len(vertices)} vertices")
                print(f"[🔴 POSE] 📤 Frame {frame_number}: Sending response (took {processing_time_ms:.1f}ms)")
                
                return jsonify(response_data)
        
        except Exception as e:
            print(f"[🔴 POSE] ❌ Frame {frame_number}: HMR2 processing failed: {e}")
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

