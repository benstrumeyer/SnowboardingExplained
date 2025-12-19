"""
Flask HTTP Server for 4D-Humans Pose Detection (WSL)
Exposes HMR2 pose detection as a REST API

Main endpoint: /pose/hybrid - 3D pose with mesh overlay
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

# Import hybrid detector (4D-Humans HMR2)
try:
    from hybrid_pose_detector import get_hybrid_detector
    HAS_HYBRID = True
except ImportError as e:
    print(f"[WARN] Hybrid detector not available: {e}")
    HAS_HYBRID = False

app = Flask(__name__)
CORS(app)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'pose-detection-wsl',
        'hybrid_available': HAS_HYBRID,
        'timestamp': time.time()
    })


@app.route('/warmup', methods=['GET', 'POST'])
def warmup():
    """
    Pre-load HMR2 and ViTDet models to avoid cold start delays.
    
    Call this endpoint once after server starts to warm up the models.
    Models are cached on disk after first download (~500MB HMR2, ~2.7GB ViTDet).
    Subsequent warmups just load from disk cache.
    
    Returns timing info for each model load.
    """
    if not HAS_HYBRID:
        return jsonify({
            'status': 'error',
            'error': 'HMR2 detector not available'
        }), 501
    
    results = {
        'status': 'warming up',
        'hmr2': {'status': 'pending'},
        'vitdet': {'status': 'pending'}
    }
    
    try:
        detector = get_hybrid_detector()
        
        # Load HMR2
        hmr2_start = time.time()
        try:
            detector._load_hmr2()
            hmr2_time = time.time() - hmr2_start
            results['hmr2'] = {
                'status': 'loaded' if detector.model_loaded else 'failed',
                'load_time_seconds': round(hmr2_time, 2)
            }
        except Exception as e:
            results['hmr2'] = {'status': 'error', 'error': str(e)}
        
        # Load ViTDet
        vitdet_start = time.time()
        try:
            vitdet = detector._load_vitdet()
            vitdet_time = time.time() - vitdet_start
            results['vitdet'] = {
                'status': 'loaded' if vitdet is not None else 'failed',
                'load_time_seconds': round(vitdet_time, 2)
            }
        except Exception as e:
            results['vitdet'] = {'status': 'error', 'error': str(e)}
        
        # Overall status
        hmr2_ok = results['hmr2'].get('status') == 'loaded'
        vitdet_ok = results['vitdet'].get('status') == 'loaded'
        
        if hmr2_ok and vitdet_ok:
            results['status'] = 'ready'
            results['message'] = 'All models loaded and ready'
        elif hmr2_ok:
            results['status'] = 'partial'
            results['message'] = 'HMR2 loaded, ViTDet failed (will use full-image fallback)'
        else:
            results['status'] = 'error'
            results['message'] = 'Model loading failed'
        
        return jsonify(results)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


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
    print("=" * 60)
    print("4D-Humans Pose Detection Service (WSL)")
    print("=" * 60)
    print("Endpoints:")
    print("  GET  /health                        - Health check")
    print("  GET  /warmup                        - Pre-load models (call once after start)")
    print("  POST /pose/hybrid                   - HMR2 3D pose detection")
    print("  POST /detect_pose_with_visualization - Pose with mesh overlay")
    print(f"HMR2 detector: {'available' if HAS_HYBRID else 'NOT available'}")
    print("")
    print("TIP: Call /warmup after server starts to pre-load models (~30s)")
    print("     Models are cached on disk after first download.")
    
    if HAS_HYBRID:
        try:
            detector = get_hybrid_detector()
            print(f"  Model: {detector.model_version}")
            print(f"  Device: {detector.device}")
            print(f"  3D enabled: {detector.use_3d}")
        except Exception as e:
            print(f"  Error: {e}")
    
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=False)
