#!/usr/bin/env python3
"""Flask HTTP wrapper for 4D-Humans with PHALP temporal tracking.

VERSION: 2024-12-27-v2 - Added ViTDet person detection for proper HMR2 inference.

Key fix: HMR2 requires a cropped person bounding box, not the full image.
Without ViTDet detection, HMR2 returns default/mean pose (bent at waist).
"""

print("=" * 60)
print("[KIRO-DEBUG] FILE LOADED - VERSION 2024-12-27-v2 (ViTDet)")
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
vitdet_detector = None  # ViTDet person detector
vitdet_loaded = False

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


def load_vitdet():
    """
    Load ViTDet detector for person detection - EXACTLY as in 4D-Humans demo.py
    
    Reference: https://github.com/shubham-goel/4D-Humans/blob/main/demo.py
    """
    global vitdet_detector, vitdet_loaded
    
    if vitdet_loaded:
        return vitdet_detector
    
    try:
        print("[ViTDet] Loading ViTDet detector (exactly as 4D-Humans demo.py)...")
        start = time.time()
        
        # Import exactly as demo.py does
        print("[ViTDet] Step 1: Importing detectron2 and hmr2...")
        from detectron2.config import LazyConfig
        import hmr2
        from hmr2.utils.utils_detectron2 import DefaultPredictor_Lazy
        print("[ViTDet] ✓ Imports successful")
        
        # Load config exactly as demo.py
        print("[ViTDet] Step 2: Loading ViTDet config...")
        cfg_path = Path(hmr2.__file__).parent / 'configs' / 'cascade_mask_rcnn_vitdet_h_75ep.py'
        print(f"[ViTDet] Config path: {cfg_path}")
        
        if not cfg_path.exists():
            raise FileNotFoundError(f"Config file not found: {cfg_path}")
        
        detectron2_cfg = LazyConfig.load(str(cfg_path))
        print("[ViTDet] ✓ Config loaded")
        
        # Set checkpoint and thresholds exactly as demo.py
        print("[ViTDet] Step 3: Configuring checkpoint and thresholds...")
        detectron2_cfg.train.init_checkpoint = "https://dl.fbaipublicfiles.com/detectron2/ViTDet/COCO/cascade_mask_rcnn_vitdet_h/f328730692/model_final_f05665.pkl"
        
        # Set score threshold for all 3 cascade stages - exactly as demo.py
        for i in range(3):
            detectron2_cfg.model.roi_heads.box_predictors[i].test_score_thresh = 0.25
        print("[ViTDet] ✓ Thresholds configured")
        
        # Create predictor - exactly as demo.py
        print("[ViTDet] Step 4: Creating DefaultPredictor_Lazy (downloads ~2.7GB on first run)...")
        vitdet_detector = DefaultPredictor_Lazy(detectron2_cfg)
        print("[ViTDet] ✓ Predictor created")
        
        vitdet_loaded = True
        elapsed = time.time() - start
        print(f"[ViTDet] ✓ ViTDet fully loaded in {elapsed:.1f}s")
        return vitdet_detector
        
    except Exception as e:
        print(f"[ViTDet] ✗ Failed to load: {e}")
        traceback.print_exc()
        vitdet_loaded = True  # Mark as attempted to prevent retry loops
        vitdet_detector = None
        return None


def initialize_models():
    """Load models - called at startup."""
    global models_loaded, hmr2_model, hmr2_cfg, phalp_tracker, device, model_load_error, HMR2_MODULES, smpl_faces, vitdet_detector, vitdet_loaded
    
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
        
        # Load ViTDet for person detection - CRITICAL for proper HMR2 inference
        print("[INIT] Loading ViTDet person detector...")
        try:
            vitdet_detector = load_vitdet()
            if vitdet_detector is not None:
                print("[INIT] ✓ ViTDet loaded successfully")
            else:
                print("[INIT] ⚠ ViTDet not available - will use full image fallback")
        except Exception as e:
            print(f"[INIT] ⚠ Failed to load ViTDet: {e}")
            traceback.print_exc()
        
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
            'vitdet': 'loaded' if vitdet_detector is not None else 'not_loaded',
            'phalp': 'loaded' if phalp_tracker is not None else 'not_loaded'
        },
        'device': device,
        'ready': models_loaded,
        'vitdet_available': vitdet_detector is not None,
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
            import cv2
            
            image_data = base64.b64decode(image_base64)
            print(f"[🔴 POSE] 📥 Frame {frame_number}: Decoded to {len(image_data)} bytes")
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            image_rgb = np.array(image)
            # Convert to BGR for ViTDet (exactly as demo.py uses cv2.imread which returns BGR)
            image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
            print(f"[🔴 POSE] 📥 Frame {frame_number}: Image shape {image_bgr.shape} (BGR)")
        except Exception as e:
            print(f"[🔴 POSE] ❌ Frame {frame_number}: Failed to decode image: {str(e)}")
            return jsonify({'error': f'Failed to decode image: {str(e)}'}), 400
        
        # Run HMR2 detection - EXACTLY as 4D-Humans demo.py
        if hmr2_model is None:
            print(f"[🔴 POSE] ❌ Frame {frame_number}: HMR2 model not loaded")
            return jsonify({'error': 'HMR2 model not loaded'}), 503
        
        try:
            import torch
            import numpy as np
            
            # Import exactly as demo.py
            from hmr2.datasets.vitdet_dataset import ViTDetDataset
            from hmr2.utils.renderer import cam_crop_to_full
            recursive_to = HMR2_MODULES['recursive_to']
            
            print(f"[🔴 POSE] 🔄 Frame {frame_number}: Starting HMR2 processing (demo.py style)...")
            start_time = time.time()
            
            h, w = image_bgr.shape[:2]
            print(f"[🔴 POSE] 📐 Frame {frame_number}: Image size {w}x{h}")
            
            # Step 1: Detect humans in image - EXACTLY as demo.py
            # demo.py: det_out = detector(img_cv2)
            boxes = None
            if vitdet_detector is not None:
                print(f"[🔴 POSE] 🔍 Frame {frame_number}: Running ViTDet detection (exactly as demo.py)...")
                try:
                    # Pass BGR image exactly as demo.py does with cv2.imread
                    det_out = vitdet_detector(image_bgr)
                    det_instances = det_out['instances']
                    
                    # Filter exactly as demo.py:
                    # valid_idx = (det_instances.pred_classes==0) & (det_instances.scores > 0.5)
                    valid_idx = (det_instances.pred_classes == 0) & (det_instances.scores > 0.5)
                    boxes = det_instances.pred_boxes.tensor[valid_idx].cpu().numpy()
                    
                    print(f"[🔴 POSE] ✅ Frame {frame_number}: ViTDet found {len(boxes)} persons")
                    if len(boxes) > 0:
                        print(f"[🔴 POSE] 📦 Frame {frame_number}: First box: {boxes[0]}")
                    else:
                        print(f"[🔴 POSE] ⚠️ Frame {frame_number}: No persons detected, using full image")
                        boxes = np.array([[0, 0, w, h]], dtype=np.float32)
                except Exception as e:
                    print(f"[🔴 POSE] ⚠️ Frame {frame_number}: ViTDet failed: {e}")
                    traceback.print_exc()
                    boxes = np.array([[0, 0, w, h]], dtype=np.float32)
            else:
                print(f"[🔴 POSE] ⚠️ Frame {frame_number}: ViTDet not available, using full image")
                boxes = np.array([[0, 0, w, h]], dtype=np.float32)
            
            # Step 2: Run HMR2.0 on all detected humans - EXACTLY as demo.py
            # demo.py: dataset = ViTDetDataset(model_cfg, img_cv2, boxes)
            print(f"[🔴 POSE] 🔄 Frame {frame_number}: Creating ViTDetDataset with {len(boxes)} boxes...")
            dataset = ViTDetDataset(hmr2_cfg, image_bgr, boxes)
            dataloader = torch.utils.data.DataLoader(dataset, batch_size=1, shuffle=False, num_workers=0)
            
            # Step 3: Run model - EXACTLY as demo.py
            print(f"[🔴 POSE] 🔄 Frame {frame_number}: Running HMR2 inference...")
            
            for batch in dataloader:
                batch = recursive_to(batch, device)
                with torch.no_grad():
                    out = hmr2_model(batch)
                
                # Step 4: Extract camera params - EXACTLY as demo.py
                pred_cam = out['pred_cam']
                box_center = batch["box_center"].float()
                box_size = batch["box_size"].float()
                img_size = batch["img_size"].float()
                
                # Compute scaled focal length - EXACTLY as demo.py
                scaled_focal_length = hmr2_cfg.EXTRA.FOCAL_LENGTH / hmr2_cfg.MODEL.IMAGE_SIZE * img_size.max()
                
                # Convert camera to full image space - EXACTLY as demo.py
                pred_cam_t_full = cam_crop_to_full(
                    pred_cam, box_center, box_size, img_size, scaled_focal_length
                ).detach().cpu().numpy()
                
                print(f"[🔴 POSE] ===== CAMERA CONVERSION (exactly as demo.py) =====")
                print(f"[🔴 POSE]   pred_cam (crop space): {pred_cam[0].cpu().numpy()}")
                print(f"[🔴 POSE]   box_center: {box_center[0].cpu().numpy()}")
                print(f"[🔴 POSE]   box_size: {box_size[0].cpu().numpy():.1f}")
                print(f"[🔴 POSE]   img_size: {img_size[0].cpu().numpy()}")
                print(f"[🔴 POSE]   scaled_focal_length: {scaled_focal_length.cpu().numpy():.1f}")
                print(f"[🔴 POSE]   pred_cam_t_full: {pred_cam_t_full[0]}")
                
                # Extract outputs - exactly as demo.py
                vertices = out['pred_vertices'][0].cpu().numpy()
                cam_t = pred_cam_t_full[0]  # Full image camera translation
                
                # Get 3D keypoints if available
                keypoints_3d = out.get('pred_keypoints_3d', torch.zeros(1, 24, 3))[0].cpu().numpy()
                
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Extracted vertices shape {vertices.shape}")
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Extracted keypoints shape {keypoints_3d.shape}")
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Camera translation (full): {cam_t}")
                
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
                
                # Format faces
                faces_list = []
                if smpl_faces is not None:
                    if hasattr(smpl_faces, 'tolist'):
                        faces_list = smpl_faces.tolist()
                    else:
                        faces_list = list(smpl_faces)
                    print(f"[🔴 POSE] ✅ Frame {frame_number}: Formatted {len(faces_list)} faces")
                
                processing_time_ms = (time.time() - start_time) * 1000
                
                # Build response with full camera info for proper 3D rendering
                response_data = {
                    'frame_number': frame_number,
                    'keypoints': keypoints,
                    'has_3d': True,
                    'mesh_vertices_data': vertices.tolist(),
                    'mesh_faces_data': faces_list,
                    # Full image camera translation [tx, ty, tz] - exactly as demo.py uses
                    'camera_translation': cam_t.tolist(),
                    # Camera params for weak perspective (crop space)
                    'camera_params': {
                        'scale': float(pred_cam[0, 0].cpu().numpy()),
                        'tx': float(pred_cam[0, 1].cpu().numpy()),
                        'ty': float(pred_cam[0, 2].cpu().numpy()),
                        'type': 'weak_perspective'
                    },
                    # Full camera info for proper rendering
                    'camera_full': {
                        'tx': float(cam_t[0]),
                        'ty': float(cam_t[1]),
                        'tz': float(cam_t[2]),
                        'focal_length': float(scaled_focal_length.cpu().numpy()),
                        'img_width': int(img_size[0, 0].cpu().numpy()),
                        'img_height': int(img_size[0, 1].cpu().numpy()),
                        'type': 'perspective'
                    },
                    # Detection info
                    'detection': {
                        'box_center': box_center[0].cpu().numpy().tolist(),
                        'box_size': float(box_size[0].cpu().numpy()),
                        'vitdet_used': vitdet_detector is not None,
                        'num_persons_detected': len(boxes)
                    },
                    'phalp_available': phalp_tracker is not None,
                    'processing_time_ms': processing_time_ms,
                    'error': None
                }
                
                print(f"[🔴 POSE] ✅ Frame {frame_number}: Response ready - {len(keypoints)} keypoints, {len(vertices)} vertices")
                print(f"[🔴 POSE] 📤 Frame {frame_number}: Sending response (took {processing_time_ms:.1f}ms)")
                
                return jsonify(response_data)
            
            # If we get here, no batch was processed
            return jsonify({'error': 'No data processed', 'frame_number': frame_number}), 500
        
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

