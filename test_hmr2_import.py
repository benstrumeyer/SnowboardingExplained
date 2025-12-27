#!/usr/bin/env python3
import sys
try:
    from hmr2.models import HMR2
    print("HMR2 imported OK")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
