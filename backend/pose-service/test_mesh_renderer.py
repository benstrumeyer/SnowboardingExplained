"""
Test script for mesh renderer - verify it works with 4D-Humans output
"""

import numpy as np
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_mesh_renderer():
    """Test mesh renderer with synthetic data"""
    try:
        from mesh_renderer import SMPLMeshRenderer
        logger.info("✓ Successfully imported SMPLMeshRenderer")
    except ImportError as e:
        logger.error(f"✗ Failed to import: {e}")
        return False
    
    try:
        # Create synthetic mesh (simple cube)
        vertices = np.array([
            [-1, -1, 5],
            [1, -1, 5],
            [1, 1, 5],
            [-1, 1, 5],
        ], dtype=np.float32)
        
        faces = np.array([
            [0, 1, 2],
            [0, 2, 3],
        ], dtype=np.int32)
        
        # Camera at origin looking down Z
        camera_translation = np.array([0, 0, 5], dtype=np.float32)
        
        # Create synthetic image
        image = np.ones((256, 256, 3), dtype=np.float32) * 0.5
        
        logger.info(f"Testing with {len(vertices)} vertices, {len(faces)} faces")
        logger.info(f"Camera translation: {camera_translation}")
        
        # Create renderer
        renderer = SMPLMeshRenderer(focal_length=5000.0, img_size=256)
        logger.info("✓ Created renderer")
        
        # Render
        result = renderer.render_mesh_on_image(
            image,
            vertices,
            faces,
            camera_translation,
            focal_length=5000.0,
        )
        
        logger.info(f"✓ Rendered image shape: {result.shape}")
        logger.info(f"✓ Output range: [{result.min():.3f}, {result.max():.3f}]")
        
        # Check that something was rendered (not all same as input)
        if not np.allclose(result, image):
            logger.info("✓ Mesh was rendered (output differs from input)")
            return True
        else:
            logger.warning("⚠ Output same as input (mesh may not have rendered)")
            return False
            
    except Exception as e:
        logger.error(f"✗ Test failed: {e}", exc_info=True)
        return False


if __name__ == '__main__':
    success = test_mesh_renderer()
    exit(0 if success else 1)
