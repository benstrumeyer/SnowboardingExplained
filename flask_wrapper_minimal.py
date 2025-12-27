#!/usr/bin/env python3
"""Minimal Flask wrapper for 4D-Humans with PHALP."""

import sys
import json
import time
from pathlib import Path
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
        'ready': models_loaded
    })


@app.route('/pose/hybrid', methods=['POST'])
def pose_hybrid():
    """Process a single frame with 4D-Humans + PHALP tracking."""
    return jsonify({
        'error': 'Models not loaded yet'
    }), 503


if __name__ == '__main__':
    print("[STARTUP] Starting Flask server on 0.0.0.0:5000...")
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True
    )
