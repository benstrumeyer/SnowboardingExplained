"""
Core pose detection logic using 4DHumans (HMR2) and ViTPose models.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import io
from PIL import Image

class PoseDetector:
    """
    Pose detector using 4DHumans (HMR2) and ViTPose models.
    
    Loads models once and reuses them for all frames.
    """
    
    def __init__(self, model_cache_dir: str = '.models'):
        """
        Initialize pose detector with cached models.
        
        Args:
            model_cache_dir: Directory where models are cached
        """
        self.model_cache_dir = Path(model_cache_dir)
        self.hmr2_model = None
        self.vitpose_model = None
        self.device = 'cuda' if self._has_cuda() else 'cpu'
        
        # Load models
        self._load_models()
    
    def _has_cuda(self) -> bool:
        """Check if CUDA is available."""
        try:
            import torch
            return torch.cuda.is_available()
        except:
            return False
    
    def _load_models(self):
        """Load HMR2 and ViTPose models from cache."""
        try:
            import torch
            
            # Load HMR2 model
            hmr2_path = self.model_cache_dir / 'hmr2' / 'hmr2_ckpt.pt'
            if hmr2_path.exists():
                print(f"Loading HMR2 model from {hmr2_path}...")
                self.hmr2_model = torch.load(hmr2_path, map_location=self.device)
                print("✓ HMR2 model loaded")
            else:
                print(f"⚠ HMR2 model not found at {hmr2_path}")
            
            # Load ViTPose model
            vitpose_path = self.model_cache_dir / 'vitpose' / 'vitpose_coco.pth'
            if vitpose_path.exists():
                print(f"Loading ViTPose model from {vitpose_path}...")
                self.vitpose_model = torch.load(vitpose_path, map_location=self.device)
                print("✓ ViTPose model loaded")
            else:
                print(f"⚠ ViTPose model not found at {vitpose_path}")
                
        except Exception as e:
            print(f"Error loading models: {str(e)}")
            raise
    
    def detect(self, image_data: bytes) -> Dict[str, Any]:
        """
        Detect pose from image bytes (base64-decoded).
        
        Args:
            image_data: Image data as bytes
            
        Returns:
            Dictionary with pose data
        """
        try:
            # Decode image
            image = Image.open(io.BytesIO(image_data))
            image_np = np.array(image)
            
            return self._detect_pose(image_np)
            
        except Exception as e:
            return {
                'keypoints': [],
                'has3d': False,
                'error': str(e)
            }
    
    def detect_from_file(self, image_path: str) -> Dict[str, Any]:
        """
        Detect pose from image file.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Dictionary with pose data
        """
        try:
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Failed to load image from {image_path}")
            
            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            return self._detect_pose(image)
            
        except Exception as e:
            return {
                'keypoints': [],
                'has3d': False,
                'error': str(e)
            }
    
    def _detect_pose(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Internal method to detect pose from image array.
        
        Args:
            image: Image as numpy array (RGB)
            
        Returns:
            Dictionary with pose data including keypoints, 3D joints, angles, mesh
        """
        try:
            # Get image dimensions
            height, width = image.shape[:2]
            
            # Placeholder implementation - returns dummy data
            # In production, this would call HMR2 and ViTPose models
            
            keypoints = self._get_dummy_keypoints(width, height)
            
            return {
                'keypoints': keypoints,
                'has3d': True,
                'joint_angles_3d': self._get_dummy_angles(),
                'mesh_vertices': self._get_dummy_mesh_vertices(),
                'mesh_faces': self._get_dummy_mesh_faces(),
                'camera_translation': [0.0, 0.0, 5.0]
            }
            
        except Exception as e:
            return {
                'keypoints': [],
                'has3d': False,
                'error': str(e)
            }
    
    def _get_dummy_keypoints(self, width: int, height: int) -> List[Dict[str, Any]]:
        """Get dummy keypoints for testing."""
        # SMPL skeleton keypoints
        keypoint_names = [
            'pelvis', 'left_hip', 'right_hip', 'spine1', 'left_knee', 'right_knee',
            'spine2', 'left_ankle', 'right_ankle', 'spine3', 'left_foot', 'right_foot',
            'neck', 'left_collar', 'right_collar', 'head', 'left_shoulder', 'right_shoulder',
            'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hand', 'right_hand'
        ]
        
        keypoints = []
        for i, name in enumerate(keypoint_names):
            keypoints.append({
                'name': name,
                'x': (width / 2) + np.random.randn() * 50,
                'y': (height / 2) + np.random.randn() * 50,
                'z': 0.0 + np.random.randn() * 0.1,
                'confidence': 0.9 + np.random.randn() * 0.05
            })
        
        return keypoints
    
    def _get_dummy_angles(self) -> Dict[str, float]:
        """Get dummy joint angles for testing."""
        return {
            'left_knee': 120.0,
            'right_knee': 125.0,
            'left_hip': 45.0,
            'right_hip': 42.0,
            'spine': 15.0
        }
    
    def _get_dummy_mesh_vertices(self) -> List[List[float]]:
        """Get dummy mesh vertices for testing."""
        # Return a small set of dummy vertices
        return [
            [0.0, 0.0, 0.0],
            [0.1, 0.0, 0.0],
            [0.0, 0.1, 0.0],
            [0.0, 0.0, 0.1]
        ]
    
    def _get_dummy_mesh_faces(self) -> List[List[int]]:
        """Get dummy mesh faces for testing."""
        # Return a small set of dummy faces
        return [
            [0, 1, 2],
            [0, 2, 3],
            [1, 2, 3]
        ]
