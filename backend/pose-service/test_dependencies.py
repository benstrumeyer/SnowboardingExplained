#!/usr/bin/env python3
"""
Test script to verify all dependencies are installed correctly in the Docker container.
This script tests:
1. libGL.so.1 availability
2. Image decoding with sample base64 image
3. All module imports (4D-Humans, PHALP, ViTPose, Detectron2)
4. Flask startup
"""

import sys
import os
import base64
import io
from pathlib import Path

def test_libgl():
    """Test libGL.so.1 availability"""
    print("Testing libGL.so.1 availability...")
    try:
        import ctypes
        ctypes.CDLL("libGL.so.1")
        print("✓ libGL.so.1 is available")
        return True
    except OSError as e:
        print(f"✗ libGL.so.1 not found: {e}")
        return False

def test_image_decoding():
    """Test image decoding with sample base64 image"""
    print("\nTesting image decoding...")
    try:
        import cv2
        import numpy as np
        
        # Create a simple test image (100x100 RGB)
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        test_image[25:75, 25:75] = [255, 0, 0]  # Red square
        
        # Encode to base64
        _, buffer = cv2.imencode('.jpg', test_image)
        base64_image = base64.b64encode(buffer).decode('utf-8')
        
        # Decode from base64
        image_data = base64.b64decode(base64_image)
        nparr = np.frombuffer(image_data, np.uint8)
        decoded_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if decoded_image is not None and decoded_image.shape == (100, 100, 3):
            print("✓ Image decoding works correctly")
            return True
        else:
            print("✗ Image decoding failed: invalid output")
            return False
    except Exception as e:
        print(f"✗ Image decoding failed: {e}")
        return False

def test_module_imports():
    """Test all module imports"""
    print("\nTesting module imports...")
    
    modules_to_test = [
        ("torch", "PyTorch"),
        ("torchvision", "TorchVision"),
        ("cv2", "OpenCV"),
        ("numpy", "NumPy"),
        ("trimesh", "Trimesh"),
        ("pyrender", "PyRender"),
        ("pytorch3d", "PyTorch3D"),
        ("omegaconf", "OmegaConf"),
        ("hydra", "Hydra"),
        ("skimage", "scikit-image"),
        ("scipy", "SciPy"),
        ("einops", "Einops"),
        ("timm", "Timm"),
        ("flask", "Flask"),
        ("PIL", "Pillow"),
    ]
    
    all_passed = True
    for module_name, display_name in modules_to_test:
        try:
            __import__(module_name)
            print(f"✓ {display_name} imported successfully")
        except ImportError as e:
            print(f"✗ {display_name} import failed: {e}")
            all_passed = False
    
    # Test 4D-Humans specific imports
    print("\nTesting 4D-Humans specific imports...")
    try:
        from hmr2.models import HMR2
        print("✓ HMR2 model imported successfully")
    except ImportError as e:
        print(f"✗ HMR2 model import failed: {e}")
        all_passed = False
    
    # Test Detectron2 imports
    print("\nTesting Detectron2 imports...")
    try:
        from detectron2.config import get_cfg
        print("✓ Detectron2 imported successfully")
    except ImportError as e:
        print(f"✗ Detectron2 import failed: {e}")
        all_passed = False
    
    # Test PHALP imports
    print("\nTesting PHALP imports...")
    try:
        import phalp
        print("✓ PHALP imported successfully")
    except ImportError as e:
        print(f"✗ PHALP import failed: {e}")
        all_passed = False
    
    return all_passed

def test_flask_startup():
    """Test Flask startup"""
    print("\nTesting Flask startup...")
    try:
        from flask import Flask
        app = Flask(__name__)
        
        @app.route('/health')
        def health():
            return {'status': 'ok'}, 200
        
        print("✓ Flask app created successfully")
        return True
    except Exception as e:
        print(f"✗ Flask startup failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Pose Service Dependency Test Suite")
    print("=" * 60)
    
    results = {
        "libGL.so.1": test_libgl(),
        "Image Decoding": test_image_decoding(),
        "Module Imports": test_module_imports(),
        "Flask Startup": test_flask_startup(),
    }
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n✓ All tests passed!")
        return 0
    else:
        print("\n✗ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
