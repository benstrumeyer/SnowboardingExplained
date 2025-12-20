#!/usr/bin/env python3
"""
Test script to verify mesh rendering pipeline
"""

import numpy as np
import cv2
import logging
import sys
import os

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

def test_mesh_renderer():
    """Test the mesh renderer directly"""
    logger.info("=" * 80)
    logger.info("TEST: Mesh Renderer")
    logger.info("=" * 80)
    
    try:
        from mesh_renderer import SMPLMeshRenderer
        logger.info("✓ Imported SMPLMeshRenderer")
    except Exception as e:
        logger.error(f"✗ Failed to import SMPLMeshRenderer: {e}")
        return False
    
    try:
        # Create a simple test mesh (cube)
        vertices = np.array([
            [-1, -1, -1],
            [1, -1, -1],
            [1, 1, -1],
            [-1, 1, -1],
            [-1, -1, 1],
            [1, -1, 1],
            [1, 1, 1],
            [-1, 1, 1],
        ], dtype=np.float32) * 0.1  # Scale down
        
        faces = np.array([
            [0, 1, 2], [0, 2, 3],  # Front
            [4, 6, 5], [4, 7, 6],  # Back
            [0, 4, 5], [0, 5, 1],  # Bottom
            [2, 6, 7], [2, 7, 3],  # Top
            [0, 3, 7], [0, 7, 4],  # Left
            [1, 5, 6], [1, 6, 2],  # Right
        ], dtype=np.int32)
        
        logger.info(f"✓ Created test mesh: {len(vertices)} vertices, {len(faces)} faces")
        
        # Create test image
        image_bgr = np.ones((256, 256, 3), dtype=np.uint8) * 255
        logger.info(f"✓ Created test image: {image_bgr.shape}")
        
        # Camera parameters
        camera_translation = np.array([0.0, 0.0, 2.0], dtype=np.float32)
        focal_length = 5000.0
        
        logger.info(f"Camera: {camera_translation}, Focal: {focal_length}")
        
        # Create renderer
        renderer = SMPLMeshRenderer(focal_length=focal_length)
        logger.info("✓ Created SMPLMeshRenderer")
        
        # Render
        logger.info("Starting render...")
        rendered = renderer.render_mesh_overlay(
            image_bgr,
            vertices,
            faces,
            camera_translation,
            focal_length=focal_length
        )
        logger.info(f"✓ Render complete: {rendered.shape}")
        
        # Check if mesh was rendered (should have some non-white pixels)
        diff = np.abs(rendered.astype(float) - image_bgr.astype(float))
        changed_pixels = np.sum(diff > 10)
        logger.info(f"Changed pixels: {changed_pixels} / {256*256*3}")
        
        if changed_pixels > 0:
            logger.info("✓ Mesh was rendered (pixels changed)")
            return True
        else:
            logger.warning("⚠ No pixels changed (mesh may not have rendered)")
            return False
            
    except Exception as e:
        logger.error(f"✗ Test failed: {e}", exc_info=True)
        return False


def test_batch_renderer():
    """Test the batch mesh renderer"""
    logger.info("=" * 80)
    logger.info("TEST: Batch Mesh Renderer")
    logger.info("=" * 80)
    
    try:
        from batch_mesh_renderer import BatchMeshRenderer
        logger.info("✓ Imported BatchMeshRenderer")
    except Exception as e:
        logger.error(f"✗ Failed to import BatchMeshRenderer: {e}")
        return False
    
    try:
        # Create test data
        vertices = np.array([
            [-1, -1, -1],
            [1, -1, -1],
            [1, 1, -1],
            [-1, 1, -1],
            [-1, -1, 1],
            [1, -1, 1],
            [1, 1, 1],
            [-1, 1, 1],
        ], dtype=np.float32) * 0.1
        
        faces = np.array([
            [0, 1, 2], [0, 2, 3],
            [4, 6, 5], [4, 7, 6],
            [0, 4, 5], [0, 5, 1],
            [2, 6, 7], [2, 7, 3],
            [0, 3, 7], [0, 7, 4],
            [1, 5, 6], [1, 6, 2],
        ], dtype=np.int32)
        
        camera_translation = np.array([0.0, 0.0, 2.0], dtype=np.float32)
        
        # Create batch renderer
        renderer = BatchMeshRenderer(batch_size=2)
        logger.info("✓ Created BatchMeshRenderer")
        
        # Add tasks
        for i in range(3):
            image_bgr = np.ones((256, 256, 3), dtype=np.uint8) * 255
            renderer.add_task(
                frame_index=i,
                frame_bgr=image_bgr,
                vertices=vertices,
                faces=faces,
                camera_translation=camera_translation,
                focal_length=5000.0
            )
        
        logger.info(f"✓ Added 3 tasks")
        
        # Render all
        logger.info("Starting batch rendering...")
        results = renderer.render_all()
        logger.info(f"✓ Batch rendering complete: {len(results)} results")
        
        # Check results
        successful = sum(1 for r in results.values() if r.success)
        logger.info(f"Successful: {successful}/{len(results)}")
        
        if successful > 0:
            logger.info("✓ Batch rendering worked")
            return True
        else:
            logger.warning("⚠ No successful renders")
            return False
            
    except Exception as e:
        logger.error(f"✗ Test failed: {e}", exc_info=True)
        return False


if __name__ == '__main__':
    logger.info("Starting mesh rendering tests...")
    
    test1 = test_mesh_renderer()
    logger.info("")
    test2 = test_batch_renderer()
    
    logger.info("")
    logger.info("=" * 80)
    if test1 and test2:
        logger.info("✓ All tests passed!")
        sys.exit(0)
    else:
        logger.info("✗ Some tests failed")
        sys.exit(1)
