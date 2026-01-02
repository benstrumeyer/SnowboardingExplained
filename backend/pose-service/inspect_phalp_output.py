#!/usr/bin/env python3
"""
Diagnostic script to inspect PHALP output structure
Run this to understand what data is available in PHALP pickle files
"""

import pickle
import json
import sys
from pathlib import Path
import numpy as np

def inspect_pickle(pkl_path):
    """Load and inspect a pickle file"""
    print(f"\n{'='*80}")
    print(f"Inspecting: {pkl_path}")
    print(f"{'='*80}")
    
    try:
        with open(pkl_path, 'rb') as f:
            data = pickle.load(f)
        
        print(f"Type: {type(data).__name__}")
        print(f"Size: {len(data) if hasattr(data, '__len__') else 'N/A'}")
        
        if isinstance(data, dict):
            print(f"\nDict keys ({len(data)}):")
            for i, key in enumerate(list(data.keys())[:10]):
                value = data[key]
                print(f"  [{i}] {key}: {type(value).__name__}", end="")
                if isinstance(value, dict):
                    print(f" with {len(value)} keys", end="")
                    if i < 3:
                        print(f" -> {list(value.keys())[:5]}", end="")
                elif isinstance(value, (list, tuple)):
                    print(f" with {len(value)} items", end="")
                elif isinstance(value, np.ndarray):
                    print(f" shape {value.shape} dtype {value.dtype}", end="")
                print()
            
            # Deep dive into first item
            first_key = list(data.keys())[0]
            first_value = data[first_key]
            print(f"\nDeep dive into first item '{first_key}':")
            print(f"  Type: {type(first_value).__name__}")
            
            if isinstance(first_value, dict):
                print(f"  Keys: {list(first_value.keys())}")
                for key, val in first_value.items():
                    if isinstance(val, np.ndarray):
                        print(f"    {key}: ndarray shape {val.shape} dtype {val.dtype}")
                    elif isinstance(val, (list, tuple)):
                        print(f"    {key}: {type(val).__name__} len {len(val)}")
                    else:
                        print(f"    {key}: {type(val).__name__} = {val}")
        
        elif isinstance(data, list):
            print(f"\nList with {len(data)} items:")
            for i, item in enumerate(data[:3]):
                print(f"  [{i}] {type(item).__name__}", end="")
                if isinstance(item, dict):
                    print(f" with keys {list(item.keys())[:5]}", end="")
                print()
        
        return data
    
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    # Try to find PHALP output files
    search_paths = [
        Path.home() / 'repos' / 'PHALP' / 'assets' / 'videos' / 'gt_tracks.pkl',
        Path.home() / 'videos' / 'output',
        Path('/tmp'),
    ]
    
    pkl_files = []
    for search_path in search_paths:
        if isinstance(search_path, Path) and search_path.is_file():
            pkl_files.append(search_path)
        elif isinstance(search_path, Path) and search_path.is_dir():
            pkl_files.extend(search_path.glob('*.pkl'))
    
    if not pkl_files:
        print("No pickle files found. Usage:")
        print(f"  python {sys.argv[0]} <path_to_pickle_file>")
        sys.exit(1)
    
    for pkl_file in pkl_files[:5]:
        data = inspect_pickle(str(pkl_file))
        if data:
            print(f"\n✓ Successfully loaded {pkl_file.name}")
