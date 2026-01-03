#!/usr/bin/env python3
"""
Pickle Parser - Extract PHALP output to JSON format

This script loads a PHALP pickle file and extracts frame data with proper
3D→Three.js coordinate transformation using camera parameters from pose-service.

Usage:
    python pickle_parser.py /path/to/results.pkl

Output:
    JSON to stdout with frame data
"""

import sys
import json
import pickle
import numpy as np
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def cam_crop_to_full(cam_bbox, box_center, box_size, img_size, focal_length=5000.):
    """
    Convert camera parameters from crop space to full image space.
    
    This is the EXACT function from 4D-Humans/hmr2/utils/renderer.py
    Ported to numpy for use in pickle parser.
    
    Args:
        cam_bbox: (3,) array with [s, tx, ty] in crop space
        box_center: (2,) array with crop center in image pixels
        box_size: scalar with crop size in pixels
        img_size: (2,) array with [width, height] of full image
        focal_length: focal length for perspective projection
    
    Returns:
        (3,) array with [tx, ty, tz] camera translation in full image space
    """
    img_w, img_h = img_size[0], img_size[1]
    cx, cy, b = box_center[0], box_center[1], box_size
    w_2, h_2 = img_w / 2., img_h / 2.
    bs = b * cam_bbox[0] + 1e-9
    tz = 2 * focal_length / bs
    tx = (2 * (cx - w_2) / bs) + cam_bbox[1]
    ty = (2 * (cy - h_2) / bs) + cam_bbox[2]
    full_cam = np.array([tx, ty, tz])
    return full_cam


def apply_mesh_transformation(vertices):
    """
    Apply 180° X-axis rotation to mesh vertices for Three.js compatibility.
    
    From mesh_renderer.py:
    - 180° rotation around X-axis: flip Y and Z coordinates
    
    Args:
        vertices: (V, 3) array with [x, y, z] coordinates
    
    Returns:
        (V, 3) array with transformed vertices
    """
    vertices_transformed = vertices.copy()
    
    # 180° rotation around X-axis: flip Y and Z
    vertices_transformed[:, 1] *= -1.0  # Flip Y
    vertices_transformed[:, 2] *= -1.0  # Flip Z
    
    logger.debug(f"[TRANSFORM] Applied 180° X-axis rotation to {len(vertices)} vertices")
    
    return vertices_transformed


def apply_camera_transformation(cam_t_full):
    """
    Apply X-component flip for Three.js compatibility.
    
    From mesh_renderer.py:
    - X-component flip: camera_translation_adjusted[0] *= -1.0
    
    Args:
        cam_t_full: (3,) array with [tx, ty, tz]
    
    Returns:
        (3,) array with transformed camera translation
    """
    cam_adjusted = cam_t_full.copy()
    
    # Flip X component (from mesh_renderer.py line: camera_translation_adjusted[0] *= -1.0)
    cam_adjusted[0] *= -1.0
    
    logger.debug(f"[TRANSFORM] Applied X-component flip: {cam_t_full[0]} -> {cam_adjusted[0]}")
    
    return cam_adjusted


def parse_pickle_file(pkl_path):
    """
    Parse PHALP pickle file and extract frame data.
    
    Args:
        pkl_path: Path to pickle file
    
    Returns:
        dict with frames array and metadata
    """
    logger.info(f"[PARSING] Loading pickle file: {pkl_path}")
    
    try:
        with open(pkl_path, 'rb') as f:
            data = pickle.load(f)
    except Exception as e:
        logger.error(f"[PARSING] ✗ Failed to load pickle: {e}")
        return None
    
    logger.info(f"[PARSING] ✓ Pickle loaded, type: {type(data)}")
    
    # PHALP output structure varies, try common formats
    frames_data = []
    
    if isinstance(data, dict):
        # Try common PHALP dict keys
        if 'frames' in data:
            frames_list = data['frames']
        elif 'results' in data:
            frames_list = data['results']
        elif 'predictions' in data:
            frames_list = data['predictions']
        else:
            # Assume dict values are frames
            frames_list = list(data.values())
        
        logger.info(f"[PARSING] Found {len(frames_list)} frames in dict")
        
        for frame_idx, frame_data in enumerate(frames_list):
            try:
                frame_obj = parse_frame(frame_data, frame_idx)
                if frame_obj:
                    frames_data.append(frame_obj)
            except Exception as e:
                logger.warning(f"[PARSING] ⚠ Failed to parse frame {frame_idx}: {e}")
                continue
    
    elif isinstance(data, list):
        logger.info(f"[PARSING] Found {len(data)} frames in list")
        
        for frame_idx, frame_data in enumerate(data):
            try:
                frame_obj = parse_frame(frame_data, frame_idx)
                if frame_obj:
                    frames_data.append(frame_obj)
            except Exception as e:
                logger.warning(f"[PARSING] ⚠ Failed to parse frame {frame_idx}: {e}")
                continue
    
    else:
        logger.error(f"[PARSING] ✗ Unexpected pickle structure: {type(data)}")
        return None
    
    logger.info(f"[PARSING] ✓ Successfully parsed {len(frames_data)} frames")
    
    return {
        'frames': frames_data,
        'frameCount': len(frames_data),
        'metadata': {
            'parserVersion': '1.0',
            'timestamp': str(np.datetime64('now'))
        }
    }


def parse_frame(frame_data, frame_idx):
    """
    Parse a single frame from PHALP output.
    
    Args:
        frame_data: Frame data (dict or object)
        frame_idx: Frame index
    
    Returns:
        dict with frame information or None if parsing fails
    """
    if not isinstance(frame_data, dict):
        return None
    
    frame_obj = {
        'frameNumber': frame_idx,
        'timestamp': frame_idx / 30.0,  # Assume 30 FPS
        'persons': []
    }
    
    # Extract person detections
    # PHALP typically stores: track_id, vertices, faces, camera, etc.
    
    # Try to extract vertices and faces
    vertices = None
    faces = None
    camera = None
    
    if 'vertices' in frame_data:
        vertices = np.array(frame_data['vertices'], dtype=np.float32)
    elif 'pred_vertices' in frame_data:
        vertices = np.array(frame_data['pred_vertices'], dtype=np.float32)
    
    if 'faces' in frame_data:
        faces = np.array(frame_data['faces'], dtype=np.int32)
    elif 'pred_faces' in frame_data:
        faces = np.array(frame_data['pred_faces'], dtype=np.int32)
    
    # Extract camera parameters
    if 'camera' in frame_data:
        camera = frame_data['camera']
    elif 'pred_cam' in frame_data:
        camera = frame_data['pred_cam']
    
    # Build person object
    person_obj = {
        'personId': frame_data.get('track_id', 0),
        'confidence': float(frame_data.get('confidence', 1.0)),
        'tracked': frame_data.get('tracked', True)
    }
    
    # Add mesh data with transformation if available
    if vertices is not None:
        # Apply 180° X-axis rotation to vertices for Three.js
        vertices_transformed = apply_mesh_transformation(vertices)
        person_obj['meshVertices'] = vertices_transformed.tolist()
        person_obj['meshVertexCount'] = len(vertices_transformed)
    
    if faces is not None:
        person_obj['meshFaces'] = faces.tolist()
        person_obj['meshFaceCount'] = len(faces)
    
    # Add camera data with transformation
    if camera is not None:
        try:
            cam_array = np.array(camera, dtype=np.float32)
            
            # Apply camera transformation (X-component flip)
            cam_transformed = apply_camera_transformation(cam_array)
            
            person_obj['camera'] = {
                'tx': float(cam_transformed[0]),
                'ty': float(cam_transformed[1]),
                'tz': float(cam_transformed[2]),
                'focalLength': 5000.0  # Default, may be overridden
            }
            
            logger.debug(f"[TRANSFORM] Frame {frame_idx}: camera {cam_array} -> {cam_transformed}")
        except Exception as e:
            logger.warning(f"[TRANSFORM] ⚠ Failed to transform camera for frame {frame_idx}: {e}")
    
    frame_obj['persons'].append(person_obj)
    
    return frame_obj


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        logger.error("[MAIN] Usage: python pickle_parser.py <pkl_path>")
        sys.exit(1)
    
    pkl_path = sys.argv[1]
    
    logger.info(f"[MAIN] ========================================")
    logger.info(f"[MAIN] Pickle Parser v1.0")
    logger.info(f"[MAIN] Input: {pkl_path}")
    logger.info(f"[MAIN] ========================================")
    
    result = parse_pickle_file(pkl_path)
    
    if result is None:
        logger.error("[MAIN] ✗ Failed to parse pickle file")
        sys.exit(1)
    
    # Output JSON to stdout
    try:
        json_output = json.dumps(result, indent=2)
        print(json_output)
        logger.info(f"[MAIN] ✓ Output {len(result['frames'])} frames to stdout")
    except Exception as e:
        logger.error(f"[MAIN] ✗ Failed to serialize JSON: {e}")
        sys.exit(1)
    
    logger.info(f"[MAIN] ========================================")
    logger.info(f"[MAIN] ✓ Pickle parsing complete")
    logger.info(f"[MAIN] ========================================")


if __name__ == '__main__':
    main()
