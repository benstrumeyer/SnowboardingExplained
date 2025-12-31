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

# Requirement 8: Comprehensive logging
import logging
from datetime import datetime

# Setup logging
log_dir = os.environ.get('POSE_LOG_DIR', '/tmp/pose-service-logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, f'pose-service-{datetime.now().strftime("%Y%m%d-%H%M%S")}.log')
logging.basicConfig(
    level=logging.DEBUG if os.environ.get('DEBUG_MODE', 'false').lower() == 'true' else logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)
logger.info(f"Logging initialized - log file: {log_file}")

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# CRITICAL: Patch torch.load BEFORE any other imports for PyTorch 2.6+ compatibility
import torch
import typing
from omegaconf import DictConfig, ListConfig
from omegaconf.base import ContainerMetadata

# Patch torch.load to use weights_only=False for PyTorch 2.6+
# Note: add_safe_globals doesn't exist in PyTorch 2.0.1, so we just patch torch.load
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

# Task 2.1: GPU Availability Check - Global state for request queuing
import threading
from collections import deque
import uuid

# Requirement 7: Configuration from environment variables
POSE_POOL_SIZE = int(os.environ.get('POSE_POOL_SIZE', '1'))
POSE_TIMEOUT_MS = int(os.environ.get('POSE_TIMEOUT_MS', '180000'))
# Use /app for Docker container, fall back to /home/ben/pose-service for WSL
POSE_SERVICE_PATH = os.environ.get('POSE_SERVICE_PATH', '/app' if os.path.exists('/app') else '/home/ben/pose-service')
DEBUG_MODE = os.environ.get('DEBUG_MODE', 'false').lower() == 'true'

print(f"[CONFIG] POSE_POOL_SIZE: {POSE_POOL_SIZE}")
print(f"[CONFIG] POSE_TIMEOUT_MS: {POSE_TIMEOUT_MS}")
print(f"[CONFIG] POSE_SERVICE_PATH: {POSE_SERVICE_PATH}")
print(f"[CONFIG] DEBUG_MODE: {DEBUG_MODE}")

subprocess_running = False
subprocess_lock = threading.Lock()
request_queue = deque()  # FIFO queue for pending requests
active_jobs = {}  # Track job status: {job_id: {'status': 'queued'|'processing'|'completed', 'result': ...}}

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
            # First ensure joblib is available
            try:
                import joblib
                print("[INIT] ✓ joblib available")
            except ImportError:
                print("[INIT] ⚠ joblib not found, installing...")
                import subprocess
                subprocess.check_call([sys.executable, "-m", "pip", "install", "joblib"])
                import joblib
                print("[INIT] ✓ joblib installed")
            
            # Patch PHALP's convert_pkl to use the male model we have
            print("[INIT] Patching PHALP utils to use male model...")
            try:
                from phalp.utils import utils
                
                original_convert_pkl = utils.convert_pkl
                
                def patched_convert_pkl(old_pkl):
                    """Use male model instead of trying to download neutral"""
                    print(f"[PATCH] convert_pkl called for: {old_pkl}")
                    
                    # Try to find the male model file (fallback to neutral if not available)
                    male_model_paths = [
                        '/app/data/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',  # Docker container path
                        '/app/data/basicModel_neutral_lbs_10_207_0_v1.0.0.pkl',  # Neutral model fallback
                        'basicmodel_m_lbs_10_207_0_v1.1.0.pkl',  # Current directory
                        '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',  # WSL path
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
            # Try multiple possible filenames (male model with neutral fallback)
            possible_paths = [
                '/app/data/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',  # Docker container path
                '/app/data/basicmodel_m_lbs_10_207_0_v1.1.0_p3.pkl',  # Docker container path (alternate)
                '/app/data/basicModel_neutral_lbs_10_207_0_v1.0.0.pkl',  # Neutral model fallback
                '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',  # WSL path
                '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0_p3.pkl',  # WSL path (alternate)
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


def parse_pkl_to_json(pkl_path):
    """Parse PHALP's .pkl output to JSON format.
    
    Extracts frame-by-frame pose data from PHALP's pickle output.
    Returns a dictionary with all frames and their pose data.
    """
    import pickle
    
    print(f"[PARSER] 📂 Loading pickle file: {pkl_path}")
    
    try:
        with open(pkl_path, 'rb') as f:
            phalp_output = pickle.load(f)
        
        print(f"[PARSER] ✅ Pickle loaded successfully")
        print(f"[PARSER] 📊 Type: {type(phalp_output)}")
        
        # PHALP output structure varies, but typically contains:
        # - 'results': list of frame results
        # - 'frame_data': dict with frame numbers as keys
        # - Direct list of frame data
        
        frames_data = []
        
        if isinstance(phalp_output, dict):
            print(f"[PARSER] 📋 Dict keys: {list(phalp_output.keys())[:10]}")
            
            # Try common keys
            if 'results' in phalp_output:
                frames_data = phalp_output['results']
                print(f"[PARSER] ✅ Found 'results' key with {len(frames_data)} frames")
            elif 'frame_data' in phalp_output:
                frames_data = phalp_output['frame_data']
                print(f"[PARSER] ✅ Found 'frame_data' key")
            else:
                # Try to find frame data by looking for numeric keys
                numeric_keys = [k for k in phalp_output.keys() if isinstance(k, int)]
                if numeric_keys:
                    frames_data = [phalp_output[k] for k in sorted(numeric_keys)]
                    print(f"[PARSER] ✅ Found {len(frames_data)} frames with numeric keys")
                else:
                    print(f"[PARSER] ⚠️  Could not find frame data in dict")
                    frames_data = []
        
        elif isinstance(phalp_output, list):
            frames_data = phalp_output
            print(f"[PARSER] ✅ Direct list with {len(frames_data)} frames")
        
        else:
            print(f"[PARSER] ⚠️  Unexpected output type: {type(phalp_output)}")
            frames_data = []
        
        print(f"[PARSER] 📊 Total frames: {len(frames_data)}")
        
        # Convert frames to JSON-serializable format
        json_frames = []
        
        for frame_idx, frame_data in enumerate(frames_data):
            try:
                json_frame = convert_frame_to_json(frame_idx, frame_data)
                json_frames.append(json_frame)
            except Exception as e:
                print(f"[PARSER] ⚠️  Error converting frame {frame_idx}: {e}")
                # Continue with next frame
                continue
        
        print(f"[PARSER] ✅ Converted {len(json_frames)} frames to JSON")
        
        # Build response
        response = {
            'total_frames': len(json_frames),
            'frames': json_frames
        }
        
        return response
    
    except Exception as e:
        print(f"[PARSER] ❌ Error parsing pickle: {e}")
        traceback.print_exc()
        raise


def convert_frame_to_json(frame_idx, frame_data):
    """Convert a single frame from PHALP output to JSON format.
    
    Handles various PHALP output formats and extracts:
    - Frame number and timestamp
    - Person detections with track IDs
    - SMPL parameters
    - 3D and 2D keypoints
    - Camera parameters
    - Bounding boxes
    """
    import numpy as np
    
    # Initialize frame structure
    json_frame = {
        'frame_number': frame_idx,
        'timestamp': float(frame_idx) / 30.0,  # Assume 30 FPS
        'persons': []
    }
    
    # Handle different frame data formats
    if frame_data is None:
        return json_frame
    
    if isinstance(frame_data, dict):
        # Extract frame metadata
        if 'frame_number' in frame_data:
            json_frame['frame_number'] = frame_data['frame_number']
        if 'timestamp' in frame_data:
            json_frame['timestamp'] = float(frame_data['timestamp'])
        
        # Extract person detections
        persons_key = None
        for key in ['persons', 'detections', 'tracks', 'people']:
            if key in frame_data:
                persons_key = key
                break
        
        if persons_key:
            persons_list = frame_data[persons_key]
            if isinstance(persons_list, list):
                for person_data in persons_list:
                    try:
                        json_person = convert_person_to_json(person_data)
                        json_frame['persons'].append(json_person)
                    except Exception as e:
                        print(f"[PARSER] ⚠️  Error converting person: {e}")
                        continue
    
    elif isinstance(frame_data, list):
        # Frame data is a list of persons
        for person_data in frame_data:
            try:
                json_person = convert_person_to_json(person_data)
                json_frame['persons'].append(json_person)
            except Exception as e:
                print(f"[PARSER] ⚠️  Error converting person: {e}")
                continue
    
    return json_frame


def convert_person_to_json(person_data):
    """Convert a single person's pose data to JSON format."""
    import numpy as np
    
    json_person = {
        'track_id': 0,
        'confidence': 1.0,
        'tracking_confidence': 1.0,
        'smpl': {
            'betas': [],
            'body_pose': [],
            'global_orient': []
        },
        'keypoints_3d': [],
        'keypoints_2d': [],
        'camera': {
            'tx': 0.0,
            'ty': 0.0,
            'tz': 5.0
        },
        'bbox': [0, 0, 0, 0],
        'mesh_vertices': []
    }
    
    if person_data is None:
        return json_person
    
    if isinstance(person_data, dict):
        # Extract track ID
        for key in ['track_id', 'id', 'person_id']:
            if key in person_data:
                json_person['track_id'] = int(person_data[key])
                break
        
        # Extract confidence
        for key in ['confidence', 'score', 'detection_confidence']:
            if key in person_data:
                json_person['confidence'] = float(person_data[key])
                break
        
        # Extract tracking confidence
        for key in ['tracking_confidence', 'track_score']:
            if key in person_data:
                json_person['tracking_confidence'] = float(person_data[key])
                break
        
        # Extract SMPL parameters
        if 'smpl' in person_data:
            smpl_data = person_data['smpl']
            if isinstance(smpl_data, dict):
                for key in ['betas', 'beta']:
                    if key in smpl_data:
                        json_person['smpl']['betas'] = to_list(smpl_data[key])
                        break
                
                for key in ['body_pose', 'pose']:
                    if key in smpl_data:
                        json_person['smpl']['body_pose'] = to_list(smpl_data[key])
                        break
                
                for key in ['global_orient', 'global_rotation', 'root_orient']:
                    if key in smpl_data:
                        json_person['smpl']['global_orient'] = to_list(smpl_data[key])
                        break
        
        # Extract keypoints
        for key in ['keypoints_3d', 'joints_3d', 'kp_3d']:
            if key in person_data:
                json_person['keypoints_3d'] = to_list(person_data[key])
                break
        
        for key in ['keypoints_2d', 'joints_2d', 'kp_2d']:
            if key in person_data:
                json_person['keypoints_2d'] = to_list(person_data[key])
                break
        
        # Extract camera parameters
        if 'camera' in person_data:
            cam_data = person_data['camera']
            if isinstance(cam_data, dict):
                for key in ['tx', 'translation_x']:
                    if key in cam_data:
                        json_person['camera']['tx'] = float(cam_data[key])
                        break
                for key in ['ty', 'translation_y']:
                    if key in cam_data:
                        json_person['camera']['ty'] = float(cam_data[key])
                        break
                for key in ['tz', 'translation_z']:
                    if key in cam_data:
                        json_person['camera']['tz'] = float(cam_data[key])
                        break
            elif isinstance(cam_data, (list, np.ndarray)):
                cam_list = to_list(cam_data)
                if len(cam_list) >= 3:
                    json_person['camera']['tx'] = float(cam_list[0])
                    json_person['camera']['ty'] = float(cam_list[1])
                    json_person['camera']['tz'] = float(cam_list[2])
        
        # Extract bounding box
        for key in ['bbox', 'bounding_box', 'box']:
            if key in person_data:
                json_person['bbox'] = to_list(person_data[key])
                break
        
        # Extract mesh vertices
        for key in ['mesh_vertices', 'vertices', 'verts']:
            if key in person_data:
                json_person['mesh_vertices'] = to_list(person_data[key])
                break
    
    return json_person


def to_list(data):
    """Convert numpy arrays and other types to Python lists."""
    import numpy as np
    
    if data is None:
        return []
    
    if isinstance(data, np.ndarray):
        return data.tolist()
    elif isinstance(data, list):
        return data
    elif isinstance(data, (int, float)):
        return [float(data)]
    else:
        try:
            return list(data)
        except:
            return []


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint - Requirement 6.2"""
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


@app.route('/api/pose/health', methods=['GET'])
def pose_health():
    """Health check endpoint for pose service - Requirement 6.2
    
    Verifies the Python service is available and returns status.
    """
    global models_loaded, subprocess_running
    
    try:
        health_status = {
            'status': 'healthy' if models_loaded else 'initializing',
            'timestamp': time.time(),
            'models_loaded': models_loaded,
            'gpu_available': device == 'cuda',
            'device': device,
            'models': {
                'hmr2': hmr2_model is not None,
                'vitdet': vitdet_detector is not None,
                'phalp': phalp_tracker is not None
            },
            'pool': {
                'gpu_busy': subprocess_running,
                'queue_length': len(request_queue),
                'active_jobs': len(active_jobs)
            }
        }
        
        # Determine overall health
        if not models_loaded:
            health_status['status'] = 'initializing'
            http_code = 503  # Service Unavailable
        elif len(request_queue) > 10:
            health_status['status'] = 'degraded'
            http_code = 200
        else:
            health_status['status'] = 'healthy'
            http_code = 200
        
        return jsonify(health_status), http_code
    
    except Exception as e:
        print(f"[HEALTH] ❌ Error: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/api/pose/pool-status', methods=['GET'])
def pool_status():
    """Pool status endpoint - Requirement 6.1
    
    Returns the current pool state: active workers, queued tasks, total processed.
    """
    global subprocess_running, request_queue, active_jobs
    
    try:
        # Count jobs by status
        queued_count = sum(1 for job in active_jobs.values() if job['status'] == 'queued')
        processing_count = sum(1 for job in active_jobs.values() if job['status'] == 'processing')
        completed_count = sum(1 for job in active_jobs.values() if job['status'] == 'completed')
        
        status_data = {
            'timestamp': time.time(),
            'pool': {
                'gpu_busy': subprocess_running,
                'max_workers': 1,  # Currently single GPU
                'active_workers': 1 if subprocess_running else 0,
                'available_workers': 0 if subprocess_running else 1
            },
            'queue': {
                'length': len(request_queue),
                'estimated_wait_time_seconds': len(request_queue) * 60  # Rough estimate: 60s per job
            },
            'jobs': {
                'total': len(active_jobs),
                'queued': queued_count,
                'processing': processing_count,
                'completed': completed_count
            },
            'system': {
                'device': device,
                'gpu_available': device == 'cuda',
                'models_loaded': models_loaded
            }
        }
        
        return jsonify(status_data), 200
    
    except Exception as e:
        print(f"[POOL-STATUS] ❌ Error: {e}")
        return jsonify({
            'error': str(e)
        }), 500


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


@app.route('/pose/video', methods=['POST'])
def pose_video():
    """Process an entire video with PHALP video-level tracking.
    
    Requirement 1: Process spawning and lifecycle management
    Requirement 2: Process pool and task queue
    Requirement 3: HTTP endpoints for pose detection
    Requirement 8: Comprehensive logging
    """
    global subprocess_running, request_queue, active_jobs
    
    try:
        # Parse request
        data = request.get_json()
        if not data:
            logger.error("[VIDEO] No JSON data provided")
            return jsonify({'error': 'No JSON data provided'}), 400
        
        if 'video_path' not in data:
            logger.error("[VIDEO] Missing video_path in request")
            return jsonify({'error': 'Missing video_path parameter'}), 400
        
        video_path = data['video_path']
        logger.info(f"[VIDEO] Received request for video: {video_path}")
        
        # Validate video file exists
        if not os.path.exists(video_path):
            logger.error(f"[VIDEO] Video file not found: {video_path}")
            return jsonify({'error': f'Video file not found: {video_path}'}), 400
        
        logger.info(f"[VIDEO] Video file exists: {video_path}")
        
        # Requirement 2: Check GPU availability
        with subprocess_lock:
            if subprocess_running:
                # Requirement 2.2: Queue the request
                job_id = str(uuid.uuid4())
                logger.info(f"[VIDEO] GPU busy - queuing request with job_id: {job_id}")
                
                request_queue.append({
                    'job_id': job_id,
                    'video_path': video_path
                })
                
                active_jobs[job_id] = {
                    'status': 'queued',
                    'video_path': video_path,
                    'queued_at': time.time()
                }
                
                logger.info(f"[VIDEO] Queue length: {len(request_queue)}")
                return jsonify({
                    'status': 'queued',
                    'job_id': job_id,
                    'message': 'Video processing queued - GPU is currently busy',
                    'queue_position': len(request_queue)
                }), 202
            
            # GPU is free - mark as running
            subprocess_running = True
            logger.info(f"[VIDEO] GPU available - processing immediately")
        
        # Process the video
        try:
            result = process_video_subprocess(video_path)
            return result
        finally:
            # Mark GPU as free and process next queued request if any
            with subprocess_lock:
                subprocess_running = False
                logger.info(f"[VIDEO] GPU freed - queue length: {len(request_queue)}")
                
                if request_queue:
                    next_request = request_queue.popleft()
                    logger.info(f"[VIDEO] Processing next queued request: {next_request['job_id']}")
                    
                    # Update job status
                    if next_request['job_id'] in active_jobs:
                        active_jobs[next_request['job_id']].update({
                            'status': 'processing',
                            'started_at': time.time()
                        })
                    
                    # Process next request (recursive call)
                    # Note: In production, this should be done asynchronously
                    logger.warning(f"[VIDEO] Next request queued but not auto-processed (would need async)")
    
    except Exception as e:
        logger.error(f"[VIDEO] Unexpected error: {e}")
        logger.error(f"[VIDEO] Traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


def process_video_subprocess(video_path, job_id=None, video_hash=None):
    """Process a single video with track.py subprocess.
    
    Requirement 1: Process spawning and lifecycle management
    Requirement 8: Comprehensive logging of process spawning, task queuing, and errors
    """
    global subprocess_running
    
    if job_id is None:
        job_id = str(uuid.uuid4())
    
    # Outer try/catch to ensure we always return a proper error response
    try:
        # Requirement 8.1: Log process spawning with process ID, frame number, and timestamp
        logger.info(f"[PROCESS] Starting video processing - job_id: {job_id}, video_path: {video_path}, timestamp: {time.time()}")
        
        # Spawn subprocess to run track.py
        logger.debug(f"[PROCESS] Spawning track.py subprocess for job {job_id}...")
        
        # Determine if running in Docker or WSL
        in_docker = os.path.exists('/.dockerenv')
        logger.info(f"[PROCESS] Running in Docker: {in_docker}")
        
        track_py_dir = POSE_SERVICE_PATH + '/4D-Humans'
        
        # Build command based on environment
        if in_docker:
            # In Docker: dependencies are already installed globally, no venv needed
            logger.info(f"[PROCESS] Using Docker paths:")
            logger.info(f"[PROCESS]   track_py_dir: {track_py_dir}")
            cmd = ['bash', '-c', f'cd {track_py_dir} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']
            logger.info(f"[PROCESS] Command: bash -c 'cd 4D-Humans && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=...'")
        else:
            # In WSL: need to activate venv
            venv_activate = POSE_SERVICE_PATH + '/venv/bin/activate'
            logger.info(f"[PROCESS] Using WSL paths:")
            logger.info(f"[PROCESS]   track_py_dir: {track_py_dir}")
            logger.info(f"[PROCESS]   venv_activate: {venv_activate}")
            cmd = ['bash', '-c', f'source {venv_activate} && cd {track_py_dir} && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source={video_path}']
            logger.info(f"[PROCESS] Command: bash -c 'source venv/bin/activate && cd 4D-Humans && python track.py hydra.job.chdir=false hydra.output_subdir=null hydra.run.dir=. video.source=...'")
        
        # For subprocess.run, we don't need cwd since we're using cd in the bash command
        cwd = None
        
        logger.info(f"[PROCESS] Working directory: {cwd}")
        
        import subprocess
        import glob
        
        # Requirement 8.1: Log process spawning
        start_time = time.time()
        timeout_seconds = POSE_TIMEOUT_MS / 1000
        logger.info(f"[PROCESS] Starting subprocess with {timeout_seconds}s timeout...")
        
        try:
            logger.info(f"[PROCESS] About to call subprocess.run with:")
            logger.info(f"[PROCESS]   cmd: {cmd}")
            if cwd is not None:
                logger.info(f"[PROCESS]   cwd: {cwd}")
            logger.info(f"[PROCESS]   timeout: {timeout_seconds}s")
            logger.info(f"[PROCESS]   capture_output: True")
            logger.info(f"[PROCESS]   text: True")
            
            # Build subprocess.run kwargs
            run_kwargs = {
                'timeout': timeout_seconds,
                'capture_output': True,
                'text': True,
                'shell': True,  # CRITICAL: Required to properly execute bash -c commands
                'executable': '/bin/bash'  # CRITICAL: Use bash explicitly, not /bin/sh (which doesn't support 'source')
            }
            if cwd is not None:
                run_kwargs['cwd'] = cwd
            
            # CRITICAL FIX: Use cmd[2] (the bash script string) with shell=True
            # When shell=True, we pass the command as a string, not a list
            # cmd[2] is the bash script: 'cd ... && python track.py ...' or 'source ... && cd ... && python track.py ...'
            result = subprocess.run(cmd[2], **run_kwargs)
            
            elapsed = time.time() - start_time
            logger.info(f"[PROCESS] ✓ Subprocess completed in {elapsed:.1f}s - job_id: {job_id}")
            logger.info(f"[PROCESS] Exit code: {result.returncode}")
            logger.info(f"[PROCESS] stdout length: {len(result.stdout)} chars")
            logger.info(f"[PROCESS] stderr length: {len(result.stderr)} chars")
            
            # Log subprocess output for debugging
            if result.stdout:
                logger.info(f"[PROCESS] ===== STDOUT START =====")
                logger.info(result.stdout)
                logger.info(f"[PROCESS] ===== STDOUT END =====")
            if result.stderr:
                logger.info(f"[PROCESS] ===== STDERR START =====")
                logger.info(result.stderr)
                logger.info(f"[PROCESS] ===== STDERR END =====")
            
            # Check exit code
            if result.returncode != 0:
                logger.error(f"[PROCESS] Subprocess failed with exit code {result.returncode} - job_id: {job_id}")
                logger.error(f"[PROCESS] Full stderr: {result.stderr}")
                logger.error(f"[PROCESS] Full stdout: {result.stdout}")
                
                # Check for common error patterns
                error_details = {
                    'exit_code': result.returncode,
                    'stderr': result.stderr[:2000],
                    'stdout': result.stdout[:2000]
                }
                
                # Detect CUDA OOM
                if 'CUDA out of memory' in result.stderr or 'RuntimeError: CUDA out of memory' in result.stderr:
                    error_details['error_type'] = 'CUDA_OOM'
                    logger.error(f"[PROCESS] Detected CUDA out of memory error")
                elif 'OutOfMemoryError' in result.stderr:
                    error_details['error_type'] = 'OUT_OF_MEMORY'
                    logger.error(f"[PROCESS] Detected out of memory error")
                elif 'Traceback' in result.stderr:
                    error_details['error_type'] = 'PYTHON_ERROR'
                    logger.error(f"[PROCESS] Detected Python error")
                else:
                    error_details['error_type'] = 'SUBPROCESS_ERROR'
                
                return jsonify({
                    'error': f'track.py failed with exit code {result.returncode}',
                    'error_details': error_details,
                    'job_id': job_id
                }), 500
            
            logger.info(f"[PROCESS] Subprocess succeeded - job_id: {job_id}")
            logger.debug(f"[PROCESS] stdout length: {len(result.stdout)} chars")
            
            # Requirement 8.1: Detect output .pkl file
            logger.info(f"[PROCESS] Searching for output .pkl file - job_id: {job_id}")
            
            # PHALP typically outputs to outputs/ directory in the working directory
            # Try multiple possible locations
            possible_output_dirs = [
                os.path.join(track_py_dir, 'outputs'),
                os.path.join(track_py_dir, 'output'),
                '/tmp/phalp_output',
                'outputs',
                'output'
            ]
            
            pkl_files = []
            for output_dir in possible_output_dirs:
                if os.path.exists(output_dir):
                    logger.debug(f"[PROCESS] Searching in: {output_dir}")
                    # Search for .pkl files recursively
                    found_files = glob.glob(os.path.join(output_dir, '**/*.pkl'), recursive=True)
                    pkl_files.extend(found_files)
                    logger.debug(f"[PROCESS] Found {len(found_files)} .pkl files in {output_dir}")
            
            # Also search in current directory
            found_files = glob.glob(os.path.join(track_py_dir, '*.pkl'))
            pkl_files.extend(found_files)
            logger.debug(f"[PROCESS] Found {len(found_files)} .pkl files in root")
            
            if len(pkl_files) == 0:
                logger.error(f"[PROCESS] No .pkl output file found - job_id: {job_id}")
                logger.error(f"[PROCESS] Searched in: {possible_output_dirs}")
                logger.error(f"[PROCESS] stdout: {result.stdout[:500]}")
                return jsonify({
                    'error': 'No .pkl output file found after track.py execution',
                    'searched_dirs': possible_output_dirs,
                    'stdout': result.stdout[:500],
                    'job_id': job_id
                }), 500
            
            if len(pkl_files) > 1:
                logger.warning(f"[PROCESS] Multiple .pkl files found: {pkl_files} - job_id: {job_id}")
                # Use the most recently modified one
                pkl_path = max(pkl_files, key=os.path.getmtime)
                logger.info(f"[PROCESS] Using most recent: {pkl_path}")
            else:
                pkl_path = pkl_files[0]
                logger.info(f"[PROCESS] Found output .pkl: {pkl_path}")
            
            # Requirement 8.4: Parse .pkl to JSON
            logger.info(f"[PROCESS] Parsing .pkl output to JSON - job_id: {job_id}")
            parse_start = time.time()
            
            try:
                parsed_data = parse_pkl_to_json(pkl_path)
                parse_elapsed = time.time() - parse_start
                logger.info(f"[PROCESS] Parsing completed in {parse_elapsed:.1f}s - job_id: {job_id}")
                logger.info(f"[PROCESS] Total frames: {parsed_data['total_frames']} - job_id: {job_id}")
                
                # Requirement 8.3: Log processing time and success status
                logger.info(f"[PROCESS] Processing complete - job_id: {job_id}, total_time: {elapsed:.1f}s, frames: {parsed_data['total_frames']}")
                
                # Build response
                response_data = {
                    'status': 'success',
                    'video_path': video_path,
                    'pkl_path': pkl_path,
                    'total_frames': parsed_data['total_frames'],
                    'frames': parsed_data['frames'],
                    'processing_time_seconds': elapsed,
                    'parsing_time_seconds': parse_elapsed,
                    'job_id': job_id
                }
                
                logger.debug(f"[PROCESS] Returning response with {len(response_data['frames'])} frames")
                return jsonify(response_data), 200
            
            except Exception as e:
                logger.error(f"[PROCESS] Error parsing .pkl: {e} - job_id: {job_id}")
                logger.error(f"[PROCESS] Traceback: {traceback.format_exc()}")
                return jsonify({
                    'error': f'Failed to parse .pkl output: {str(e)}',
                    'pkl_path': pkl_path,
                    'job_id': job_id
                }), 500
        
        except subprocess.TimeoutExpired as timeout_err:
            elapsed = time.time() - start_time
            logger.error(f"[PROCESS] ✗✗✗ SUBPROCESS TIMEOUT ✗✗✗")
            logger.error(f"[PROCESS] Timeout after {elapsed:.1f}s (limit: {timeout_seconds}s) - job_id: {job_id}")
            logger.error(f"[PROCESS] Timeout error: {str(timeout_err)}")
            
            # Try to capture any partial output from the timeout
            if hasattr(timeout_err, 'stdout') and timeout_err.stdout:
                logger.error(f"[PROCESS] Partial stdout: {timeout_err.stdout[:1000]}")
            if hasattr(timeout_err, 'stderr') and timeout_err.stderr:
                logger.error(f"[PROCESS] Partial stderr: {timeout_err.stderr[:1000]}")
            
            logger.error(f"[PROCESS] This likely means track.py is hanging or taking too long")
            logger.error(f"[PROCESS] Check GPU memory, PHALP configuration, or video file")
            
            return jsonify({
                'error': f'Processing timeout (exceeded {POSE_TIMEOUT_MS}ms)',
                'timeout_seconds': timeout_seconds,
                'elapsed_seconds': elapsed,
                'job_id': job_id,
                'note': 'Subprocess may be hanging - check GPU memory and PHALP logs'
            }), 500
        
        except Exception as subprocess_err:
            logger.error(f"[PROCESS] Subprocess execution error: {subprocess_err} - job_id: {job_id}")
            logger.error(f"[PROCESS] Error type: {type(subprocess_err).__name__}")
            logger.error(f"[PROCESS] Traceback: {traceback.format_exc()}")
            return jsonify({
                'error': f'Subprocess execution error: {str(subprocess_err)}',
                'error_type': type(subprocess_err).__name__,
                'job_id': job_id
            }), 500
    
    except Exception as outer_err:
        logger.error(f"[PROCESS] Outer exception handler caught error: {outer_err} - job_id: {job_id}")
        logger.error(f"[PROCESS] Error type: {type(outer_err).__name__}")
        logger.error(f"[PROCESS] Traceback: {traceback.format_exc()}")
        
        # CRITICAL: Always return a proper JSON error response, never let exceptions propagate
        try:
            return jsonify({
                'error': f'Unexpected error during video processing: {str(outer_err)}',
                'error_type': type(outer_err).__name__,
                'job_id': job_id
            }), 500
        except Exception as json_err:
            # Last resort - if even jsonify fails, return a plain text error
            logger.critical(f"[PROCESS] Failed to create JSON response: {json_err}")
            return ('Internal server error', 500)


@app.route('/pose/video/status/<job_id>', methods=['GET'])
def pose_video_status(job_id):
    """Check the status of a queued or processing video job.
    
    Task 2.2: Status endpoint for queued requests.
    """
    global active_jobs
    
    if job_id not in active_jobs:
        return jsonify({'error': f'Job {job_id} not found'}), 404
    
    job_info = active_jobs[job_id]
    return jsonify({
        'job_id': job_id,
        'status': job_info['status'],
        'video_path': job_info['video_path'],
        'queued_at': job_info.get('queued_at'),
        'started_at': job_info.get('started_at'),
        'completed_at': job_info.get('completed_at'),
        'result': job_info.get('result')
    }), 200


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
                    # Try multiple possible filenames (male model with neutral fallback)
                    possible_paths = [
                        '/app/data/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',  # Docker container path
                        '/app/data/basicmodel_m_lbs_10_207_0_v1.1.0_p3.pkl',  # Docker container path (alternate)
                        '/app/data/basicModel_neutral_lbs_10_207_0_v1.0.0.pkl',  # Neutral model fallback
                        '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0.pkl',  # WSL path
                        '/home/ben/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0_p3.pkl',  # WSL path (alternate)
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
                    # CRITICAL: Clear GPU memory before ViTDet detection
                    print(f"[🔴 POSE] 🧹 Frame {frame_number}: Pre-clearing GPU memory before ViTDet...")
                    torch.cuda.empty_cache()
                    
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
            
            try:
                for batch in dataloader:
                    # CRITICAL: Clear GPU memory BEFORE moving new batch to device
                    # This prevents CUDA OOM when loading the next frame
                    print(f"[🔴 POSE] 🧹 Frame {frame_number}: Pre-clearing GPU memory before batch transfer...")
                    torch.cuda.empty_cache()
                    
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
                    
                    # Extract camera params to CPU before clearing GPU memory
                    pred_cam_cpu = pred_cam[0].cpu().numpy()
                    box_center_cpu = box_center[0].cpu().numpy()
                    box_size_cpu = box_size[0].cpu().numpy()
                    img_size_cpu = img_size[0].cpu().numpy()
                    scaled_focal_length_cpu = float(scaled_focal_length.cpu().numpy())
                    
                    # CRITICAL: Clear GPU memory after extracting all outputs to CPU
                    # This prevents CUDA out of memory errors on subsequent frames
                    print(f"[🔴 POSE] 🧹 Frame {frame_number}: Clearing GPU memory...")
                    del batch, out, pred_cam, box_center, box_size, img_size, scaled_focal_length, pred_cam_t_full
                    torch.cuda.empty_cache()
                    print(f"[🔴 POSE] ✅ Frame {frame_number}: GPU memory cleared")
                    
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
                            'scale': float(pred_cam_cpu[0]),
                            'tx': float(pred_cam_cpu[1]),
                            'ty': float(pred_cam_cpu[2]),
                            'type': 'weak_perspective'
                        },
                        # Full camera info for proper rendering
                        'camera_full': {
                            'tx': float(cam_t[0]),
                            'ty': float(cam_t[1]),
                            'tz': float(cam_t[2]),
                            'focal_length': scaled_focal_length_cpu,
                            'img_width': int(img_size_cpu[0]),
                            'img_height': int(img_size_cpu[1]),
                            'type': 'perspective'
                        },
                        # Detection info
                        'detection': {
                            'box_center': box_center_cpu.tolist(),
                            'box_size': float(box_size_cpu),
                            'vitdet_used': vitdet_detector is not None,
                            'num_persons_detected': len(boxes)
                        },
                        'phalp_available': phalp_tracker is not None,
                        'processing_time_ms': processing_time_ms,
                        'error': None
                    }
                    
                    print(f"[🔴 POSE] ✅ Frame {frame_number}: Response ready - {len(keypoints)} keypoints, {len(vertices)} vertices")
                    print(f"[🔴 POSE] 📤 Frame {frame_number}: Sending response (took {processing_time_ms:.1f}ms)")
                    
                    # Final GPU memory cleanup before returning
                    torch.cuda.empty_cache()
                    
                    return jsonify(response_data)
            
            except Exception as e:
                print(f"[🔴 POSE] ❌ Frame {frame_number}: HMR2 processing failed: {e}")
                traceback.print_exc()
                # Clear GPU memory even on error
                torch.cuda.empty_cache()
                return jsonify({'error': f'HMR2 processing failed: {str(e)}'}), 500
        
        except Exception as e:
            print(f"[🔴 POSE] ❌ Frame {frame_number}: Image decoding or HMR2 setup failed: {e}")
            traceback.print_exc()
            torch.cuda.empty_cache()
            return jsonify({'error': f'Processing failed: {str(e)}'}), 500
    
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("[STARTUP] Starting Flask wrapper...")
    logger.info("=" * 60)
    
    # Requirement 7: Log configuration at startup
    logger.info(f"[STARTUP] Configuration:")
    logger.info(f"[STARTUP]   POSE_POOL_SIZE: {POSE_POOL_SIZE}")
    logger.info(f"[STARTUP]   POSE_TIMEOUT_MS: {POSE_TIMEOUT_MS}")
    logger.info(f"[STARTUP]   POSE_SERVICE_PATH: {POSE_SERVICE_PATH}")
    logger.info(f"[STARTUP]   DEBUG_MODE: {DEBUG_MODE}")
    logger.info(f"[STARTUP]   LOG_DIR: {log_dir}")
    
    # Requirement 7.4: Verify Python service is available before accepting requests
    logger.info(f"[STARTUP] Verifying Python service availability...")
    track_py_path = os.path.join(POSE_SERVICE_PATH, '4D-Humans', 'track.py')
    if os.path.exists(track_py_path):
        logger.info(f"[STARTUP] ✓ track.py found at: {track_py_path}")
    else:
        logger.warning(f"[STARTUP] ⚠ track.py not found at: {track_py_path}")
        logger.warning(f"[STARTUP] ⚠ Service may fail on first request")
    
    logger.info(f"[STARTUP] Listening on 0.0.0.0:5000")
    logger.info(f"[STARTUP] Models will be loaded lazily on first request...")
    
    # NOTE: Models are loaded lazily on first request to avoid long startup times
    # This allows the Flask server to start immediately and accept requests
    # initialize_models()  # DISABLED - models load on first request
    
    logger.info(f"[STARTUP] Starting HTTP server...")
    logger.info("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True,
        use_reloader=False
    )

