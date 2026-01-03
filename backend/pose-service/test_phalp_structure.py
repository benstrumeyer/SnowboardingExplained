#!/usr/bin/env python3
"""
Test script to understand PHALP output structure
Run this after track.py processes a video to see what data is available
"""

import pickle
import json
import sys
import os
from pathlib import Path
import numpy as np

def inspect_phalp_output(pkl_path):
    """Load and inspect PHALP pickle output"""
    print(f"\n{'='*80}")
    print(f"Inspecting PHALP output: {pkl_path}")
    print(f"{'='*80}\n")
    
    try:
        with open(pkl_path, 'rb') as f:
            data = pickle.load(f)
        
        print(f"Root type: {type(data).__name__}")
        print(f"Root size: {len(data) if hasattr(data, '__len__') else 'N/A'}\n")
        
        if isinstance(data, dict):
            print(f"Dict keys ({len(data)}):")
            for i, key in enumerate(list(data.keys())[:5]):
                value = data[key]
                print(f"  [{i}] '{key}': {type(value).__name__}", end="")
                
                if isinstance(value, dict):
                    print(f" with keys: {list(value.keys())[:10]}")
                    
                    # Deep dive into first dict
                    if i == 0:
                        print(f"\n      Deep dive into '{key}':")
                        for k, v in list(value.items())[:15]:
                            if isinstance(v, np.ndarray):
                                print(f"        {k}: ndarray shape={v.shape} dtype={v.dtype}")
                            elif isinstance(v, (list, tuple)):
                                print(f"        {k}: {type(v).__name__} len={len(v)}")
                            elif isinstance(v, dict):
                                print(f"        {k}: dict with keys {list(v.keys())[:5]}")
                            else:
                                print(f"        {k}: {type(v).__name__} = {v}")
                        print()
                
                elif isinstance(value, (list, tuple)):
                    print(f" with {len(value)} items")
                    if len(value) > 0:
                        print(f"      First item type: {type(value[0]).__name__}")
                
                elif isinstance(value, np.ndarray):
                    print(f" shape={value.shape} dtype={value.dtype}")
                else:
                    print()
        
        elif isinstance(data, list):
            print(f"List with {len(data)} items")
            for i, item in enumerate(data[:3]):
                print(f"  [{i}] {type(item).__name__}", end="")
                if isinstance(item, dict):
                    print(f" with keys: {list(item.keys())[:10]}")
                else:
                    print()
        
        return data
    
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    # Find PHALP output files
    search_paths = [
        Path.home() / 'videos' / 'output',
        Path('/tmp'),
        Path.cwd(),
    ]
    
    pkl_files = []
    for search_path in search_paths:
        if search_path.is_dir():
            pkl_files.extend(search_path.glob('*.pkl'))
    
    if not pkl_files:
        print("No pickle files found in:")
        for p in search_paths:
            print(f"  - {p}")
        print("\nUsage: python test_phalp_structure.py <path_to_pkl>")
        sys.exit(1)
    
    print(f"Found {len(pkl_files)} pickle files\n")
    
    for pkl_file in sorted(pkl_files)[:3]:
        print(f"Processing: {pkl_file}")
        data = inspect_phalp_output(str(pkl_file))
        if data:
            print(f"✓ Successfully loaded\n")
