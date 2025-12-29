#!/usr/bin/env python3
"""Download SMPL model for HMR2 inference.

The SMPL model is required by HMR2 for pose estimation.
4D-Humans expects it at: data/basicModel_neutral_lbs_10_207_0_v1.0.0.pkl

This script attempts to download it, but it may require manual setup.
See: https://smplify.is.tue.mpg.de/
"""

import os
import sys
from pathlib import Path

def setup_smpl_model(output_dir='/app/data'):
    """Setup SMPL model for HMR2.
    
    The SMPL model must be downloaded manually from:
    https://smplify.is.tue.mpg.de/
    
    But we can check if it exists and guide the user.
    """
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Expected paths where SMPL model should be
    expected_paths = [
        os.path.join(output_dir, 'basicModel_neutral_lbs_10_207_0_v1.0.0.pkl'),
        os.path.join(output_dir, 'SMPL_NEUTRAL.pkl'),
        'data/basicModel_neutral_lbs_10_207_0_v1.0.0.pkl',
    ]
    
    # Check if SMPL model already exists
    for path in expected_paths:
        if os.path.exists(path):
            print(f"✓ SMPL model found at {path}")
            return path
    
    print("⚠ SMPL model not found")
    print("\nTo use HMR2 for pose estimation, you need to:")
    print("1. Go to https://smplify.is.tue.mpg.de/")
    print("2. Register and download 'SMPL for Python v1.0.0'")
    print("3. Extract basicModel_neutral_lbs_10_207_0_v1.0.0.pkl")
    print(f"4. Place it in {output_dir}/")
    print("\nWithout SMPL model, HMR2 will fail to run.")
    print("PHALP will still work if available.")
    
    return None

if __name__ == '__main__':
    output_dir = sys.argv[1] if len(sys.argv) > 1 else '/app/data'
    setup_smpl_model(output_dir)

