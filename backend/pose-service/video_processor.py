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
    
    def process_video(self, video_path, output_path=None, progress_callback=None, max_frames=60):
        """
        Process video and apply mesh overlay to every frame
        
        Args:
            video_path: Path to input video file
            output_path: Path to save output video (if None, creates temp file)
            progress_callback: Function(frame_num, total_frames) for progress updates
            max_frames: Maximum frames to process (default 60 for testing, use 999999 for all)
        
        Returns:
            {
                'output_path': path to output video,
                'total_frames': number of frames processed,
                'fps': frames per second,
                'resolution': (width, height),
                'processing_time_seconds': total time taken,
                'frame_acceptance': [{'frame_index': 0, 'has_mesh': True}, ...]
            }
        """
        import time
        from datetime import datetime
        start_time = time.time()
        
        def log_with_time(msg):
            elapsed = time.time() - start_time
            timestamp = datetime.now().strftime('%H:%M:%S')
            full_msg = f"[{timestamp}] [{elapsed:.1f}s] {msg}"
            print(full_msg)
            logger.info(full_msg)
        
        log_with_time("[VIDEO_PROCESSOR] Starting process_video")
        log_with_time(f"[VIDEO_PROCESSOR] Input: {video_path}")
        log_with_time(f"[VIDEO_PROCESSOR] Output: {output_path}")
        log_with_time(f"[VIDEO_PROCESSOR] Max frames: {max_frames}")
        
        # Open video
        log_with_time("[VIDEO_PROCESSOR] Opening video file...")
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames_in_video = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        log_with_time(f"[VIDEO_PROCESSOR] Video properties: {width}x{height} @ {fps}fps, {total_frames_in_video} frames")
        logger.info(f"[VIDEO] Processing: {width}x{height} @ {fps}fps, {total_frames_in_video} frames")
        
        # Calculate which frames to process (evenly spaced)
        frames_to_process = set()
        if total_frames_in_video > max_frames:
            frame_interval = total_frames_in_video / max_frames
            log_with_time(f"[VIDEO_PROCESSOR] Sampling {max_frames} frames evenly (interval: {frame_interval:.2f})")
            for i in range(max_frames):
                frames_to_process.add(int(i * frame_interval))
        else:
            frame_interval = 1.0
            max_frames = total_frames_in_video
            log_with_time(f"[VIDEO_PROCESSOR] Processing all {total_frames_in_video} frames")
            frames_to_process = set(range(total_frames_in_video))
        
        log_with_time(f"[VIDEO_PROCESSOR] Frames to process: {sorted(frames_to_process)}")
        
        # Setup output video
        if output_path is None:
            temp_dir = tempfile.gettempdir()
            output_path = os.path.join(temp_dir, f"mesh_overlay_{int(time.time())}.mp4")
        
        # Create video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        if not out.isOpened():
            raise ValueError(f"Cannot create output video: {output_path}")
        
        log_with_time(f"[VIDEO_PROCESSOR] Output video writer created: {output_path}")
        
        frame_num = 0
        processed_frames = 0
        frame_acceptance = []  # Track which frames have successful mesh overlays
        pose_timeline = []  # Full pose data for each frame
        sorted_frames = sorted(frames_to_process)
        next_frame_idx = 0
        
        log_with_time(f"[VIDEO_PROCESSOR] Starting frame processing loop...")
        
        try:
            while next_frame_idx < len(sorted_frames):
                target_frame = sorted_frames[next_frame_idx]
                
                # Skip to target frame
                if frame_num < target_frame:
                    frames_to_skip = target_frame - frame_num
                    log_with_time(f"[VIDEO_PROCESSOR] Skipping {frames_to_skip} frames (from {frame_num} to {target_frame})")
                    for _ in range(frames_to_skip):
                        ret, _ = cap.read()
                        if not ret:
                            log_with_time(f"[VIDEO_PROCESSOR] End of video reached while skipping to frame {target_frame}")
                            break
                        frame_num += 1
                    if not ret:
                        break
                
                # Read the target frame
                ret, frame = cap.read()
                if not ret:
                    log_with_time(f"[VIDEO_PROCESSOR] End of video reached at frame {frame_num}")
                    break
                
                frame_num += 1
                should_process = True
                
                if should_process:
                    log_with_time(f"[VIDEO_PROCESSOR] ▶ Processing frame {target_frame} (output frame {processed_frames + 1}/{max_frames})")
                    
                    try:
                        # Encode frame to base64
                        _, buffer = cv2.imencode('.jpg', frame)
                        frame_base64 = base64.b64encode(buffer).decode('utf-8')
                        
                        log_with_time(f"[VIDEO_PROCESSOR]   → Calling detect_pose_with_visualization...")
                        
                        # Detect pose and render mesh
                        result = self.detector.detect_pose_with_visualization(
                            frame_base64, 
                            frame_number=target_frame
                        )
                        
                        log_with_time(f"[VIDEO_PROCESSOR]   ✓ Got result")
                        
                        # Check if visualization was successful
                        has_mesh = 'visualization_base64' in result and result['visualization_base64'] is not None
                        
                        # Get visualization if available
                        if has_mesh:
                            log_with_time(f"[VIDEO_PROCESSOR]   ✓ Has mesh overlay")
                            viz_data = base64.b64decode(result['visualization_base64'])
                            viz_array = np.frombuffer(viz_data, dtype=np.uint8)
                            frame_out = cv2.imdecode(viz_array, cv2.IMREAD_COLOR)
                        else:
                            # Skip frames without successful mesh overlay
                            log_with_time(f"[VIDEO_PROCESSOR]   ✗ No mesh overlay, skipping")
                            frame_out = None
                        
                        # Only write frame if it has mesh overlay
                        if frame_out is not None:
                            out.write(frame_out)
                            
                            # Extract pose data for this frame
                            timestamp = target_frame / fps if fps > 0 else 0
                            
                            # Extract mesh geometry if available
                            mesh_vertices = None
                            mesh_faces = None
                            if hasattr(self.detector, '_last_hmr2_result') and self.detector._last_hmr2_result:
                                hmr2_result = self.detector._last_hmr2_result
                                if 'vertices' in hmr2_result and 'faces' in hmr2_result:
                                    mesh_vertices = hmr2_result['vertices'].tolist() if hasattr(hmr2_result['vertices'], 'tolist') else hmr2_result['vertices']
                                    mesh_faces = hmr2_result['faces'].tolist() if hasattr(hmr2_result['faces'], 'tolist') else hmr2_result['faces']
                                    log_with_time(f"[VIDEO_PROCESSOR]   ✓ Extracted mesh: {len(mesh_vertices)} vertices, {len(mesh_faces)} faces")
                            
                            pose_frame = {
                                'frameNumber': processed_frames,
                                'originalFrameNumber': target_frame,
                                'timestamp': round(timestamp, 3),
                                'confidence': 1.0 if result.get('keypoint_count', 0) > 0 else 0,
                                'keypoints': result.get('keypoints', []),
                                'joints3D': result.get('joints_3d_raw', []),
                                'jointAngles': result.get('joint_angles_3d', {}),
                                'has3D': result.get('has_3d', False),
                                'meshRendered': result.get('mesh_rendered', False),
                                'vertices': mesh_vertices,
                                'faces': mesh_faces,
                                'imageBase64': f"data:image/jpeg;base64,{result.get('visualization_base64', '')}",
                            }
                            pose_timeline.append(pose_frame)
                            
                            frame_acceptance.append({
                                'frame_index': processed_frames,
                                'has_mesh': True,
                                'original_frame_number': target_frame,
                                'timestamp': round(timestamp, 3)
                            })
                            processed_frames += 1
                            log_with_time(f"[VIDEO_PROCESSOR]   ✓ Written to output ({processed_frames}/{max_frames})")
                        
                        if progress_callback:
                            progress_callback(processed_frames, max_frames)
                        
                        if processed_frames % 5 == 0:
                            log_with_time(f"[VIDEO_PROCESSOR] Progress: {processed_frames}/{max_frames} frames processed")
                            logger.info(f"[VIDEO] Processed {processed_frames}/{max_frames} frames with mesh")
                        
                    except Exception as e:
                        log_with_time(f"[VIDEO_PROCESSOR]   ✗ Error: {e}")
                        import traceback
                        traceback.print_exc()
                        logger.error(f"[VIDEO] Error processing frame {target_frame}: {e}")
                        frame_acceptance.append({
                            'frame_index': processed_frames,
                            'has_mesh': False,
                            'original_frame_number': target_frame,
                            'error': str(e)
                        })
                
                next_frame_idx += 1
        
        finally:
            log_with_time(f"[VIDEO_PROCESSOR] Releasing video resources...")
            cap.release()
            out.release()
            log_with_time(f"[VIDEO_PROCESSOR] Resources released")
        
        processing_time = time.time() - start_time
        
        log_with_time(f"[VIDEO_PROCESSOR] ✓ Complete: {processed_frames}/{max_frames} frames with mesh in {processing_time:.1f}s")
        logger.info(f"[VIDEO] ✓ Complete: {processed_frames}/{max_frames} frames with mesh in {processing_time:.1f}s")
        
        output_size_mb = round(os.path.getsize(output_path) / (1024 * 1024), 2)
        log_with_time(f"[VIDEO_PROCESSOR] Output file size: {output_size_mb} MB")
        
        result = {
            'output_path': output_path,
            'total_frames': processed_frames,
            'processed_frames': processed_frames,
            'fps': fps,
            'resolution': [width, height],
            'processing_time_seconds': round(processing_time, 2),
            'output_size_mb': output_size_mb,
            'frame_acceptance': frame_acceptance,
            'pose_timeline': pose_timeline,
            'video_duration': round(total_frames_in_video / fps, 2) if fps > 0 else 0,
            'frames': [
                {
                    'frameNumber': frame['frameNumber'],
                    'timestamp': frame['timestamp'],
                    'vertices': frame.get('vertices', []),
                    'faces': frame.get('faces', []),
                }
                for frame in pose_timeline
            ]
        }
        
        log_with_time(f"[VIDEO_PROCESSOR] Returning result with {processed_frames} frames")
        return result
    
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
