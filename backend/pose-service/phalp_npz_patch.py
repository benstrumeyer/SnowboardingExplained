"""
Patch for PHALP to handle NPZ files as SMPL models
This patches the convert_pkl function to work with NPZ files
"""
import os
import sys
import numpy as np
import pickle

def patch_phalp_utils():
    """Monkey-patch PHALP's utils to handle NPZ files"""
    try:
        from phalp.utils import utils
        
        # Save original convert_pkl
        original_convert_pkl = utils.convert_pkl
        
        def patched_convert_pkl(old_pkl):
            """Handle both PKL and NPZ files"""
            print(f"[PATCH] convert_pkl called with: {old_pkl}")
            
            # Check if file exists
            if not os.path.exists(old_pkl):
                print(f"[PATCH] File not found: {old_pkl}")
                # Try with .npz extension
                npz_file = old_pkl.replace('.pkl', '.npz')
                if os.path.exists(npz_file):
                    print(f"[PATCH] Found NPZ file instead: {npz_file}")
                    old_pkl = npz_file
                else:
                    raise FileNotFoundError(f"Neither {old_pkl} nor {npz_file} found")
            
            # If it's an NPZ file, load it directly
            if old_pkl.endswith('.npz'):
                print(f"[PATCH] Loading NPZ file: {old_pkl}")
                data = np.load(old_pkl, allow_pickle=True)
                smpl_dict = {key: data[key] for key in data.files}
                print(f"[PATCH] Loaded NPZ with keys: {list(smpl_dict.keys())}")
                return smpl_dict
            
            # Otherwise use original function
            print(f"[PATCH] Using original convert_pkl for: {old_pkl}")
            return original_convert_pkl(old_pkl)
        
        # Replace the function
        utils.convert_pkl = patched_convert_pkl
        print("[PATCH] ✓ PHALP utils patched successfully")
        return True
        
    except Exception as e:
        print(f"[PATCH] Error patching PHALP: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    patch_phalp_utils()
