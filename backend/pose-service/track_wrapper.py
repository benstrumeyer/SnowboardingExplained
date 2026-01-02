"""
Wrapper for 4D-Humans track.py

Calls track.py as a subprocess to process videos and extract pose/mesh data.
Returns results in the format expected by the backend.
"""

import subprocess
import json
import os
import sys
import tempfile
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import pickle
import numpy as np
import time

logger = logging.getLogger(__name__)

# Configure aggressive logging to both console and file
log_file = '/tmp/track_wrapper.log'
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

print(f"[TRACK_WRAPPER] Logging to: {log_file}")

class TrackWrapper:
    """Wrapper around 4D-Humans track.py"""
    
    def __init__(self, track_py_path: str = None, four_d_humans_root: str = None, job_log_file: str = None):
        """
        Initialize the track wrapper.
        
        Args:
            track_py_path: Path to track.py (default: /app/4D-Humans/track.py in container)
            four_d_humans_root: Root directory of 4D-Humans repo
            job_log_file: Optional file to write logs to (for job tracking)
        """
        if track_py_path is None:
            # Try container path first, then absolute path to ~/repos
            if os.path.exists('/app/4D-Humans/track.py'):
                track_py_path = '/app/4D-Humans/track.py'
            else:
                track_py_path = os.path.expanduser('~/repos/4D-Humans/track.py')
        
        if four_d_humans_root is None:
            # Try container path first, then absolute path to ~/repos
            if os.path.exists('/app/4D-Humans'):
                four_d_humans_root = '/app/4D-Humans'
            else:
                four_d_humans_root = os.path.expanduser('~/repos/4D-Humans')
        
        self.track_py_path = os.path.abspath(track_py_path)
        self.four_d_humans_root = os.path.abspath(four_d_humans_root)
        self.job_log_file = job_log_file
        
        logger.info(f"[TRACK_WRAPPER] Looking for track.py at {self.track_py_path}")
        logger.info(f"[TRACK_WRAPPER] 4D-Humans root at {self.four_d_humans_root}")
        
        if not os.path.exists(self.track_py_path):
            logger.warning(f"[TRACK_WRAPPER] track.py not found at {self.track_py_path}")
            logger.warning(f"[TRACK_WRAPPER] This will fail when processing videos")
        
        if not os.path.exists(self.four_d_humans_root):
            logger.warning(f"[TRACK_WRAPPER] 4D-Humans root not found at {self.four_d_humans_root}")
        
        logger.info(f"[TRACK_WRAPPER] Initialized with track.py at {self.track_py_path}")
    
    def process_video(self, video_path: str, output_dir: str = None, max_frames: int = None) -> Dict[str, Any]:
        """
        Process a video using track.py.
        
        Args:
            video_path: Path to input video file
            output_dir: Directory to save output (default: temp directory)
            max_frames: Maximum frames to process (optional)
        
        Returns:
            Dictionary with processed results
        """
        start_time = time.time()
        
        def log_msg(msg: str):
            """Log to both logger and job log file"""
            logger.info(msg)
            if self.job_log_file:
                try:
                    with open(self.job_log_file, 'a') as f:
                        f.write(msg + '\n')
                        f.flush()
                except Exception as e:
                    logger.error(f"Failed to write to job log file: {e}")
        
        log_msg("=" * 80)
        log_msg("[TRACK_WRAPPER] ===== VIDEO PROCESSING STARTED =====")
        log_msg("=" * 80)
        
        if not os.path.exists(video_path):
            log_msg(f"[TRACK_WRAPPER] VIDEO NOT FOUND: {video_path}")
            raise FileNotFoundError(f"Video not found: {video_path}")
        
        log_msg(f"[TRACK_WRAPPER] Video file exists: {video_path}")
        log_msg(f"[TRACK_WRAPPER] Video file size: {os.path.getsize(video_path) / (1024*1024):.2f} MB")
        
        # Create output directory if not specified
        if output_dir is None:
            output_dir = os.path.expanduser('~/videos/output')
            log_msg(f"[TRACK_WRAPPER] Created output directory: {output_dir}")
        
        os.makedirs(output_dir, exist_ok=True)
        log_msg(f"[TRACK_WRAPPER] Using output directory: {output_dir}")
        
        log_msg(f"[TRACK_WRAPPER] Processing video: {video_path}")
        log_msg(f"[TRACK_WRAPPER] Max frames: {max_frames if max_frames else 'unlimited'}")
        
        # Build command - exactly as it works in isolation
        venv_python = self.four_d_humans_root.replace('4D-Humans', '') + 'SnowboardingExplained/backend/pose-service/venv/bin/python'
        
        end_frame = max_frames if max_frames is not None else 999999
        
        cmd = [
            venv_python,
            self.track_py_path,
            f'video.source={video_path}',
            f'video.output_dir={output_dir}',
            f'phalp.end_frame={end_frame}',
            'hydra.run.dir=.',
            'hydra.output_subdir=null',
        ]
        
        log_msg(f"[TRACK_WRAPPER] Command: {' '.join(cmd)}")
        log_msg("[TRACK_WRAPPER] ===== STARTING SUBPROCESS =====")
        
        try:
            import os as os_module
            env = os_module.environ.copy()
            env['PYTHONUNBUFFERED'] = '1'
            
            subprocess_start = time.time()
            
            # Run with unbuffered output, streaming to logger
            process = subprocess.Popen(
                cmd,
                cwd=self.four_d_humans_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                env=env,
                bufsize=1,
                universal_newlines=True
            )
            
            log_msg(f"[TRACK_WRAPPER] Subprocess PID: {process.pid}")
            log_msg(f"[TRACK_WRAPPER] ===== TRACK.PY OUTPUT STREAM START =====")
            
            # Stream output line by line - CRITICAL: must flush after each line
            line_count = 0
            try:
                for line in process.stdout:
                    line = line.rstrip('\n\r')
                    if line:
                        log_msg(f"[TRACK.PY] {line}")
                        line_count += 1
                        # Flush after every line to ensure real-time visibility
                        if self.job_log_file:
                            try:
                                import os as os_flush
                                os_flush.fsync(open(self.job_log_file, 'a').fileno())
                            except:
                                pass
            except Exception as e:
                log_msg(f"[TRACK_WRAPPER] Error reading subprocess output: {e}")
            
            log_msg(f"[TRACK_WRAPPER] ===== TRACK.PY OUTPUT STREAM END (captured {line_count} lines) =====")
            
            process.wait()
            subprocess_duration = time.time() - subprocess_start
            
            log_msg(f"[TRACK_WRAPPER] Subprocess completed in {subprocess_duration:.2f} seconds")
            log_msg(f"[TRACK_WRAPPER] Return code: {process.returncode}")
            
            if process.returncode != 0:
                log_msg(f"[TRACK_WRAPPER] SUBPROCESS FAILED with return code {process.returncode}")
                raise RuntimeError(f"track.py failed with return code {process.returncode}")
            
            log_msg("[TRACK_WRAPPER] ===== SUBPROCESS SUCCESSFUL =====")
            
            # Parse output
            log_msg("[TRACK_WRAPPER] ===== PARSING OUTPUT =====")
            parse_start = time.time()
            results = self._parse_output(output_dir, video_path)
            parse_duration = time.time() - parse_start
            
            log_msg(f"[TRACK_WRAPPER] Output parsing completed in {parse_duration:.2f} seconds")
            log_msg(f"[TRACK_WRAPPER] Successfully processed {len(results.get('frames', []))} frames")
            
            total_duration = time.time() - start_time
            log_msg("=" * 80)
            log_msg(f"[TRACK_WRAPPER] ===== VIDEO PROCESSING COMPLETE =====")
            log_msg(f"[TRACK_WRAPPER] Total time: {total_duration:.2f} seconds")
            log_msg("=" * 80)
            
            return results
            
        except subprocess.TimeoutExpired:
            log_msg("[TRACK_WRAPPER] SUBPROCESS TIMEOUT - Processing exceeded 1 hour limit")
            raise RuntimeError("track.py processing timed out (1 hour limit)")
        except Exception as e:
            log_msg(f"[TRACK_WRAPPER] EXCEPTION OCCURRED: {type(e).__name__}: {e}")
            import traceback
            log_msg(f"[TRACK_WRAPPER] Traceback:\n{traceback.format_exc()}")
            raise
    
    def _parse_output(self, output_dir: str, video_path: str) -> Dict[str, Any]:
        """
        Parse the output from track.py and extract mesh data.
        
        track.py outputs PHALP results with mesh vertices and faces.
        This method extracts the 3D mesh coordinates and converts to frame format.
        
        Args:
            output_dir: Directory containing track.py output
            video_path: Original video path (for metadata)
        
        Returns:
            Dictionary with frames array containing mesh data for each frame
        """
        logger.info("[TRACK_WRAPPER] ===== PARSE OUTPUT START =====")
        frames = []
        
        logger.info(f"[TRACK_WRAPPER] Listing all files in output directory: {output_dir}")
        try:
            all_files = os.listdir(output_dir)
            logger.info(f"[TRACK_WRAPPER] Total files in output dir: {len(all_files)}")
            for f in all_files[:20]:
                logger.info(f"[TRACK_WRAPPER]   - {f}")
        except Exception as e:
            logger.error(f"[TRACK_WRAPPER] Error listing output directory: {e}")
        
        pkl_files = list(Path(output_dir).glob('*.pkl'))
        json_files = list(Path(output_dir).glob('*.json'))
        output_files = pkl_files + json_files
        
        logger.info(f"[TRACK_WRAPPER] Found {len(pkl_files)} .pkl files, {len(json_files)} .json files")
        
        if not output_files:
            logger.warning(f"[TRACK_WRAPPER] NO OUTPUT FILES FOUND in {output_dir}")
            return {
                'frames': [],
                'video_path': video_path,
                'output_dir': output_dir,
                'status': 'no_output'
            }
        
        for output_file in sorted(output_files):
            logger.info(f"[TRACK_WRAPPER] Processing: {output_file.name} ({os.path.getsize(output_file) / (1024*1024):.2f} MB)")
            
            try:
                if output_file.suffix == '.pkl':
                    with open(output_file, 'rb') as f:
                        data = pickle.load(f)
                    logger.info(f"[TRACK_WRAPPER] Loaded pickle, type: {type(data).__name__}")
                    converted = self._extract_mesh_from_phalp_output(data)
                    logger.info(f"[TRACK_WRAPPER] Extracted {len(converted)} frames with mesh data")
                    frames.extend(converted)
                
                elif output_file.suffix == '.json':
                    with open(output_file, 'r') as f:
                        data = json.load(f)
                    logger.info(f"[TRACK_WRAPPER] Loaded JSON, type: {type(data).__name__}")
                    converted = self._extract_mesh_from_phalp_output(data)
                    logger.info(f"[TRACK_WRAPPER] Extracted {len(converted)} frames with mesh data")
                    frames.extend(converted)
            
            except Exception as e:
                logger.error(f"[TRACK_WRAPPER] ERROR: {type(e).__name__}: {e}")
                import traceback
                logger.error(traceback.format_exc())
                continue
        
        logger.info(f"[TRACK_WRAPPER] Total frames with mesh: {len(frames)}")
        
        logger.info("[TRACK_WRAPPER] Reading video metadata...")
        try:
            import cv2
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            video_duration = total_frames / fps if fps > 0 else 0
            cap.release()
            logger.info(f"[TRACK_WRAPPER] Video: {total_frames} frames @ {fps} fps, {video_duration:.2f}s duration")
        except Exception as e:
            logger.error(f"[TRACK_WRAPPER] Error reading video metadata: {e}")
            fps = 30
            total_frames = len(frames)
            video_duration = total_frames / fps if fps > 0 else 0
        
        logger.info("[TRACK_WRAPPER] ===== PARSE OUTPUT COMPLETE =====")
        
        return {
            'frames': frames,
            'video_path': video_path,
            'output_dir': output_dir,
            'fps': fps,
            'total_frames': total_frames,
            'video_duration': video_duration,
            'frame_count': len(frames),
            'status': 'complete'
        }
    
    def _extract_mesh_from_phalp_output(self, data: Any) -> List[Dict[str, Any]]:
        """
        Extract mesh vertices and faces from PHALP track.py output.
        
        PHALP outputs tracklets with SMPL mesh data for each person/frame.
        This extracts the 3D mesh coordinates in the format expected by frontend.
        
        PHALP output structure:
        - Dict with frame names as keys (e.g., "frame_0000", "frame_0001")
        - Each frame contains tracklet data with vertices, faces, SMPL params, etc.
        
        Args:
            data: PHALP output (dict or list)
        
        Returns:
            List of frame dictionaries with mesh data
        """
        frames = []
        frame_idx = 0
        
        logger.info(f"[TRACK_WRAPPER] _extract_mesh_from_phalp_output: data type = {type(data).__name__}")
        
        if isinstance(data, dict):
            logger.info(f"[TRACK_WRAPPER] Processing dict with {len(data)} keys")
            
            # PHALP typically outputs dict with frame names as keys
            # Try to sort by frame number if keys are like "frame_0000"
            try:
                sorted_keys = sorted(data.keys(), key=lambda x: int(x.split('_')[-1]) if '_' in str(x) else 0)
            except:
                sorted_keys = sorted(data.keys())
            
            logger.info(f"[TRACK_WRAPPER] First 5 keys: {sorted_keys[:5]}")
            
            for key in sorted_keys:
                tracklet_data = data[key]
                logger.info(f"[TRACK_WRAPPER] Processing frame key '{key}': type={type(tracklet_data).__name__}")
                
                if isinstance(tracklet_data, dict):
                    frame = self._build_frame_from_tracklet(frame_idx, tracklet_data, key)
                    if frame:
                        frames.append(frame)
                        frame_idx += 1
                elif isinstance(tracklet_data, list):
                    # Frame contains list of persons
                    for person_idx, person_data in enumerate(tracklet_data):
                        frame = self._build_frame_from_tracklet(frame_idx, person_data, f"{key}_person_{person_idx}")
                        if frame:
                            frames.append(frame)
                            frame_idx += 1
        
        elif isinstance(data, list):
            logger.info(f"[TRACK_WRAPPER] Processing list with {len(data)} items")
            for idx, item in enumerate(data):
                if isinstance(item, dict):
                    frame = self._build_frame_from_tracklet(frame_idx, item, f"item_{idx}")
                    if frame:
                        frames.append(frame)
                        frame_idx += 1
        
        logger.info(f"[TRACK_WRAPPER] Extracted {len(frames)} frames with mesh data")
        return frames
    
    def _build_frame_from_tracklet(self, frame_idx: int, tracklet: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Build frame data from PHALP tracklet with mesh information.
        
        Args:
            frame_idx: Frame index
            tracklet: PHALP tracklet data with vertices, faces, etc.
        
        Returns:
            Frame dictionary with mesh data or None
        """
        try:
            vertices = tracklet.get('vertices', [])
            faces = tracklet.get('faces', [])
            
            if isinstance(vertices, np.ndarray):
                vertices = vertices.tolist()
            if isinstance(faces, np.ndarray):
                faces = faces.tolist()
            
            frame = {
                'frameNumber': frame_idx,
                'timestamp': tracklet.get('timestamp', frame_idx / 30.0),
                'confidence': tracklet.get('confidence', 1.0),
                'keypoints': tracklet.get('keypoints', []),
                'joints3D': tracklet.get('joints_3d', []),
                'jointAngles': tracklet.get('joint_angles', {}),
                'has3D': True,
                'meshRendered': True,
                'vertices': vertices,
                'faces': faces,
                'tracked': tracklet.get('tracked', True),
                'personId': tracklet.get('person_id', 0),
            }
            
            return frame
        
        except Exception as e:
            logger.warning(f"[TRACK_WRAPPER] Error building frame from tracklet: {e}")
            return None


def process_video_with_track(video_path: str, output_dir: str = None, max_frames: int = None, job_log_file: str = None) -> Dict[str, Any]:
    """
    Convenience function to process a video using track.py.
    
    Args:
        video_path: Path to input video
        output_dir: Output directory (optional)
        max_frames: Maximum frames to process (optional)
        job_log_file: Optional file to write logs to
    
    Returns:
        Dictionary with results
    """
    wrapper = TrackWrapper(job_log_file=job_log_file)
    return wrapper.process_video(video_path, output_dir, max_frames)
