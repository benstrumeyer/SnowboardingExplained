"""
Model downloading and caching utilities for 4DHumans (HMR2) and ViTPose.
"""

import os
import sys
from pathlib import Path
from typing import Optional
import urllib.request
import hashlib

# Model URLs and checksums
MODELS = {
    'hmr2': {
        'url': 'https://dl.fbaipublicfiles.com/eft/hmr2_ckpt.pt',
        'filename': 'hmr2_ckpt.pt',
        'size_mb': 500,
        'description': '4DHumans (HMR2) model'
    },
    'vitpose': {
        'url': 'https://download.openmmlab.com/mmpose/body_2d_keypoint/topdown_heatmap/coco/vit-base_8xb64-210e_coco-256x192-216371b7_20230615.pth',
        'filename': 'vitpose_coco.pth',
        'size_mb': 100,
        'description': 'ViTPose model'
    }
}

def download_file(url: str, destination: Path, description: str = '') -> bool:
    """
    Download a file with progress reporting.
    
    Args:
        url: URL to download from
        destination: Path to save file to
        description: Description for logging
        
    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"Downloading {description}...")
        print(f"  URL: {url}")
        print(f"  Destination: {destination}")
        
        # Create parent directory if needed
        destination.parent.mkdir(parents=True, exist_ok=True)
        
        # Download with progress
        def progress_hook(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(100, (downloaded * 100) // total_size)
                sys.stdout.write(f"\r  Progress: {percent}% ({downloaded // 1024 // 1024}MB / {total_size // 1024 // 1024}MB)")
                sys.stdout.flush()
        
        urllib.request.urlretrieve(url, destination, progress_hook)
        print("\n  ✓ Download complete")
        return True
        
    except Exception as e:
        print(f"  ✗ Download failed: {str(e)}")
        return False

def verify_model(model_path: Path) -> bool:
    """Verify that a model file exists and is readable."""
    if not model_path.exists():
        return False
    if not model_path.is_file():
        return False
    if model_path.stat().st_size == 0:
        return False
    return True

def download_hmr2(cache_dir: str = '.models') -> bool:
    """
    Download and cache 4DHumans (HMR2) model.
    
    Args:
        cache_dir: Directory to cache models in
        
    Returns:
        True if model is available (either already cached or successfully downloaded)
    """
    cache_path = Path(cache_dir) / 'hmr2'
    cache_path.mkdir(parents=True, exist_ok=True)
    
    model_path = cache_path / MODELS['hmr2']['filename']
    
    # Check if already cached
    if verify_model(model_path):
        print(f"✓ HMR2 model already cached at {model_path}")
        return True
    
    # Download model
    print(f"Downloading HMR2 model (~{MODELS['hmr2']['size_mb']}MB)...")
    success = download_file(
        MODELS['hmr2']['url'],
        model_path,
        MODELS['hmr2']['description']
    )
    
    if success and verify_model(model_path):
        print(f"✓ HMR2 model ready at {model_path}")
        return True
    else:
        print(f"✗ Failed to download HMR2 model")
        return False

def download_vitpose(cache_dir: str = '.models') -> bool:
    """
    Download and cache ViTPose model.
    
    Args:
        cache_dir: Directory to cache models in
        
    Returns:
        True if model is available (either already cached or successfully downloaded)
    """
    cache_path = Path(cache_dir) / 'vitpose'
    cache_path.mkdir(parents=True, exist_ok=True)
    
    model_path = cache_path / MODELS['vitpose']['filename']
    
    # Check if already cached
    if verify_model(model_path):
        print(f"✓ ViTPose model already cached at {model_path}")
        return True
    
    # Download model
    print(f"Downloading ViTPose model (~{MODELS['vitpose']['size_mb']}MB)...")
    success = download_file(
        MODELS['vitpose']['url'],
        model_path,
        MODELS['vitpose']['description']
    )
    
    if success and verify_model(model_path):
        print(f"✓ ViTPose model ready at {model_path}")
        return True
    else:
        print(f"✗ Failed to download ViTPose model")
        return False

def get_model_path(model_name: str, cache_dir: str = '.models') -> Optional[Path]:
    """
    Get the path to a cached model.
    
    Args:
        model_name: Name of model ('hmr2' or 'vitpose')
        cache_dir: Directory where models are cached
        
    Returns:
        Path to model if it exists, None otherwise
    """
    if model_name not in MODELS:
        return None
    
    model_info = MODELS[model_name]
    model_path = Path(cache_dir) / model_name / model_info['filename']
    
    if verify_model(model_path):
        return model_path
    
    return None

def verify_all_models(cache_dir: str = '.models') -> bool:
    """
    Verify that all required models are available.
    
    Args:
        cache_dir: Directory where models are cached
        
    Returns:
        True if all models are available
    """
    all_available = True
    
    for model_name in MODELS.keys():
        model_path = get_model_path(model_name, cache_dir)
        if model_path:
            print(f"✓ {model_name.upper()} model available at {model_path}")
        else:
            print(f"✗ {model_name.upper()} model not found")
            all_available = False
    
    return all_available
