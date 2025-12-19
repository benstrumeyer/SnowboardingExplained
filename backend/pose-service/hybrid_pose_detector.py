"""
4D-Humans (HMR2) Pose Detector - Exact Demo Implementation

This implementation exactly follows the 4D-Humans demo.py:
1. ViTDet detection for person bounding boxes
2. HMR2 inference on cropped regions
3. cam_crop_to_full() to convert camera params to full image space
4. Proper perspective projection for mesh rendering

Reference: https://github.com/shubham-goel/4D-Humans/blob/main/demo.py

VERSION: 2024-12-19-v3 (ViTDet exact demo.py implementation)
"""

import base64
import io
import time
import numpy as np
from PIL import Image
import os
import torch
import logging
import json
import sys

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Print version info on import
print("=" * 60)
print("[HYBRID_POSE_DETECTOR] VERSION: 2024-12-19-v3 (ViTDet exact demo.py)")
print(f"[HYBRID_POSE_DETECTOR] File: {__file__}")
print(f"[HYBRID_POSE_DETECTOR] Python: {sys.executable}")
print("=" * 60)

# Config flags
USE_HMR2 = True

# Check for torch
try:
    import torch
    HAS_TORCH = True
    print(f"[POSE] PyTorch {torch.__version__}, CUDA: {torch.cuda.is_available()}")
except ImportError:
    HAS_TORCH = False
    print("[POSE] PyTorch not installed")

# Check for HMR2 using our custom loader
HAS_HMR2 = False
HMR2_MODULES = None
if HAS_TORCH and USE_HMR2:
    try:
        from hmr2_loader import get_hmr2_modules
        HMR2_MODULES = get_hmr2_modules()
        if HMR2_MODULES:
            HAS_HMR2 = True
            print("[POSE] HMR2 (4D-Humans) available")
        else:
            print("[POSE] HMR2 loader returned None")
    except Exception as e:
        print(f"[POSE] HMR2 not available: {e}")

# SMPL joint names (24 joints from 4D-Humans)
SMPL_JOINT_NAMES = [
    'pelvis', 'left_hip', 'right_hip', 'spine1',
    'left_knee', 'right_knee', 'spine2', 'left_ankle',
    'right_ankle', 'spine3', 'left_foot', 'right_foot',
    'neck', 'left_collar', 'right_collar', 'head',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hand', 'right_hand'
]


def cam_crop_to_full(cam_bbox, box_center, box_size, img_size, focal_length=5000.):
    """
    Convert camera parameters from crop space to full image space.
    
    This is the EXACT function from 4D-Humans/hmr2/utils/renderer.py
    
    Args:
        cam_bbox: (B, 3) tensor with [s, tx, ty] in crop space
        box_center: (B, 2) tensor with crop center in image pixels
        box_size: (B,) tensor with crop size in pixels
        img_size: (B, 2) tensor with [width, height] of full image
        focal_length: focal length for perspective projection
    
    Returns:
        (B, 3) tensor with [tx, ty, tz] camera translation in full image space
    """
    img_w, img_h = img_size[:, 0], img_size[:, 1]
    cx, cy, b = box_center[:, 0], box_center[:, 1], box_size
    w_2, h_2 = img_w / 2., img_h / 2.
    bs = b * cam_bbox[:, 0] + 1e-9
    tz = 2 * focal_length / bs
    tx = (2 * (cx - w_2) / bs) + cam_bbox[:, 1]
    ty = (2 * (cy - h_2) / bs) + cam_bbox[:, 2]
    full_cam = torch.stack([tx, ty, tz], dim=-1)
    return full_cam


class HybridPoseDetector:
    """
    4D-Humans pose detector using HMR2 - Exact Demo Implementation
    
    Follows the exact flow from demo.py:
    1. ViTDet detection
    2. ViTDetDataset for preprocessing
    3. HMR2 inference
    4. cam_crop_to_full() for camera conversion
    """
    
    def __init__(self, use_gpu=True):
        self.device = 'cuda' if use_gpu and HAS_TORCH and torch.cuda.is_available() else 'cpu'
        self.hmr2_model = None
        self.hmr2_cfg = None
        self.model_loaded = False
        self.vitdet_detector = None  # Cache ViTDet detector
        self.vitdet_loaded = False
        
        self.use_3d = HAS_TORCH and HAS_HMR2  # Works on CPU or CUDA
        self.model_version = "4d-humans-hmr2-demo" if self.use_3d else "disabled"
        
        print(f"[POSE] Initializing 4D-Humans detector (demo implementation)")
        print(f"[POSE] Device: {self.device}")
        print(f"[POSE] HMR2 enabled: {self.use_3d}")
    
    def _load_vitdet(self):
        """Lazy load ViTDet detector - cached for reuse"""
        if self.vitdet_loaded:
            return self.vitdet_detector
        
        try:
            logger.info("[ViTDet] Loading ViTDet detector (first run downloads ~2.7GB)...")
            start = time.time()
            
            from pathlib import Path
            from detectron2.config import LazyConfig
            import hmr2
            from hmr2.utils.utils_detectron2 import DefaultPredictor_Lazy
            
            # Load ViTDet config - EXACT as demo.py
            cfg_path = Path(hmr2.__file__).parent / 'configs' / 'cascade_mask_rcnn_vitdet_h_75ep.py'
            logger.info("[ViTDet] Loading config from: %s", cfg_path)
            
            detectron2_cfg = LazyConfig.load(str(cfg_path))
            
            # Set checkpoint URL - EXACT as demo.py
            detectron2_cfg.train.init_checkpoint = "https://dl.fbaipublicfiles.com/detectron2/ViTDet/COCO/cascade_mask_rcnn_vitdet_h/f328730692/model_final_f05665.pkl"
            
            # Set score threshold - EXACT as demo.py
            for i in range(3):
                detectron2_cfg.model.roi_heads.box_predictors[i].test_score_thresh = 0.25
            
            logger.info("[ViTDet] Creating predictor...")
            self.vitdet_detector = DefaultPredictor_Lazy(detectron2_cfg)
            self.vitdet_loaded = True
            
            logger.info("[ViTDet] ✓ Loaded in %.1fs", time.time() - start)
            return self.vitdet_detector
            
        except Exception as e:
            logger.error("[ViTDet] Failed to load: %s", str(e), exc_info=True)
            self.vitdet_loaded = True  # Mark as attempted
            self.vitdet_detector = None
            return None
    
    def _load_hmr2(self):
        """Lazy load HMR2 model - exactly as in demo.py"""
        if self.model_loaded or not self.use_3d or not HMR2_MODULES:
            return
        
        print("[POSE] Loading HMR2 model (first run downloads ~500MB)...")
        start = time.time()
        
        try:
            download_models = HMR2_MODULES['download_models']
            load_hmr2 = HMR2_MODULES['load_hmr2']
            CACHE_DIR_4DHUMANS = HMR2_MODULES['CACHE_DIR_4DHUMANS']
            DEFAULT_CHECKPOINT = HMR2_MODULES['DEFAULT_CHECKPOINT']
            
            # Exactly as in demo.py
            download_models(CACHE_DIR_4DHUMANS)
            self.hmr2_model, self.hmr2_cfg = load_hmr2(DEFAULT_CHECKPOINT)
            self.hmr2_model = self.hmr2_model.to(self.device)
            self.hmr2_model.eval()
            self.model_loaded = True
            print(f"[POSE] HMR2 loaded in {(time.time() - start):.1f}s")
        except Exception as e:
            print(f"[POSE] Failed to load HMR2: {e}")
            import traceback
            traceback.print_exc()
            self.use_3d = False
    
    def _decode_image(self, image_base64: str):
        """Decode base64 image"""
        image_data = base64.b64decode(image_base64)
        pil_image = Image.open(io.BytesIO(image_data))
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        return pil_image, np.array(pil_image)
    
    def _run_hmr2_demo_style(self, image_np):
        """
        Run HMR2 exactly as in demo.py
        
        Key steps from demo.py:
        1. Detect humans with ViTDet
        2. Create ViTDetDataset with detected boxes
        3. Run HMR2 model
        4. Use cam_crop_to_full() for camera conversion
        """
        logger.info("[HMR2] _run_hmr2_demo_style called: use_3d=%s, HAS_TORCH=%s, HAS_HMR2=%s, device=%s", 
                   self.use_3d, HAS_TORCH, HAS_HMR2, self.device)
        
        if not self.use_3d or not HMR2_MODULES:
            logger.warning("[HMR2] Skipped: use_3d=%s, HMR2_MODULES=%s", self.use_3d, HMR2_MODULES is not None)
            return None
        
        logger.info("[HMR2] Starting HMR2 detection (demo-style)")
        self._load_hmr2()
        if not self.model_loaded:
            logger.error("[HMR2] Model failed to load")
            return None
        
        try:
            import cv2
            import sys
            hmr2_path = os.path.join(os.path.dirname(__file__), '4D-Humans')
            if hmr2_path not in sys.path:
                sys.path.insert(0, hmr2_path)
            from hmr2.datasets.vitdet_dataset import ViTDetDataset
            recursive_to = HMR2_MODULES['recursive_to']
            
            h, w = image_np.shape[:2]
            logger.info("[HMR2] Image shape: %dx%d", w, h)
            
            # Step 1: Try ViTDet detection (EXACT as demo.py), fallback to full image
            boxes = None
            try:
                # Use cached ViTDet detector
                detector = self._load_vitdet()
                
                if detector is not None:
                    logger.info("[HMR2] Running ViTDet inference on image...")
                    det_out = detector(image_np)
                    det_instances = det_out['instances']
                    
                    # Filter for persons (class 0) with score > 0.5 - EXACT as demo.py
                    valid_idx = (det_instances.pred_classes == 0) & (det_instances.scores > 0.5)
                    boxes_detected = det_instances.pred_boxes.tensor[valid_idx].cpu().numpy()
                    
                    logger.info("[HMR2] ✓ ViTDet inference complete")
                    logger.info("[HMR2] Total instances: %d, Valid persons: %d", 
                               len(det_instances), len(boxes_detected))
                    
                    if len(boxes_detected) > 0:
                        logger.info("[HMR2] ✓ ViTDet found %d persons", len(boxes_detected))
                        logger.info("[HMR2] Box bounds: %s", boxes_detected)
                        boxes = boxes_detected.astype(np.float32)
                    else:
                        logger.info("[HMR2] ViTDet found no persons, using full image")
                        boxes = np.array([[0, 0, w, h]], dtype=np.float32)
                else:
                    logger.info("[HMR2] ViTDet not available, using full image as bounding box")
                    boxes = np.array([[0, 0, w, h]], dtype=np.float32)
                    
            except ImportError as e:
                logger.error("[HMR2] ImportError: %s", str(e), exc_info=True)
                logger.info("[HMR2] ViTDet not available, using full image as bounding box")
                boxes = np.array([[0, 0, w, h]], dtype=np.float32)
            except Exception as e:
                logger.error("[HMR2] Exception during ViTDet detection: %s", str(e), exc_info=True)
                logger.warning("[HMR2] ViTDet detection failed, using full image")
                boxes = np.array([[0, 0, w, h]], dtype=np.float32)
            
            # Step 2: Create ViTDetDataset - exactly as in demo.py
            logger.info("[HMR2] Creating ViTDetDataset with %d boxes", len(boxes))
            dataset = ViTDetDataset(self.hmr2_cfg, image_np, boxes)
            dataloader = torch.utils.data.DataLoader(dataset, batch_size=1, shuffle=False, num_workers=0)
            
            # Step 3: Run HMR2 model - exactly as in demo.py
            logger.info("[HMR2] Running HMR2 model inference...")
            
            with torch.no_grad():
                for batch in dataloader:
                    batch = recursive_to(batch, self.device)
                    output = self.hmr2_model(batch)
                    
                    # Step 4: Extract predictions - exactly as in demo.py
                    pred_cam = output['pred_cam']  # (B, 3) - [s, tx, ty] in crop space
                    box_center = batch["box_center"].float()  # (B, 2)
                    box_size = batch["box_size"].float()  # (B,)
                    img_size = batch["img_size"].float()  # (B, 2)
                    
                    # Step 5: Compute scaled focal length - exactly as in demo.py
                    # CRITICAL: This must match the focal length used in projection
                    scaled_focal_length = self.hmr2_cfg.EXTRA.FOCAL_LENGTH / self.hmr2_cfg.MODEL.IMAGE_SIZE * img_size.max()
                    
                    # Step 6: Convert camera to full image space - THE KEY FUNCTION
                    # This ensures mesh and keypoints use identical camera parameters
                    pred_cam_t_full = cam_crop_to_full(
                        pred_cam, 
                        box_center, 
                        box_size, 
                        img_size, 
                        scaled_focal_length
                    ).detach().cpu().numpy()
                    
                    logger.info("[HMR2] ===== CAMERA CONVERSION (demo-style) =====")
                    logger.info("[HMR2] pred_cam (crop space): %s", pred_cam[0].cpu().numpy())
                    logger.info("[HMR2] box_center: %s", box_center[0].cpu().numpy())
                    logger.info("[HMR2] box_size: %.1f", box_size[0].cpu().numpy())
                    logger.info("[HMR2] img_size: %s", img_size[0].cpu().numpy())
                    logger.info("[HMR2] scaled_focal_length: %.1f", scaled_focal_length.cpu().numpy())
                    logger.info("[HMR2] pred_cam_t_full: %s", pred_cam_t_full[0])
                    
                    # Extract all outputs
                    pred_vertices = output['pred_vertices'][0].cpu().numpy()
                    pred_cam_t = output['pred_cam_t'][0].cpu().numpy()  # Original crop-space cam_t
                    
                    # Get 3D joints
                    joints_3d = None
                    if 'pred_keypoints_3d' in output:
                        joints_3d = output['pred_keypoints_3d'][0].cpu().numpy()
                    
                    # Get SMPL faces
                    smpl_faces = None
                    if hasattr(self.hmr2_model, 'smpl'):
                        smpl_faces = self.hmr2_model.smpl.faces.astype(np.int32)
                    
                    logger.info("[HMR2] ✓ Detection complete")
                    logger.info("[HMR2] Vertices: %s", pred_vertices.shape)
                    logger.info("[HMR2] Joints 3D: %s", joints_3d.shape if joints_3d is not None else None)
                    
                    return {
                        'vertices': pred_vertices,
                        'cam_t_full': pred_cam_t_full[0],  # Full image camera translation
                        'cam_t_crop': pred_cam_t,  # Crop space camera translation
                        'pred_cam': pred_cam[0].cpu().numpy(),  # Raw [s, tx, ty]
                        'joints_3d': joints_3d,
                        'faces': smpl_faces,
                        'box_center': box_center[0].cpu().numpy(),
                        'box_size': float(box_size[0].cpu().numpy()),
                        'img_size': img_size[0].cpu().numpy(),
                        'scaled_focal_length': float(scaled_focal_length.cpu().numpy()),
                        'focal_length': float(self.hmr2_cfg.EXTRA.FOCAL_LENGTH),
                        'model_image_size': int(self.hmr2_cfg.MODEL.IMAGE_SIZE),
                    }
            
            return None
            
        except Exception as e:
            logger.error("[HMR2] Error: %s", str(e), exc_info=True)
            return None

    def _project_vertices_to_2d(self, vertices, cam_t_full, focal_length, img_size):
        """
        Project 3D vertices to 2D using perspective projection.
        
        Uses the official 4D-Humans projection formula from demo.py.
        The camera translation cam_t_full = [tx, ty, tz] where:
        - tz is the depth (distance from camera)
        - tx, ty are camera center offsets
        
        Args:
            vertices: (N, 3) 3D vertices in SMPL space
            cam_t_full: (3,) camera translation [tx, ty, tz]
            focal_length: scaled focal length
            img_size: (2,) [width, height]
        
        Returns:
            (N, 2) 2D projected points in image pixels
        """
        # Use the official projection from 4D-Humans
        # This matches the Renderer class in hmr2/utils/renderer.py
        
        fx = fy = focal_length
        cx = img_size[0] / 2.0
        cy = img_size[1] / 2.0
        
        # Camera translation
        tx, ty, tz = cam_t_full[0], cam_t_full[1], cam_t_full[2]
        
        # Vertices in SMPL space
        x = vertices[:, 0]
        y = vertices[:, 1]
        z = vertices[:, 2]
        
        # Apply camera translation (shift vertices by camera position)
        # Then apply 180-degree rotation around X-axis (flip Y and Z)
        x_cam = x - tx
        y_cam = -(y - ty)  # Flip Y
        z_cam = -(z)       # Flip Z
        
        # Clamp z to avoid division by zero
        z_cam = np.maximum(z_cam, 0.01)
        
        # Perspective projection
        x_2d = fx * x_cam / z_cam + cx
        y_2d = fy * y_cam / z_cam + cy
        
        return np.stack([x_2d, y_2d], axis=1)
    
    def _compute_angles_from_3d(self, joints_3d):
        """Compute joint angles from 3D positions"""
        if joints_3d is None:
            return {}
        
        angles = {}
        
        def angle_3d(p1, p2, p3):
            """Angle at p2 in 3D space"""
            v1 = p1 - p2
            v2 = p3 - p2
            cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
            return float(np.degrees(np.arccos(np.clip(cos_angle, -1, 1))))
        
        try:
            # SMPL joint indices
            angles['left_knee'] = angle_3d(joints_3d[1], joints_3d[4], joints_3d[7])
            angles['right_knee'] = angle_3d(joints_3d[2], joints_3d[5], joints_3d[8])
            angles['left_hip'] = angle_3d(joints_3d[3], joints_3d[1], joints_3d[4])
            angles['right_hip'] = angle_3d(joints_3d[3], joints_3d[2], joints_3d[5])
            angles['left_elbow'] = angle_3d(joints_3d[16], joints_3d[18], joints_3d[20])
            angles['right_elbow'] = angle_3d(joints_3d[17], joints_3d[19], joints_3d[21])
            angles['left_shoulder'] = angle_3d(joints_3d[12], joints_3d[16], joints_3d[18])
            angles['right_shoulder'] = angle_3d(joints_3d[12], joints_3d[17], joints_3d[19])
            angles['spine'] = angle_3d(joints_3d[0], joints_3d[6], joints_3d[12])
        except Exception as e:
            print(f"[POSE] Angle computation error: {e}")
        
        return angles
    
    def detect_pose(self, image_base64: str, frame_number: int = 0) -> dict:
        """Detect pose using 4D-Humans (demo-style implementation)"""
        logger.info("=" * 80)
        logger.info("=== DETECT_POSE START (frame %d) ===", frame_number)
        logger.info("=" * 80)
        start_time = time.time()
        
        try:
            pil_image, image_np = self._decode_image(image_base64)
            h, w = image_np.shape[:2]
            logger.info("✓ Image decoded: %dx%d", w, h)
        except Exception as e:
            logger.error("✗ Failed to decode image: %s", str(e))
            return {'error': f'Failed to decode image: {str(e)}', 'frame_number': frame_number}
        
        # Run HMR2 (demo-style)
        hmr2_result = self._run_hmr2_demo_style(image_np)
        self._last_hmr2_result = hmr2_result
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        result = {
            'frame_number': frame_number,
            'frame_width': w,
            'frame_height': h,
            'processing_time_ms': round(processing_time_ms, 2),
            'model_version': self.model_version,
            'has_3d': hmr2_result is not None,
        }
        
        if hmr2_result:
            joints_3d = hmr2_result.get('joints_3d')
            cam_t_full = hmr2_result.get('cam_t_full')
            scaled_focal = hmr2_result.get('scaled_focal_length')
            img_size = hmr2_result.get('img_size')
            
            # DEBUG: Log projection parameters
            logger.info("[PROJECTION] cam_t_full: %s", cam_t_full)
            logger.info("[PROJECTION] scaled_focal_length: %.1f", scaled_focal)
            logger.info("[PROJECTION] img_size: %s", img_size)
            if joints_3d is not None:
                logger.info("[PROJECTION] joints_3d sample (pelvis): %s", joints_3d[0])
            
            # Project joints to 2D using the demo-style projection
            keypoints = []
            if joints_3d is not None and cam_t_full is not None:
                joints_2d = self._project_vertices_to_2d(
                    joints_3d, cam_t_full, scaled_focal, img_size
                )
                logger.info("[PROJECTION] joints_2d sample (pelvis): %s", joints_2d[0])
                
                for i, name in enumerate(SMPL_JOINT_NAMES):
                    if i < len(joints_3d):
                        keypoints.append({
                            'name': name,
                            'x': float(joints_2d[i, 0]),
                            'y': float(joints_2d[i, 1]),
                            'z': float(joints_3d[i, 2]),
                            'x_3d': float(joints_3d[i, 0]),
                            'y_3d': float(joints_3d[i, 1]),
                            'z_3d': float(joints_3d[i, 2]),
                            'confidence': 1.0
                        })
            
            result['keypoints'] = keypoints
            result['keypoint_count'] = len(keypoints)
            result['joints_3d_raw'] = joints_3d.tolist() if joints_3d is not None else None
            result['joint_angles_3d'] = self._compute_angles_from_3d(joints_3d)
            result['camera_translation'] = cam_t_full.tolist() if cam_t_full is not None else None
            result['scaled_focal_length'] = scaled_focal
            
            # Mesh data
            vertices = hmr2_result.get('vertices')
            faces = hmr2_result.get('faces')
            if vertices is not None:
                result['mesh_vertices'] = vertices.shape[0]
                result['mesh_vertices_data'] = vertices.tolist()
            if faces is not None:
                result['mesh_faces_data'] = faces.tolist()
        else:
            result['keypoints'] = []
            result['keypoint_count'] = 0
            result['error'] = 'HMR2 detection failed'
        
        logger.info("=== DETECT_POSE END (frame %d) ===", frame_number)
        logger.info("Keypoints: %d, Has 3D: %s, Time: %.0fms", 
                   result.get('keypoint_count', 0), result.get('has_3d'), processing_time_ms)
        
        return result
    
    def detect_pose_with_visualization(self, image_base64: str, frame_number: int = 0) -> dict:
        """
        Detect pose and render visualization with mesh overlay.
        
        Uses the exact rendering from 4D-Humans demo.py:
        - pyrender for proper 3D mesh rendering
        - cam_crop_to_full() for camera conversion
        - Perspective projection with scaled focal length
        """
        import cv2
        try:
            from mesh_renderer import SMPLMeshRenderer
        except ImportError as e:
            logger.error("[VIZ] Failed to import SMPLMeshRenderer: %s", str(e))
            SMPLMeshRenderer = None
        
        logger.info("[VIZ] ===== VISUALIZATION (demo-style) frame %d =====", frame_number)
        
        # Get pose detection
        result = self.detect_pose(image_base64, frame_number)
        
        # Decode image for visualization
        try:
            image_data = base64.b64decode(image_base64)
            pil_image = Image.open(io.BytesIO(image_data))
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            image_np = np.array(pil_image)
            image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        except Exception as e:
            result['visualization_error'] = str(e)
            return result
        
        h, w = image_bgr.shape[:2]
        mesh_rendered = False
        
        # Render mesh using exact 4D-Humans pyrender approach
        logger.info("[VIZ] Mesh rendering check: SMPLMeshRenderer=%s, has_3d=%s, _last_hmr2_result=%s", 
                   SMPLMeshRenderer is not None, result.get('has_3d'), 
                   hasattr(self, '_last_hmr2_result') and self._last_hmr2_result is not None)
        
        if SMPLMeshRenderer and result.get('has_3d') and hasattr(self, '_last_hmr2_result') and self._last_hmr2_result:
            hmr2_result = self._last_hmr2_result
            
            try:
                vertices = hmr2_result.get('vertices')
                faces = hmr2_result.get('faces')
                cam_t_full = hmr2_result.get('cam_t_full')
                scaled_focal = hmr2_result.get('scaled_focal_length')
                
                logger.info("[VIZ] Mesh data check: vertices=%s, faces=%s, cam_t_full=%s, scaled_focal=%s",
                           vertices is not None, faces is not None, cam_t_full is not None, scaled_focal is not None)
                
                if vertices is not None and faces is not None and cam_t_full is not None:
                    logger.info("[VIZ] Rendering %d vertices with pyrender (exact 4D-Humans)", len(vertices))
                    logger.info("[VIZ] cam_t_full: %s", cam_t_full)
                    logger.info("[VIZ] scaled_focal: %.1f", scaled_focal)
                    
                    # Extract 2D keypoints for body bounds alignment
                    keypoints_2d = None
                    if result.get('keypoints') and len(result['keypoints']) > 0:
                        keypoints_2d = np.array([[kp['x'], kp['y']] for kp in result['keypoints']], dtype=np.float32)
                        logger.info("[VIZ] Using %d keypoints for body bounds alignment", len(keypoints_2d))
                    
                    # Use exact 4D-Humans renderer
                    renderer = SMPLMeshRenderer(focal_length=scaled_focal, img_size=256)
                    image_bgr = renderer.render_mesh_overlay(
                        image_bgr,
                        vertices,
                        faces,
                        cam_t_full,
                        focal_length=scaled_focal,
                        keypoints_2d=keypoints_2d,
                    )
                    
                    mesh_rendered = True
                    logger.info("[VIZ] ✓ Mesh rendered with pyrender")
                else:
                    logger.warning("[VIZ] Missing mesh data: vertices=%s, faces=%s, cam_t_full=%s",
                                  vertices is not None, faces is not None, cam_t_full is not None)
                    
            except Exception as e:
                logger.error("[VIZ] Mesh rendering failed: %s", str(e), exc_info=True)
        elif not SMPLMeshRenderer:
            logger.warning("[VIZ] SMPLMeshRenderer not available, skipping mesh rendering")
        else:
            logger.warning("[VIZ] Mesh rendering skipped: has_3d=%s, _last_hmr2_result=%s",
                          result.get('has_3d'), hasattr(self, '_last_hmr2_result') and self._last_hmr2_result is not None)
        
        result['mesh_rendered'] = mesh_rendered
        
        # Draw skeleton
        if result.get('keypoints') and len(result['keypoints']) > 0:
            kp_dict = {kp['name']: kp for kp in result['keypoints']}
            
            skeleton = [
                ('pelvis', 'spine1'), ('spine1', 'spine2'), ('spine2', 'spine3'), 
                ('spine3', 'neck'), ('neck', 'head'),
                ('spine3', 'left_collar'), ('left_collar', 'left_shoulder'),
                ('left_shoulder', 'left_elbow'), ('left_elbow', 'left_wrist'), ('left_wrist', 'left_hand'),
                ('spine3', 'right_collar'), ('right_collar', 'right_shoulder'),
                ('right_shoulder', 'right_elbow'), ('right_elbow', 'right_wrist'), ('right_wrist', 'right_hand'),
                ('pelvis', 'left_hip'), ('left_hip', 'left_knee'), 
                ('left_knee', 'left_ankle'), ('left_ankle', 'left_foot'),
                ('pelvis', 'right_hip'), ('right_hip', 'right_knee'),
                ('right_knee', 'right_ankle'), ('right_ankle', 'right_foot'),
            ]
            
            for start_name, end_name in skeleton:
                if start_name in kp_dict and end_name in kp_dict:
                    start = kp_dict[start_name]
                    end = kp_dict[end_name]
                    pt1 = (int(start['x']), int(start['y']))
                    pt2 = (int(end['x']), int(end['y']))
                    cv2.line(image_bgr, pt1, pt2, (0, 165, 255), 3, cv2.LINE_AA)
            
            for kp in result['keypoints']:
                x, y = int(kp['x']), int(kp['y'])
                cv2.circle(image_bgr, (x, y), 6, (0, 255, 255), -1, cv2.LINE_AA)
                cv2.circle(image_bgr, (x, y), 6, (0, 165, 255), 2, cv2.LINE_AA)
        
        # Info overlay
        cv2.rectangle(image_bgr, (10, 10), (350, 80), (0, 0, 0), -1)
        cv2.putText(image_bgr, "4D-Humans HMR2 (demo-style)", (20, 35), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 100, 255), 2)
        cv2.putText(image_bgr, f"Frame {frame_number + 1} | {result.get('keypoint_count', 0)} joints", 
                    (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        mesh_status = "MESH: YES" if mesh_rendered else "MESH: NO"
        cv2.putText(image_bgr, mesh_status, (250, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, 
                    (0, 255, 0) if mesh_rendered else (0, 0, 255), 1)
        
        # Joint angles
        angles = result.get('joint_angles_3d', {})
        if angles:
            cv2.rectangle(image_bgr, (w - 170, 10), (w - 10, 120), (0, 0, 0), -1)
            cv2.putText(image_bgr, "Joint Angles", (w - 160, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 191, 0), 1)
            y_pos = 50
            for name in ['left_knee', 'right_knee', 'spine']:
                if name in angles:
                    cv2.putText(image_bgr, f"{name}: {angles[name]:.0f}°", 
                                (w - 160, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                    y_pos += 20
        
        # Encode result
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        pil_result = Image.fromarray(image_rgb)
        buffer = io.BytesIO()
        pil_result.save(buffer, format='PNG')
        viz_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        result['visualization'] = f"data:image/png;base64,{viz_base64}"
        
        return result


# Singleton
_detector = None

def get_hybrid_detector(use_gpu=True):
    global _detector
    if _detector is None:
        _detector = HybridPoseDetector(use_gpu=use_gpu)
    return _detector
