"""
Flask HTTP Server for Pose Detection
Exposes MediaPipe pose detection as a REST API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from pose_detector import get_detector
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'pose-detection',
        'timestamp': time.time()
    })


@app.route('/pose', methods=['POST'])
def detect_pose():
    """
    Detect pose keypoints from an image
    
    Request body:
    {
        "image_base64": "base64 encoded PNG/JPG",
        "frame_number": 0 (optional)
    }
    
    Response:
    {
        "frame_number": 0,
        "frame_width": 1920,
        "frame_height": 1080,
        "keypoints": [...],
        "processing_time_ms": 145,
        "model_version": "mediapipe-0.10.9"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        image_base64 = data.get('image_base64')
        if not image_base64:
            return jsonify({'error': 'image_base64 is required'}), 400
        
        frame_number = data.get('frame_number', 0)
        
        # Get detector and run pose detection
        detector = get_detector()
        result = detector.detect_pose(image_base64, frame_number)
        
        # Check for errors
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}'
        }), 500


@app.route('/batch', methods=['POST'])
def detect_pose_batch():
    """
    Detect pose keypoints from multiple images
    
    Request body:
    {
        "images": [
            {"image_base64": "...", "frame_number": 0},
            {"image_base64": "...", "frame_number": 1},
            ...
        ]
    }
    
    Response:
    {
        "results": [...],
        "total_processing_time_ms": 1450
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        images = data.get('images', [])
        if not images:
            return jsonify({'error': 'images array is required'}), 400
        
        start_time = time.time()
        detector = get_detector()
        results = []
        
        for img_data in images:
            image_base64 = img_data.get('image_base64')
            frame_number = img_data.get('frame_number', 0)
            
            if image_base64:
                result = detector.detect_pose(image_base64, frame_number)
                results.append(result)
            else:
                results.append({
                    'error': 'image_base64 is required',
                    'frame_number': frame_number
                })
        
        total_time = (time.time() - start_time) * 1000
        
        return jsonify({
            'results': results,
            'total_processing_time_ms': round(total_time, 2)
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}'
        }), 500


if __name__ == '__main__':
    print("=" * 50)
    print("Starting Pose Detection Service")
    print("=" * 50)
    print("Endpoints:")
    print("  GET  /health - Health check")
    print("  POST /pose   - Detect pose from single image")
    print("  POST /batch  - Detect pose from multiple images")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
