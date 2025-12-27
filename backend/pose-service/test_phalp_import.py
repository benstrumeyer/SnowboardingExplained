#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/ben/pose-service')
try:
    from phalp.trackers.PHALP import PHALP
    print("SUCCESS: PHALP imported")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
