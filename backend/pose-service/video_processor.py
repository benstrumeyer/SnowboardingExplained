"""
Full video mesh overlay processor

Processes entire videos frame-by-frame, applying mesh overlay to each frame,
and returns the processed video.
"""

import cv2
import numpy as np
import tempfile
import os
import logging
import base64
from pathlib import Path

logger = logging.getLogger(__name__)


class VideoMeshProcessor:
    """Process full videos with mesh overlay on every frame"""
    
    def __init__(self, detector, mesh_renderer):
        """
        Args:
            detector: HybridPoseDetector instance
            mesh_renderer: SMPLMeshRenderer instance
        """
        self.detector = detector
        self.mesh_renderer = mesh_renderer
    
    def process_video(self, video_path, output_path=None, progress_callback=None):
        """
        Process video and apply mesh overlay to every frame
        
        Args:
            video_path: Path to input video file
            output_path: Path to save output video (if None, creates temp file)
            progress_callback: Function(frame_num, total_frames) for progress updates
        
        Returns:
            {
                'output_path': path to output video,
                'total_frames': number of frames processed,
                'fps': frames per second,
                'resolution': (width, height),
                'processing_time_seconds': total time taken
            }
        """
        import time
        start_time = time.time()
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        logger.info(f"[VIDEO] Processing: {width}x{height} @ {fps}fps, {total_frames} frames")
        
        # Setup output video
        if output_path is None:
            temp_dir = tempfile.gettempdir()
            output_path = os.path.join(temp_dir, f"mesh_overlay_{int(time.time())}.mp4")
        
        # Create video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        if not out.isOpened():
            raise ValueError(f"Cannot create output video: {output_path}")
        
        frame_num = 0
        processed_frames = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                try:
                    # Encode frame to base64
                    _, buffer = cv2.imencode('.jpg', frame)
                    frame_base64 = base64.b64encode(buffer).decode('utf-8')
                    
                    # Detect pose and render mesh
                    result = self.detector.detect_pose_with_visualization(
                        frame_base64, 
                        frame_number=frame_num
                    )
                    
                    # Get visualization if available
                    if 'visualization_base64' in result:
                        viz_data = base64.b64decode(result['visualization_base64'])
                        viz_array = np.frombuffer(viz_data, dtype=np.uint8)
                        frame_out = cv2.imdecode(viz_array, cv2.IMREAD_COLOR)
                    else:
                        # Fallback: use original frame if visualization failed
                        frame_out = frame
                    
                    out.write(frame_out)
                    processed_frames += 1
                    
                    if progress_callback:
                        progress_callback(frame_num + 1, total_frames)
                    
                    if (frame_num + 1) % 10 == 0:
                        logger.info(f"[VIDEO] Processed {frame_num + 1}/{total_frames} frames")
                    
                except Exception as e:
                    logger.error(f"[VIDEO] Error processing frame {frame_num}: {e}")
                    # Write original frame on error
                    out.write(frame)
                    processed_frames += 1
                
                frame_num += 1
        
        finally:
            cap.release()
            out.release()
        
        processing_time = time.time() - start_time
        
        logger.info(f"[VIDEO] ✓ Complete: {processed_frames}/{total_frames} frames in {processing_time:.1f}s")
        
        return {
            'output_path': output_path,
            'total_frames': total_frames,
            'processed_frames': processed_frames,
            'fps': fps,
            'resolution': [width, height],
            'processing_time_seconds': round(processing_time, 2),
            'output_size_mb': round(os.path.getsize(output_path) / (1024 * 1024), 2)
        }
    
    def process_video_from_base64(self, video_base64, output_path=None, progress_callback=None):
        """
        Process video from base64 encoded data
        
        Args:
            video_base64: Base64 encoded video file
            output_path: Path to save output video
            progress_callback: Progress callback function
        
        Returns:
            Same as process_video()
        """
        import time
        
        # Decode base64 to temp file
        temp_dir = tempfile.gettempdir()
        input_path = os.path.join(temp_dir, f"input_video_{int(time.time())}.mp4")
        
        try:
            video_data = base64.b64decode(video_base64)
            with open(input_path, 'wb') as f:
                f.write(video_data)
            
            # Process video
            result = self.process_video(input_path, output_path, progress_callback)
            
            return result
        
        finally:
            # Clean up temp input file
            if os.path.exists(input_path):
                try:
                    os.remove(input_path)
                except:
                    pass
