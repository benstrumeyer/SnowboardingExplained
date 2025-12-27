#!/usr/bin/env python3
"""
Test HMR2 output to verify coordinate systems and mesh alignment
"""
import sys
import os
import numpy as np
import torch
from PIL import Image
from torchvision.transforms import Normalize

# Add paths
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, '4D-Humans'))

# Patch torch.load
import typing
from omegaconf import DictConfig, ListConfig
from omegaconf.base import ContainerMetadata
torch.serialization.add_safe_globals([DictConfig, ListConfig, ContainerMetadata, typing.Any, dict])
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load

from hmr2_loader import get_hmr2_modules

def test_hmr2_with_sample_image():
    """Test HMR2 with a sample image"""
    
    print("=" * 80)
    print("HMR2 OUTPUT VERIFICATION TEST")
    print("=" * 80)
    
    # Load HMR2
    print("\n[TEST] Loading HMR2 modules...")
    HMR2_MODULES = get_hmr2_modules()
    download_models = HMR2_MODULES['download_models']
    load_hmr2 = HMR2_MODULES['load_hmr2']
    cache_dir = HMR2_MODULES['CACHE_DIR_4DHUMANS']
    default_checkpoint = HMR2_MODULES['DEFAULT_CHECKPOINT']
    
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"[TEST] Device: {device}")
    
    # Download models
    print("[TEST] Downloading HMR2 models...")
    download_models(cache_dir)
    
    # Load model
    print("[TEST] Loading HMR2 checkpoint...")
    hmr2_model, hmr2_cfg = load_hmr2(default_checkpoint)
    hmr2_model = hmr2_model.to(device)
    hmr2_model.eval()
    print("[TEST] ✓ HMR2 loaded")
    
    # Create a test image (solid color - worst case)
    print("\n[TEST] Creating test image...")
    test_image = np.ones((360, 640, 3), dtype=np.uint8) * 128  # Gray image
    print(f"[TEST] Test image shape: {test_image.shape}")
    
    # Preprocess
    print("\n[TEST] Preprocessing image...")
    pil_image = Image.fromarray(test_image)
    pil_image = pil_image.resize((256, 256), Image.BILINEAR)
    image_array_resized = np.array(pil_image)
    
    image_tensor = torch.from_numpy(image_array_resized).float().to(device)
    image_tensor = image_tensor.permute(2, 0, 1).unsqueeze(0) / 255.0
    
    normalize = Normalize(mean=[0.485, 0.456, 0.406], 
                        std=[0.229, 0.224, 0.225])
    image_tensor = normalize(image_tensor)
    
    print(f"[TEST] Tensor shape: {image_tensor.shape}")
    print(f"[TEST] Tensor range: [{image_tensor.min():.3f}, {image_tensor.max():.3f}]")
    
    # Create batch dict - TEST DIFFERENT FORMATS
    print("\n[TEST] Testing different batch dict formats...")
    
    # Format 1: Current implementation
    batch1 = {
        'img': image_tensor,
        'img_metas': [{
            'ori_shape': test_image.shape,
            'img_shape': image_tensor.shape,
            'scale_factor': 1.0,
            'flip': False,
        }]
    }
    
    # Format 2: Alternative (img_shape as 2D)
    batch2 = {
        'img': image_tensor,
        'img_metas': [{
            'ori_shape': test_image.shape[:2],  # (H, W)
            'img_shape': (256, 256),  # (H, W)
            'scale_factor': 1.0,
            'flip': False,
        }]
    }
    
    # Format 3: Minimal
    batch3 = {
        'img': image_tensor,
        'img_metas': [{}]
    }
    
    batches = [
        ("Current (img_shape as tensor shape)", batch1),
        ("Alternative (img_shape as 2D)", batch2),
        ("Minimal (empty img_metas)", batch3),
    ]
    
    for batch_name, batch in batches:
        print(f"\n[TEST] Testing: {batch_name}")
        try:
            with torch.no_grad():
                pred_dict = hmr2_model(batch)
            
            print(f"[TEST] ✓ Success!")
            print(f"[TEST] Output keys: {list(pred_dict.keys())}")
            
            # Extract and analyze outputs
            vertices = pred_dict.get('pred_vertices', torch.zeros(1, 6890, 3)).cpu().numpy()[0]
            keypoints = pred_dict.get('pred_keypoints_3d', torch.zeros(1, 17, 3)).cpu().numpy()[0]
            cam = pred_dict.get('pred_cam', torch.zeros(1, 3)).cpu().numpy()[0]
            
            print(f"[TEST] Vertices shape: {vertices.shape}")
            print(f"[TEST] Vertices range: X=[{vertices[:, 0].min():.3f}, {vertices[:, 0].max():.3f}], Y=[{vertices[:, 1].min():.3f}, {vertices[:, 1].max():.3f}], Z=[{vertices[:, 2].min():.3f}, {vertices[:, 2].max():.3f}]")
            print(f"[TEST] Keypoints shape: {keypoints.shape}")
            print(f"[TEST] Keypoints range: X=[{keypoints[:, 0].min():.3f}, {keypoints[:, 0].max():.3f}], Y=[{keypoints[:, 1].min():.3f}, {keypoints[:, 1].max():.3f}], Z=[{keypoints[:, 2].min():.3f}, {keypoints[:, 2].max():.3f}]")
            print(f"[TEST] Camera translation: {cam}")
            
            # Check if outputs are reasonable
            if np.allclose(vertices, 0):
                print(f"[TEST] ⚠️  WARNING: All vertices are zero!")
            if np.allclose(keypoints, 0):
                print(f"[TEST] ⚠️  WARNING: All keypoints are zero!")
            if np.allclose(cam, 0):
                print(f"[TEST] ⚠️  WARNING: Camera translation is zero!")
                
        except Exception as e:
            print(f"[TEST] ✗ Error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == '__main__':
    test_hmr2_with_sample_image()
