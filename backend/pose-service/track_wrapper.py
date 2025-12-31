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

logger = logging.getLogger(__name__)

class TrackWrapper:
    """Wrapper around 4D-Humans track.py"""
    
    def __init__(self, track_py_path: str = None, four_d_humans_root: str = None):
        """
        Initialize the track wrapper.
        
        Args:
            track_py_path: Path to track.py (default: /app/4D-Humans/track.py in container)
            four_d_humans_root: Root directory of 4D-Humans repo
        """
        if track_py_path is None:
            # Try container path first, then relative path
            if os.path.exists('/app/4D-Humans/track.py'):
                track_py_path = '/app/4D-Humans/track.py'
            else:
                track_py_path = os.path.join(os.path.dirname(__file__), '../4D-Humans/track.py')
        
        if four_d_humans_root is None:
            # Try container path first, then relative path
            if os.path.exists('/app/4D-Humans'):
                four_d_humans_root = '/app/4D-Humans'
            else:
                four_d_humans_root = os.path.join(os.path.dirname(__file__), '../4D-Humans')
        
        self.track_py_path = os.path.abspath(track_py_path)
        self.four_d_humans_root = os.path.abspath(four_d_humans_root)
        
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
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found: {video_path}")
        
        # Create output directory if not specified
        if output_dir is None:
            output_dir = tempfile.mkdtemp(prefix='track_output_')
        else:
            os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"[TRACK_WRAPPER] Processing video: {video_path}")
        logger.info(f"[TRACK_WRAPPER] Output directory: {output_dir}")
        
        # Build command
        cmd = [
            sys.executable,
            self.track_py_path,
            f'video_path={video_path}',
            f'output_dir={output_dir}',
        ]
        
        if max_frames is not None:
            cmd.append(f'max_frames={max_frames}')
        
        logger.info(f"[TRACK_WRAPPER] Running command: {' '.join(cmd)}")
        
        try:
            # Run track.py
            result = subprocess.run(
                cmd,
                cwd=self.four_d_humans_root,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            logger.info(f"[TRACK_WRAPPER] Return code: {result.returncode}")
            
            if result.stdout:
                logger.info(f"[TRACK_WRAPPER] STDOUT:\n{result.stdout}")
            
            if result.stderr:
                logger.error(f"[TRACK_WRAPPER] STDERR:\n{result.stderr}")
            
            if result.returncode != 0:
                raise RuntimeError(f"track.py failed with return code {result.returncode}: {result.stderr}")
            
            # Parse output
            logger.info(f"[TRACK_WRAPPER] Parsing output from {output_dir}")
            results = self._parse_output(output_dir, video_path)
            
            logger.info(f"[TRACK_WRAPPER] Successfully processed {len(results.get('frames', []))} frames")
            
            return results
            
        except subprocess.TimeoutExpired:
            raise RuntimeError("track.py processing timed out (1 hour limit)")
        except Exception as e:
            logger.error(f"[TRACK_WRAPPER] Error: {e}")
            raise
    
    def _parse_output(self, output_dir: str, video_path: str) -> Dict[str, Any]:
        """
        Parse the output from track.py.
        
        track.py outputs results in various formats depending on configuration.
        This method extracts the pose/mesh data and converts to our format.
        
        Args:
            output_dir: Directory containing track.py output
            video_path: Original video path (for metadata)
        
        Returns:
            Dictionary with frames and metadata
        """
        frames = []
        
        # Look for output files (track.py typically outputs pickle or JSON files)
        output_files = list(Path(output_dir).glob('*.pkl')) + list(Path(output_dir).glob('*.json'))
        
        logger.info(f"[TRACK_WRAPPER] Found {len(output_files)} output files")
        
        if not output_files:
            logger.warning(f"[TRACK_WRAPPER] No output files found in {output_dir}")
            return {
                'frames': [],
                'video_path': video_path,
                'output_dir': output_dir,
                'status': 'no_output'
            }
        
        # Process each output file
        for output_file in sorted(output_files):
            logger.info(f"[TRACK_WRAPPER] Processing output file: {output_file}")
            
            try:
                if output_file.suffix == '.pkl':
                    with open(output_file, 'rb') as f:
                        data = pickle.load(f)
                    frames.extend(self._convert_pkl_to_frames(data))
                
                elif output_file.suffix == '.json':
                    with open(output_file, 'r') as f:
                        data = json.load(f)
                    frames.extend(self._convert_json_to_frames(data))
            
            except Exception as e:
                logger.error(f"[TRACK_WRAPPER] Error processing {output_file}: {e}")
                continue
        
        # Get video metadata
        import cv2
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_duration = total_frames / fps if fps > 0 else 0
        cap.release()
        
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
    
    def _convert_pkl_to_frames(self, data: Any) -> List[Dict[str, Any]]:
        """
        Convert pickle output from track.py to frame format.
        
        Args:
            data: Pickle data from track.py
        
        Returns:
            List of frame dictionaries
        """
        frames = []
        
        # track.py outputs a dictionary with frame data
        # Structure depends on PHALP configuration, but typically:
        # {
        #   'frame_id': {...pose/mesh data...},
        #   ...
        # }
        
        if isinstance(data, dict):
            for frame_id, frame_data in sorted(data.items()):
                frame = self._extract_frame_data(frame_id, frame_data)
                if frame:
                    frames.append(frame)
        
        elif isinstance(data, list):
            for idx, frame_data in enumerate(data):
                frame = self._extract_frame_data(idx, frame_data)
                if frame:
                    frames.append(frame)
        
        return frames
    
    def _convert_json_to_frames(self, data: Any) -> List[Dict[str, Any]]:
        """
        Convert JSON output from track.py to frame format.
        
        Args:
            data: JSON data from track.py
        
        Returns:
            List of frame dictionaries
        """
        frames = []
        
        if isinstance(data, dict) and 'frames' in data:
            for idx, frame_data in enumerate(data['frames']):
                frame = self._extract_frame_data(idx, frame_data)
                if frame:
                    frames.append(frame)
        
        elif isinstance(data, list):
            for idx, frame_data in enumerate(data):
                frame = self._extract_frame_data(idx, frame_data)
                if frame:
                    frames.append(frame)
        
        return frames
    
    def _extract_frame_data(self, frame_id: Any, frame_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract relevant data from a single frame.
        
        Args:
            frame_id: Frame identifier
            frame_data: Frame data dictionary
        
        Returns:
            Formatted frame dictionary or None
        """
        try:
            # Extract pose/mesh data from frame_data
            # This depends on what track.py outputs
            
            frame = {
                'frameNumber': int(frame_id) if isinstance(frame_id, (int, str)) else 0,
                'timestamp': frame_data.get('timestamp', 0),
                'confidence': frame_data.get('confidence', 1.0),
                'keypoints': frame_data.get('keypoints', []),
                'joints3D': frame_data.get('joints_3d', []),
                'jointAngles': frame_data.get('joint_angles', {}),
                'has3D': frame_data.get('has_3d', True),
                'meshRendered': frame_data.get('mesh_rendered', False),
                'vertices': frame_data.get('vertices', []),
                'faces': frame_data.get('faces', []),
            }
            
            return frame
        
        except Exception as e:
            logger.warning(f"[TRACK_WRAPPER] Error extracting frame data: {e}")
            return None


def process_video_with_track(video_path: str, output_dir: str = None, max_frames: int = None) -> Dict[str, Any]:
    """
    Convenience function to process a video using track.py.
    
    Args:
        video_path: Path to input video
        output_dir: Output directory (optional)
        max_frames: Maximum frames to process (optional)
    
    Returns:
        Dictionary with results
    """
    wrapper = TrackWrapper()
    return wrapper.process_video(video_path, output_dir, max_frames)
