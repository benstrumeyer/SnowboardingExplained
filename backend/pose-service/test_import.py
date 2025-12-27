#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/ben/pose-service/4D-Humans')

print('[TEST] Starting import...')
try:
    import hmr2.models.hmr2
    print('[TEST] Import complete')
except Exception as e:
    print(f'[TEST] Import failed: {e}')
    import traceback
    traceback.print_exc()
