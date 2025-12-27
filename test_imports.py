#!/usr/bin/env python3
import sys
print("Testing imports...")

try:
    import flask
    print("✓ Flask OK")
except Exception as e:
    print(f"✗ Flask failed: {e}")
    sys.exit(1)

try:
    import torch
    print("✓ Torch OK")
except Exception as e:
    print(f"✗ Torch failed: {e}")
    sys.exit(1)

try:
    import numpy
    print("✓ Numpy OK")
except Exception as e:
    print(f"✗ Numpy failed: {e}")
    sys.exit(1)

try:
    from PIL import Image
    print("✓ PIL OK")
except Exception as e:
    print(f"✗ PIL failed: {e}")
    sys.exit(1)

print("\nAll imports OK!")
