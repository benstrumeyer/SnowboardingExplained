#!/usr/bin/env python3
"""
Pickle Parser - Extract PHALP output to JSON format

This script loads a PHALP pickle file and extracts frame data.
Computes mesh vertices from SMPL parameters using the SMPL model.

Usage:
    python pickle_parser.py /path/to/results.pkl

Output:
    JSON to stdout with frame data
"""

import sys
import json
import pickle
import logging
import gzip
import bz2
import zlib
import io
import numpy as np
import torch

logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import joblib
    HAS_JOBLIB = True
except ImportError:
    HAS_JOBLIB = False
    logger.warning("[INIT] joblib not available, will skip joblib decompression")

try:
    from smplx import SMPLLayer
    HAS_SMPLX = True
    logger.info("[INIT] smplx available for SMPL vertex computation")
except ImportError:
    HAS_SMPLX = False
    logger.warning("[INIT] smplx not available, will skip vertex computation")

SMPL_MODEL = None

def get_smpl_model():
    """Lazy load SMPL model"""
    global SMPL_MODEL
    if SMPL_MODEL is not None:
        return SMPL_MODEL
    
    if not HAS_SMPLX:
        logger.warning("[SMPL] smplx not available")
        return None
    
    try:
        import os
        model_path = os.path.expanduser('~/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0_p3.pkl')
        if not os.path.exists(model_path):
            model_path = os.path.expanduser('~/pose-service/basicmodel_m_lbs_10_207_0_v1.1.0.pkl')
        
        if not os.path.exists(model_path):
            logger.warning(f"[SMPL] Model file not found at {model_path}")
            return None
        
        logger.info(f"[SMPL] Loading SMPL model from {model_path}")
        SMPL_MODEL = SMPLLayer(model_path=model_path, gender='male')
        logger.info("[SMPL] ✓ SMPL model loaded")
        return SMPL_MODEL
    
    except Exception as e:
        logger.error(f"[SMPL] Failed to load SMPL model: {e}")
        return None


def get_smpl_faces():
    """Get SMPL face indices (triangles) - these are static"""
    smpl_model = get_smpl_model()
    if smpl_model is None:
        logger.debug("[PARSE] SMPL model not available, cannot get faces")
        return None
    
    try:
        faces = smpl_model.faces
        if isinstance(faces, torch.Tensor):
            faces = faces.cpu().numpy()
        logger.debug(f"[PARSE] Got {len(faces)} SMPL faces")
        return faces
    except Exception as e:
        logger.debug(f"[PARSE] Failed to get SMPL faces: {e}")
        return None


def compute_smpl_vertices(smpl_params):
    """
    Compute mesh vertices from SMPL parameters using SMPL model.
    
    Args:
        smpl_params: dict with 'global_orient', 'body_pose', 'betas'
    
    Returns:
        (V, 3) array of vertices or None if computation fails
    """
    smpl_model = get_smpl_model()
    if smpl_model is None:
        logger.debug("[PARSE] SMPL model not available, skipping vertex computation")
        return None
    
    try:
        global_orient = smpl_params.get('global_orient')
        body_pose = smpl_params.get('body_pose')
        betas = smpl_params.get('betas')
        
        if global_orient is None or body_pose is None or betas is None:
            logger.debug("[PARSE] Missing SMPL parameters for vertex computation")
            return None
        
        global_orient = torch.tensor(np.array(global_orient).reshape(1, 3, 3), dtype=torch.float32)
        body_pose = torch.tensor(np.array(body_pose).reshape(1, 23, 3, 3), dtype=torch.float32)
        betas = torch.tensor(np.array(betas).reshape(1, 10), dtype=torch.float32)
        
        with torch.no_grad():
            output = smpl_model(
                global_orient=global_orient,
                body_pose=body_pose,
                betas=betas
            )
        
        vertices = output.vertices[0].cpu().numpy()
        logger.debug(f"[PARSE] Computed {len(vertices)} vertices from SMPL")
        return vertices
    
    except Exception as e:
        logger.debug(f"[PARSE] Failed to compute SMPL vertices: {e}")
        return None


def parse_pickle_file(pkl_path):
    """
    Parse PHALP pickle file and extract frame data.
    Handles joblib, gzip, bz2, zlib, and uncompressed pickle files.
    
    Args:
        pkl_path: Path to pickle file
    
    Returns:
        dict with frames array and metadata
    """
    logger.info(f"[PARSING] Loading pickle file: {pkl_path}")
    
    data = None
    
    if HAS_JOBLIB:
        try:
            data = joblib.load(pkl_path)
            logger.info(f"[PARSING] ✓ Successfully loaded with joblib")
        except Exception as e:
            logger.debug(f"[PARSING] ⚠ joblib failed: {e}")
            data = None
    
    if data is None:
        try:
            with open(pkl_path, 'rb') as f:
                compressed_data = f.read()
            decompressed = zlib.decompress(compressed_data)
            data = pickle.loads(decompressed, encoding='latin1')
            logger.info(f"[PARSING] ✓ Successfully loaded as zlib compressed")
        except Exception as e:
            logger.debug(f"[PARSING] ⚠ Not zlib format: {e}")
            data = None
    
    if data is None:
        try:
            with gzip.open(pkl_path, 'rb') as f:
                data = pickle.load(f, encoding='latin1')
            logger.info(f"[PARSING] ✓ Successfully loaded as gzip")
        except Exception as e:
            logger.debug(f"[PARSING] ⚠ Not gzip format: {e}")
            data = None
    
    if data is None:
        try:
            with bz2.open(pkl_path, 'rb') as f:
                data = pickle.load(f, encoding='latin1')
            logger.info(f"[PARSING] ✓ Successfully loaded as bz2")
        except Exception as e:
            logger.debug(f"[PARSING] ⚠ Not bz2 format: {e}")
            data = None
    
    if data is None:
        try:
            with open(pkl_path, 'rb') as f:
                data = pickle.load(f, encoding='latin1')
            logger.info(f"[PARSING] ✓ Successfully loaded as regular pickle (latin1)")
        except Exception as e:
            logger.error(f"[PARSING] ✗ Failed to load pickle with latin1: {e}")
            try:
                with open(pkl_path, 'rb') as f:
                    data = pickle.load(f, encoding='utf-8')
                logger.info(f"[PARSING] ✓ Successfully loaded as regular pickle (utf-8)")
            except Exception as e2:
                logger.error(f"[PARSING] ✗ Failed to load pickle with utf-8: {e2}")
                try:
                    with open(pkl_path, 'rb') as f:
                        data = pickle.load(f)
                    logger.info(f"[PARSING] ✓ Successfully loaded as regular pickle (default)")
                except Exception as e3:
                    logger.error(f"[PARSING] ✗ Failed to load pickle with default encoding: {e3}")
                    return None
    
    logger.info(f"[PARSING] ✓ Pickle loaded, type: {type(data)}")
    
    smpl_faces = get_smpl_faces()
    
    frames_data = []
    
    if isinstance(data, dict):
        if 'frames' in data:
            frames_list = data['frames']
        elif 'results' in data:
            frames_list = data['results']
        elif 'predictions' in data:
            frames_list = data['predictions']
        else:
            frames_list = list(data.values())
        
        logger.info(f"[PARSING] Found {len(frames_list)} frames in dict")
        
        for frame_idx, frame_data in enumerate(frames_list):
            try:
                frame_obj = parse_frame(frame_data, frame_idx, smpl_faces)
                if frame_obj:
                    frames_data.append(frame_obj)
            except Exception as e:
                logger.warning(f"[PARSING] ⚠ Failed to parse frame {frame_idx}: {e}")
                continue
    
    elif isinstance(data, list):
        logger.info(f"[PARSING] Found {len(data)} frames in list")
        
        for frame_idx, frame_data in enumerate(data):
            try:
                frame_obj = parse_frame(frame_data, frame_idx, smpl_faces)
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
            'parserVersion': '1.0'
        }
    }


def get_smpl_faces():
    """Get SMPL face indices (triangles) - these are static"""
    smpl_model = get_smpl_model()
    if smpl_model is None:
        logger.debug("[PARSE] SMPL model not available, cannot get faces")
        return None
    
    try:
        faces = smpl_model.faces
        if isinstance(faces, torch.Tensor):
            faces = faces.cpu().numpy()
        logger.debug(f"[PARSE] Got {len(faces)} SMPL faces")
        return faces
    except Exception as e:
        logger.debug(f"[PARSE] Failed to get SMPL faces: {e}")
        return None
    """
    Compute mesh vertices from SMPL parameters using SMPL model.
    
    Args:
        smpl_params: dict with 'global_orient', 'body_pose', 'betas'
    
    Returns:
        (V, 3) array of vertices or None if computation fails
    """
    smpl_model = get_smpl_model()
    if smpl_model is None:
        logger.debug("[PARSE] SMPL model not available, skipping vertex computation")
        return None
    
    try:
        global_orient = smpl_params.get('global_orient')
        body_pose = smpl_params.get('body_pose')
        betas = smpl_params.get('betas')
        
        if global_orient is None or body_pose is None or betas is None:
            logger.debug("[PARSE] Missing SMPL parameters for vertex computation")
            return None
        
        global_orient = torch.tensor(np.array(global_orient).reshape(1, 3), dtype=torch.float32)
        body_pose = torch.tensor(np.array(body_pose).reshape(1, 69), dtype=torch.float32)
        betas = torch.tensor(np.array(betas).reshape(1, 10), dtype=torch.float32)
        
        with torch.no_grad():
            output = smpl_model(
                global_orient=global_orient,
                body_pose=body_pose,
                betas=betas
            )
        
        vertices = output.vertices[0].cpu().numpy()
        logger.debug(f"[PARSE] Computed {len(vertices)} vertices from SMPL")
        return vertices
    
    except Exception as e:
        logger.debug(f"[PARSE] Failed to compute SMPL vertices: {e}")
        return None


def parse_frame(frame_data, frame_idx, smpl_faces=None):
    """
    Parse a single frame from PHALP output.
    PHALP format: dict with lists of data (multiple people per frame)
    
    Args:
        frame_data: Frame data (dict)
        frame_idx: Frame index
        smpl_faces: SMPL face indices (optional, cached from model)
    
    Returns:
        dict with frame information or None if parsing fails
    """
    if not isinstance(frame_data, dict):
        return None
    
    frame_obj = {
        'frameNumber': frame_idx,
        'timestamp': frame_idx / 30.0,
        'persons': []
    }
    
    smpl_list = frame_data.get('smpl', [])
    camera_list = frame_data.get('camera', [])
    conf_list = frame_data.get('conf', [])
    tid_list = frame_data.get('tid', [])
    verts_list = frame_data.get('verts', [])
    faces_list = frame_data.get('faces', [])
    
    num_people = len(smpl_list)
    
    for person_idx in range(num_people):
        person_obj = {
            'personId': tid_list[person_idx] if person_idx < len(tid_list) else person_idx,
            'confidence': float(conf_list[person_idx]) if person_idx < len(conf_list) else 1.0,
            'tracked': True
        }
        
        if person_idx < len(camera_list):
            try:
                cam = camera_list[person_idx]
                cam_list = cam if isinstance(cam, list) else cam.tolist()
                if len(cam_list) >= 3:
                    person_obj['camera'] = {
                        'tx': float(cam_list[0]),
                        'ty': float(cam_list[1]),
                        'tz': float(cam_list[2]),
                        'focalLength': 5000.0
                    }
            except Exception as e:
                logger.debug(f"[PARSE] Frame {frame_idx} person {person_idx}: camera parse failed: {e}")
        
        if person_idx < len(smpl_list):
            try:
                smpl = smpl_list[person_idx]
                smpl_obj = {}
                
                if 'global_orient' in smpl:
                    go = smpl['global_orient']
                    smpl_obj['globalOrient'] = go.tolist() if hasattr(go, 'tolist') else go
                
                if 'body_pose' in smpl:
                    bp = smpl['body_pose']
                    smpl_obj['bodyPose'] = bp.tolist() if hasattr(bp, 'tolist') else bp
                
                if 'betas' in smpl:
                    betas = smpl['betas']
                    smpl_obj['betas'] = betas.tolist() if hasattr(betas, 'tolist') else betas
                
                if smpl_obj:
                    person_obj['smpl'] = smpl_obj
                    
                    vertices = compute_smpl_vertices(smpl)
                    if vertices is not None:
                        person_obj['meshVertices'] = vertices.tolist()
                        logger.debug(f"[PARSE] Frame {frame_idx} person {person_idx}: computed {len(vertices)} vertices")
            
            except Exception as e:
                logger.debug(f"[PARSE] Frame {frame_idx} person {person_idx}: SMPL parse failed: {e}")
        
        if person_idx < len(verts_list):
            try:
                verts = verts_list[person_idx]
                verts_list_data = verts.tolist() if hasattr(verts, 'tolist') else verts
                person_obj['meshVertices'] = verts_list_data
                logger.debug(f"[PARSE] Frame {frame_idx} person {person_idx}: extracted {len(verts_list_data)} vertices from PHALP")
            except Exception as e:
                logger.debug(f"[PARSE] Frame {frame_idx} person {person_idx}: vertices parse failed: {e}")
        
        if smpl_faces is not None:
            try:
                faces_data = smpl_faces.tolist() if hasattr(smpl_faces, 'tolist') else smpl_faces
                person_obj['meshFaces'] = faces_data
                logger.debug(f"[PARSE] Frame {frame_idx} person {person_idx}: using {len(faces_data)} SMPL faces")
            except Exception as e:
                logger.debug(f"[PARSE] Frame {frame_idx} person {person_idx}: faces assignment failed: {e}")
        
        elif faces_list:
            try:
                faces = faces_list[0] if isinstance(faces_list, list) and len(faces_list) > 0 else faces_list
                faces_data = faces.tolist() if hasattr(faces, 'tolist') else faces
                person_obj['meshFaces'] = faces_data
                logger.debug(f"[PARSE] Frame {frame_idx} person {person_idx}: extracted {len(faces_data)} faces")
            except Exception as e:
                logger.debug(f"[PARSE] Frame {frame_idx} person {person_idx}: faces parse failed: {e}")
        
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
