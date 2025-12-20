"""
HMR2 loader that bypasses pyrender/OpenGL requirements on Windows/WSL
We only need the model inference, not the rendering
"""
import sys
import os

def _is_wsl():
    """Check if running in WSL"""
    try:
        if sys.platform.startswith('linux'):
            with open('/proc/version', 'r') as f:
                return 'microsoft' in f.read().lower()
    except:
        pass
    return False

def load_hmr2_without_renderer():
    """
    Load HMR2 model, skipping renderer initialization in WSL/Windows
    """
    
    # Fix HOME env var for Windows - strip any whitespace
    home_dir = os.environ.get('USERPROFILE', os.path.expanduser('~')).strip()
    os.environ['HOME'] = home_dir
    
    # Pre-set the cache directory to avoid issues with HOME having spaces
    cache_dir = os.path.join(home_dir, '.cache')
    cache_dir_4dhumans = os.path.join(cache_dir, '4DHumans')
    os.makedirs(cache_dir_4dhumans, exist_ok=True)
    
    # Now try to import hmr2
    try:
        # Add 4D-Humans to path
        hmr2_path = os.path.join(os.path.dirname(__file__), '4D-Humans')
        if hmr2_path not in sys.path:
            sys.path.insert(0, hmr2_path)

        from hmr2.models import HMR2, download_models, load_hmr2, DEFAULT_CHECKPOINT
        from hmr2.configs import CACHE_DIR_4DHUMANS
        from hmr2.utils import recursive_to

        # Override CACHE_DIR_4DHUMANS to use our clean path
        clean_cache_dir = cache_dir_4dhumans

        # Patch HMR2.__init__ to skip renderer in WSL
        if _is_wsl():
            print("[HMR2_LOADER] WSL detected - patching HMR2 to skip renderer initialization")
            original_init = HMR2.__init__
            
            def patched_init(self, cfg, init_renderer=True):
                # Force init_renderer=False in WSL
                print("[HMR2_LOADER] Calling HMR2.__init__ with init_renderer=False")
                original_init(self, cfg, init_renderer=False)
            
            HMR2.__init__ = patched_init

        return {
            'HMR2': HMR2,
            'download_models': download_models,
            'load_hmr2': load_hmr2,
            'DEFAULT_CHECKPOINT': DEFAULT_CHECKPOINT,
            'CACHE_DIR_4DHUMANS': clean_cache_dir,  # Use our clean path
            'recursive_to': recursive_to
        }

    except Exception as e:
        print(f"[HMR2] Failed to load: {e}")
        import traceback
        traceback.print_exc()
        return None


# Try to load on import
_hmr2_modules = None

def get_hmr2_modules():
    global _hmr2_modules
    if _hmr2_modules is None:
        _hmr2_modules = load_hmr2_without_renderer()
    return _hmr2_modules
