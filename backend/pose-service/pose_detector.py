"""
MediaPipe Pose Detection Module
Detects 33 skeletal keypoints from images
Uses the new MediaPipe Tasks API (0.10.31+)
"""

import base64
import io
import time
import numpy as np
from PIL import Image
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import urllib.request

# MediaPipe keypoint names (33 total)
KEYPOINT_NAMES = [
    'nose',
    'left_eye_inner', 'left_eye', 'left_eye_outer',
    'right_eye_inner', 'right_eye', 'right_eye_outer',
    'left_ear', 'right_ear',
    'mouth_left', 'mouth_right',
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_pinky', 'right_pinky',
    'left_index', 'right_index',
    'left_thumb', 'right_thumb',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle',
    'left_heel', 'right_heel',
    'left_foot_index', 'right_foot_index'
]

# Model URL - using "full" model for better accuracy on complex poses
# Options: lite (fastest), full (balanced), heavy (most accurate but slower)
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task"
MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker_full.task")


def download_model():
    """Download the pose landmarker model if not present"""
    if not os.path.exists(MODEL_PATH):
        print(f"[POSE] Downloading model from {MODEL_URL}...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print(f"[POSE] Model downloaded to {MODEL_PATH}")
    return MODEL_PATH


class PoseDetector:
    """MediaPipe Pose Detection wrapper using Tasks API"""
    
    def __init__(self):
        self.detector = None
        self.model_version = "mediapipe-0.10.31-tasks"
    
    def _lazy_load(self):
        """Lazy load the MediaPipe model on first use"""
        if self.detector is None:
            print("[POSE] Loading MediaPipe model...")
            start = time.time()
            try:
                model_path = download_model()
                
                base_options = python.BaseOptions(model_asset_path=model_path)
                # Very low thresholds for action sports - small subjects, fast movement, unusual poses
                options = vision.PoseLandmarkerOptions(
                    base_options=base_options,
                    output_segmentation_masks=False,
                    num_poses=1,
                    min_pose_detection_confidence=0.15,  # Very low for small/distant subjects
                    min_pose_presence_confidence=0.15,   # Very low for unusual poses
                    min_tracking_confidence=0.15         # Very low for fast movement
                )
                self.detector = vision.PoseLandmarker.create_from_options(options)
                print(f"[POSE] Model loaded in {(time.time() - start) * 1000:.0f}ms")
            except Exception as e:
                print(f"[POSE] ERROR loading model: {e}")
                import traceback
                traceback.print_exc()
                raise
    
    def detect_pose(self, image_base64: str, frame_number: int = 0) -> dict:
        """
        Detect pose keypoints from a base64 encoded image
        
        Args:
            image_base64: Base64 encoded PNG/JPG image
            frame_number: Optional frame number for logging
            
        Returns:
            dict with keypoints, frame dimensions, and processing time
        """
        start_time = time.time()
        
        # Lazy load model
        self._lazy_load()
        
        # Decode base64 image
        try:
            image_data = base64.b64decode(image_base64)
            pil_image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            original_width, original_height = pil_image.size
            frame_width, frame_height = original_width, original_height
            scale_factor = 1.0
            
            # Upscale small images for better detection of distant subjects
            # MediaPipe works best with images around 640-1280px
            MIN_DIMENSION = 640
            if min(original_width, original_height) < MIN_DIMENSION:
                scale_factor = MIN_DIMENSION / min(original_width, original_height)
                new_width = int(original_width * scale_factor)
                new_height = int(original_height * scale_factor)
                pil_image = pil_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                print(f"[POSE] Frame {frame_number}: Upscaled from {original_width}x{original_height} to {new_width}x{new_height}")
            
            # Convert to numpy array for MediaPipe
            image_np = np.array(pil_image)
            
            # Create MediaPipe Image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_np)
            
        except Exception as e:
            return {
                'error': f'Failed to decode image: {str(e)}',
                'frame_number': frame_number
            }
        
        # Run pose detection
        try:
            results = self.detector.detect(mp_image)
        except Exception as e:
            return {
                'error': f'Pose detection failed: {str(e)}',
                'frame_number': frame_number
            }
        
        # Extract keypoints
        keypoints = []
        
        # Debug: print what we got
        print(f"[POSE] Frame {frame_number}: Image size {frame_width}x{frame_height}")
        print(f"[POSE] Frame {frame_number}: pose_landmarks = {results.pose_landmarks}")
        
        if results.pose_landmarks and len(results.pose_landmarks) > 0:
            landmarks = results.pose_landmarks[0]  # First detected pose
            print(f"[POSE] Frame {frame_number}: Found {len(landmarks)} landmarks")
            
            # Get the scaled image dimensions for coordinate calculation
            scaled_width, scaled_height = pil_image.size
            
            for idx, landmark in enumerate(landmarks):
                # Calculate coordinates in scaled image space, then convert back to original
                scaled_x = landmark.x * scaled_width
                scaled_y = landmark.y * scaled_height
                
                # Convert back to original image coordinates
                original_x = scaled_x / scale_factor
                original_y = scaled_y / scale_factor
                
                keypoints.append({
                    'name': KEYPOINT_NAMES[idx] if idx < len(KEYPOINT_NAMES) else f'keypoint_{idx}',
                    'x': int(original_x),
                    'y': int(original_y),
                    'z': landmark.z,
                    'confidence': landmark.visibility if hasattr(landmark, 'visibility') else 1.0
                })
        else:
            print(f"[POSE] Frame {frame_number}: No pose detected")
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        return {
            'frame_number': frame_number,
            'frame_width': original_width,
            'frame_height': original_height,
            'keypoints': keypoints,
            'keypoint_count': len(keypoints),
            'processing_time_ms': round(processing_time_ms, 2),
            'model_version': self.model_version,
            'scale_factor': scale_factor
        }


# Singleton instance
_detector = None

def get_detector() -> PoseDetector:
    """Get or create the singleton PoseDetector instance"""
    global _detector
    if _detector is None:
        _detector = PoseDetector()
    return _detector
