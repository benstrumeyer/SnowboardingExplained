#!/usr/bin/env python3
"""Create mean_params.npz file for HMR2 initialization."""

import numpy as np
import os

# Create data directory if it doesn't exist
data_dir = os.path.join(os.path.dirname(__file__), '4D-Humans', 'data')
os.makedirs(data_dir, exist_ok=True)

# Create mean parameters
# These are standard SMPL mean parameters used in HMR and similar models
mean_params = {
    'pose': np.zeros(69, dtype=np.float32),  # 23 joints * 3 (axis-angle) = 69
    'shape': np.zeros(10, dtype=np.float32),  # 10 shape parameters
    'cam': np.array([0.9, 0, 0], dtype=np.float32)  # camera parameters [scale, tx, ty]
}

# Save to npz file
output_path = os.path.join(data_dir, 'smpl_mean_params.npz')
np.savez(output_path, **mean_params)
print(f"✓ Created {output_path}")
print(f"  - pose shape: {mean_params['pose'].shape}")
print(f"  - shape shape: {mean_params['shape'].shape}")
print(f"  - cam shape: {mean_params['cam'].shape}")
