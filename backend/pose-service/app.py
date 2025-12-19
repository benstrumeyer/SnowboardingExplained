"""
Flask HTTP Server for 4D-Humans Pose Detection (WSL)
Exposes HMR2 pose detection as a REST API

Main endpoint: /pose/hybrid - 3D pose with mesh overlay using official Renderer
"""

# CRITICAL: Patch torch.load BEFORE any other imports for PyTorch 2.6+ compatibility
import torch
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load
print("[PATCH] torch.load patched for weights_only=False")

from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import sys
import os

# Add 4D-Humans to path so we can import the official Renderer
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '4D-Humans'))

# Import hybrid detector (4D-Humans HMR2)
try:
    from hybrid_pose_detector import get_hybrid_detector
    HAS_HYBRID = True
except ImportError as e:
    print(f"[WARN] Hybrid detector not available: {e}")
    HAS_HYBRID = False

# Import official Renderer from 4D-Humans
try:
    from hmr2.utils.renderer import Renderer
    HAS_RENDERER = True
except ImportError as e:
    print(f"[WARN] Official Renderer not available: {e}")
    HAS_RENDERER = False

app = Flask(__name__)
CORS(app)

# Track model readiness
_models_ready = False
_warmup_in_progress = False


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint - shows if models are loaded and ready"""
    detector = get_hybrid_detector() if HAS_HYBRID else None
    
    hmr2_loaded = detector.model_loaded if detector else False
    vitdet_loaded = detector.vitdet_loaded and detector.vitdet_detector is not None if detector else False
    
    status = 'ready' if (hmr2_loaded and vitdet_loaded) else 'warming_up' if _warmup_in_progress else 'not_ready'
    
    return jsonify({
        'status': status,
        'service': 'pose-detection-wsl',
        'hybrid_available': HAS_HYBRID,
        'models': {
            'hmr2': 'loaded' if hmr2_loaded else 'not_loaded',
            'vitdet': 'loaded' if vitdet_loaded else 'not_loaded'
        },
        'ready': hmr2_loaded and vitdet_loaded,
        'timestamp': time.time()
    })


def do_warmup():
    """Internal warmup function - loads models"""
    global _models_ready, _warmup_in_progress
    
    if not HAS_HYBRID:
        return {'status': 'error', 'error': 'HMR2 detector not available'}
    
    _warmup_in_progress = True
    results = {
        'status': 'warming up',
        'hmr2': {'status': 'pending'},
        'vitdet': {'status': 'pending'}
    }
    
    try:
        detector = get_hybrid_detector()
        
        # Load HMR2
        print("[WARMUP] Loading HMR2 model...")
        hmr2_start = time.time()
        try:
            detector._load_hmr2()
            hmr2_time = time.time() - hmr2_start
            results['hmr2'] = {
                'status': 'loaded' if detector.model_loaded else 'failed',
                'load_time_seconds': round(hmr2_time, 2)
            }
            print(f"[WARMUP] HMR2 loaded in {hmr2_time:.1f}s")
        except Exception as e:
            results['hmr2'] = {'status': 'error', 'error': str(e)}
            print(f"[WARMUP] HMR2 failed: {e}")
        
        # Load ViTDet
        print("[WARMUP] Loading ViTDet model...")
        vitdet_start = time.time()
        try:
            vitdet = detector._load_vitdet()
            vitdet_time = time.time() - vitdet_start
            results['vitdet'] = {
                'status': 'loaded' if vitdet is not None else 'failed',
                'load_time_seconds': round(vitdet_time, 2)
            }
            print(f"[WARMUP] ViTDet loaded in {vitdet_time:.1f}s")
        except Exception as e:
            results['vitdet'] = {'status': 'error', 'error': str(e)}
            print(f"[WARMUP] ViTDet failed: {e}")
        
        # Overall status
        hmr2_ok = results['hmr2'].get('status') == 'loaded'
        vitdet_ok = results['vitdet'].get('status') == 'loaded'
        
        if hmr2_ok and vitdet_ok:
            results['status'] = 'ready'
            results['message'] = 'All models loaded and ready'
            _models_ready = True
            print("[WARMUP] ✓ All models ready!")
        elif hmr2_ok:
            results['status'] = 'partial'
            results['message'] = 'HMR2 loaded, ViTDet failed (will use full-image fallback)'
            _models_ready = True
            print("[WARMUP] ⚠ Partial ready (HMR2 only)")
        else:
            results['status'] = 'error'
            results['message'] = 'Model loading failed'
            print("[WARMUP] ✗ Model loading failed")
        
        return results
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'status': 'error', 'error': str(e)}
    finally:
        _warmup_in_progress = False


@app.route('/warmup', methods=['GET', 'POST'])
def warmup():
    """
    Pre-load HMR2 and ViTDet models to avoid cold start delays.
    
    Call this endpoint once after server starts to warm up the models.
    Models are cached on disk after first download (~500MB HMR2, ~2.7GB ViTDet).
    Subsequent warmups just load from disk cache.
    
    Returns timing info for each model load.
    """
    results = do_warmup()
    status_code = 200 if results.get('status') in ['ready', 'partial'] else 500
    return jsonify(results), status_code


@app.route('/pose/hybrid', methods=['POST'])
def detect_pose_hybrid():
    """
    Detect pose with 3D mesh using HMR2
    
    Request body:
    {
        "image_base64": "base64 encoded PNG/JPG",
        "frame_number": 0 (optional),
        "visualize": true (optional - returns image with mesh overlay)
    }
    """
    if not HAS_HYBRID:
        return jsonify({'error': 'HMR2 detector not available'}), 501
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        image_base64 = data.get('image_base64')
        if not image_base64:
            return jsonify({'error': 'image_base64 is required'}), 400
        
        frame_number = data.get('frame_number', 0)
        visualize = data.get('visualize', False)
        
        detector = get_hybrid_detector()
        
        if visualize:
            result = detector.detect_pose_with_visualization(image_base64, frame_number)
        else:
            result = detector.detect_pose(image_base64, frame_number)
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/reload', methods=['POST'])
def reload_modules():
    """
    Hot-reload projection/visualization code without reloading models.
    
    This reloads the hybrid_pose_detector module but preserves the loaded models
    by keeping the detector instance and just updating its methods.
    
    Use this when you change projection/visualization code (not model loading).
    """
    try:
        import importlib
        import sys
        
        # Get the current detector with loaded models
        detector = get_hybrid_detector()
        
        # Save model references
        saved_hmr2_model = detector.hmr2_model
        saved_hmr2_cfg = detector.hmr2_cfg
        saved_vitdet = detector.vitdet_detector
        saved_model_loaded = detector.model_loaded
        saved_vitdet_loaded = detector.vitdet_loaded
        
        # Reload the module
        if 'hybrid_pose_detector' in sys.modules:
            import hybrid_pose_detector
            importlib.reload(hybrid_pose_detector)
        
        # Get new detector class but restore models
        from hybrid_pose_detector import HybridPoseDetector, get_hybrid_detector as new_get_detector
        
        # The singleton was reset, get it and restore models
        new_detector = new_get_detector()
        new_detector.hmr2_model = saved_hmr2_model
        new_detector.hmr2_cfg = saved_hmr2_cfg
        new_detector.vitdet_detector = saved_vitdet
        new_detector.model_loaded = saved_model_loaded
        new_detector.vitdet_loaded = saved_vitdet_loaded
        
        return jsonify({
            'status': 'reloaded',
            'message': 'Code reloaded. Models preserved in memory.',
            'models': {
                'hmr2': 'loaded' if saved_model_loaded else 'not_loaded',
                'vitdet': 'loaded' if saved_vitdet else 'not_loaded'
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/detect_pose_with_visualization', methods=['POST'])
def detect_pose_with_visualization():
    """
    Detect pose and return visualization with mesh overlay
    
    Request body:
    {
        "image": "base64 encoded PNG/JPG",
        "frame_number": 0 (optional)
    }
    """
    if not HAS_HYBRID:
        return jsonify({'error': 'HMR2 detector not available'}), 501
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        image_base64 = data.get('image')
        if not image_base64:
            return jsonify({'error': 'image is required'}), 400
        
        frame_number = data.get('frame_number', 0)
        
        detector = get_hybrid_detector()
        result = detector.detect_pose_with_visualization(image_base64, frame_number)
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500


if __name__ == '__main__':
    import threading
    import os
    
    print("=" * 60)
    print("4D-Humans Pose Detection Service (WSL)")
    print("=" * 60)
    print("Endpoints:")
    print("  GET  /health                        - Health check (shows ready status)")
    print("  GET  /warmup                        - Pre-load models")
    print("  POST /pose/hybrid                   - HMR2 3D pose detection")
    print("  POST /detect_pose_with_visualization - Pose with mesh overlay")
    print(f"HMR2 detector: {'available' if HAS_HYBRID else 'NOT available'}")
    
    if HAS_HYBRID:
        try:
            detector = get_hybrid_detector()
            print(f"  Model: {detector.model_version}")
            print(f"  Device: {detector.device}")
            print(f"  3D enabled: {detector.use_3d}")
        except Exception as e:
            print(f"  Error: {e}")
    
    print("=" * 60)
    
    # Auto-warmup: load models in background after server starts
    # Set SKIP_WARMUP=1 to disable auto-warmup
    skip_warmup = os.environ.get('SKIP_WARMUP', '0') == '1'
    
    if HAS_HYBRID and not skip_warmup:
        def background_warmup():
            """Load models in background after server starts"""
            import time as t
            t.sleep(1)  # Wait for server to be ready
            print("")
            print("=" * 60)
            print("[STARTUP] Auto-warming up models...")
            print("=" * 60)
            do_warmup()
            print("=" * 60)
            print("[STARTUP] Ready to accept requests!")
            print("=" * 60)
        
        warmup_thread = threading.Thread(target=background_warmup, daemon=True)
        warmup_thread.start()
    else:
        if skip_warmup:
            print("[STARTUP] Skipping auto-warmup (SKIP_WARMUP=1)")
        print("[STARTUP] Call /warmup to load models before first request")
    
    print("")
    app.run(host='0.0.0.0', port=5000, debug=False)
