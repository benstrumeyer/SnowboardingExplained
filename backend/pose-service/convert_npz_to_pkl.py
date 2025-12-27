#!/usr/bin/env python3
"""
Convert SMPL NPZ file to PKL format for PHALP compatibility
"""
import numpy as np
import pickle
import sys
import os

def convert_npz_to_pkl(npz_path, pkl_path):
    """Convert NPZ to PKL format"""
    print(f"[CONVERT] Loading NPZ from: {npz_path}")
    
    if not os.path.exists(npz_path):
        print(f"[CONVERT] Error: NPZ file not found: {npz_path}")
        return False
    
    try:
        # Load NPZ
        data = np.load(npz_path, allow_pickle=True)
        print(f"[CONVERT] Loaded NPZ with keys: {list(data.files)}")
        
        # Convert to dict
        smpl_dict = {}
        for key in data.files:
            smpl_dict[key] = data[key]
            print(f"[CONVERT]   {key}: {type(smpl_dict[key])} shape={getattr(smpl_dict[key], 'shape', 'N/A')}")
        
        # Save as PKL
        print(f"[CONVERT] Saving to PKL: {pkl_path}")
        with open(pkl_path, 'wb') as f:
            pickle.dump(smpl_dict, f)
        
        print(f"[CONVERT] ✓ Conversion complete")
        print(f"[CONVERT] PKL file size: {os.path.getsize(pkl_path) / 1024 / 1024:.1f} MB")
        return True
        
    except Exception as e:
        print(f"[CONVERT] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    npz_file = "C:/Users/benja/OneDrive/Desktop/clips/SMPL_NEUTRAL.npz"
    pkl_file = "basicModel_neutral_lbs_10_207_0_v1.0.0.pkl"
    
    if len(sys.argv) > 1:
        npz_file = sys.argv[1]
    if len(sys.argv) > 2:
        pkl_file = sys.argv[2]
    
    success = convert_npz_to_pkl(npz_file, pkl_file)
    sys.exit(0 if success else 1)
