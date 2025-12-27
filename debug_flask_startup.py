#!/usr/bin/env python3
"""Debug Flask startup to identify issues."""

import sys
import os
from pathlib import Path

print("[DEBUG] Python version:", sys.version)
print("[DEBUG] Python executable:", sys.executable)
print("[DEBUG] Current directory:", os.getcwd())

# Check if we're in the right directory
if not Path('4D-Humans').exists():
    print("[DEBUG] ✗ 4D-Humans directory not found!")
    print("[DEBUG] Current directory contents:")
    for item in Path('.').iterdir():
        print(f"  - {item}")
    sys.exit(1)

print("[DEBUG] ✓ 4D-Humans directory found")

# Try importing Flask
print("[DEBUG] Importing Flask...")
try:
    import flask
    print(f"[DEBUG] ✓ Flask {flask.__version__} imported")
except ImportError as e:
    print(f"[DEBUG] ✗ Failed to import Flask: {e}")
    sys.exit(1)

# Try importing torch
print("[DEBUG] Importing torch...")
try:
    import torch
    print(f"[DEBUG] ✓ Torch {torch.__version__} imported")
    print(f"[DEBUG] CUDA available: {torch.cuda.is_available()}")
except ImportError as e:
    print(f"[DEBUG] ✗ Failed to import torch: {e}")
    sys.exit(1)

# Try importing PIL
print("[DEBUG] Importing PIL...")
try:
    from PIL import Image
    print("[DEBUG] ✓ PIL imported")
except ImportError as e:
    print(f"[DEBUG] ✗ Failed to import PIL: {e}")
    sys.exit(1)

# Try importing numpy
print("[DEBUG] Importing numpy...")
try:
    import numpy as np
    print("[DEBUG] ✓ Numpy imported")
except ImportError as e:
    print(f"[DEBUG] ✗ Failed to import numpy: {e}")
    sys.exit(1)

# Try importing the Flask app
print("[DEBUG] Importing Flask app...")
try:
    from flask_wrapper import app
    print("[DEBUG] ✓ Flask app imported")
except Exception as e:
    print(f"[DEBUG] ✗ Failed to import Flask app: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Try starting Flask in debug mode
print("[DEBUG] Starting Flask app...")
print("[DEBUG] Flask will listen on 0.0.0.0:5000")
print("[DEBUG] Press Ctrl+C to stop")

try:
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True,
        use_reloader=False
    )
except Exception as e:
    print(f"[DEBUG] ✗ Failed to start Flask: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
