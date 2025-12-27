"""
Setup SMPL model for PHALP - converts NPZ to PKL format if needed
"""
import os
import numpy as np
import pickle

def setup_smpl_model():
    """Convert SMPL_NEUTRAL.npz to the format PHALP expects"""
    
    npz_file = "basicModel_neutral_lbs_10_207_0_v1.0.0.pkl"  # Actually NPZ but named as PKL
    
    if not os.path.exists(npz_file):
        print(f"[SETUP] Error: {npz_file} not found")
        return False
    
    try:
        # Load the NPZ file
        print(f"[SETUP] Loading SMPL model from {npz_file}...")
        data = np.load(npz_file, allow_pickle=True)
        
        # Convert to dict format that PHALP expects
        smpl_dict = {}
        for key in data.files:
            smpl_dict[key] = data[key]
        
        print(f"[SETUP] Loaded keys: {list(smpl_dict.keys())}")
        
        # PHALP expects the model to have these keys:
        # 'J_regressor', 'weights', 'posedirs', 'shapedirs', 'v_template', 'f'
        required_keys = ['J_regressor', 'weights', 'posedirs', 'shapedirs', 'v_template', 'f']
        missing = [k for k in required_keys if k not in smpl_dict]
        
        if missing:
            print(f"[SETUP] Warning: Missing keys: {missing}")
            print(f"[SETUP] Available keys: {list(smpl_dict.keys())}")
        else:
            print(f"[SETUP] ✓ All required SMPL keys present")
        
        return True
        
    except Exception as e:
        print(f"[SETUP] Error loading SMPL model: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = setup_smpl_model()
    exit(0 if success else 1)
