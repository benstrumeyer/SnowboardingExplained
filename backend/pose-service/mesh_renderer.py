"""
SMPL Mesh Renderer - Exact 4D-Humans Implementation

This renderer uses pyrender to render SMPL meshes exactly as in 4D-Humans demo.py.
It handles:
1. Mesh creation from vertices and faces
2. Camera setup with intrinsics
3. Lighting setup (Raymond lights)
4. Rendering with alpha blending
5. Overlay on original image

Reference: https://github.com/shubham-goel/4D-Humans/blob/main/hmr2/utils/renderer.py
"""

import os
if 'PYOPENGL_PLATFORM' not in os.environ:
    os.environ['PYOPENGL_PLATFORM'] = 'egl'

import numpy as np
import pyrender
import trimesh
import cv2
import logging

logger = logging.getLogger(__name__)

LIGHT_BLUE = (0.65098039, 0.74117647, 0.85882353)


def create_raymond_lights():
    """Create Raymond lighting setup - EXACT from 4D-Humans"""
    thetas = np.pi * np.array([1.0 / 6.0, 1.0 / 6.0, 1.0 / 6.0])
    phis = np.pi * np.array([0.0, 2.0 / 3.0, 4.0 / 3.0])

    nodes = []
    for phi, theta in zip(phis, thetas):
        xp = np.sin(theta) * np.cos(phi)
        yp = np.sin(theta) * np.sin(phi)
        zp = np.cos(theta)

        z = np.array([xp, yp, zp])
        z = z / np.linalg.norm(z)
        x = np.array([-z[1], z[0], 0.0])
        if np.linalg.norm(x) == 0:
            x = np.array([1.0, 0.0, 0.0])
        x = x / np.linalg.norm(x)
        y = np.cross(z, x)

        matrix = np.eye(4)
        matrix[:3, :3] = np.c_[x, y, z]
        nodes.append(
            pyrender.Node(
                light=pyrender.DirectionalLight(color=np.ones(3), intensity=1.0),
                matrix=matrix
            )
        )

    return nodes


class SMPLMeshRenderer:
    """
    Render SMPL mesh overlaid on image - EXACT 4D-Humans implementation
    
    Uses pyrender for proper 3D rendering with:
    - Perspective projection
    - Lighting
    - Alpha blending
    """

    def __init__(self, focal_length=5000.0, img_size=256):
        """
        Args:
            focal_length: Focal length for camera intrinsics
            img_size: Model image size (used for camera center)
        """
        self.focal_length = focal_length
        self.img_size = img_size
        self.camera_center = [img_size / 2.0, img_size / 2.0]

    def render_mesh_on_image(
        self,
        image: np.ndarray,
        vertices: np.ndarray,
        faces: np.ndarray,
        camera_translation: np.ndarray,
        focal_length: float = None,
        mesh_color=LIGHT_BLUE,
        return_rgba=False,
    ) -> np.ndarray:
        """
        Render SMPL mesh on image - EXACT as 4D-Humans demo.py
        
        Args:
            image: (H, W, 3) RGB image in [0, 1] range
            vertices: (V, 3) mesh vertices
            faces: (F, 3) mesh faces
            camera_translation: (3,) camera translation [tx, ty, tz]
            focal_length: Focal length (uses self.focal_length if None)
            mesh_color: RGB color tuple
            return_rgba: If True, return RGBA with alpha channel
        
        Returns:
            (H, W, 3) or (H, W, 4) rendered image
        """
        if focal_length is None:
            focal_length = self.focal_length

        h, w = image.shape[:2]
        logger.debug(f"[RENDER] Image: {w}x{h}, Vertices: {len(vertices)}, Faces: {len(faces)}")
        logger.debug(f"[RENDER] Camera: {camera_translation}, Focal: {focal_length}")

        # Create pyrender renderer
        renderer = pyrender.OffscreenRenderer(
            viewport_width=w, viewport_height=h, point_size=1.0
        )

        # Create material - EXACT as 4D-Humans
        material = pyrender.MetallicRoughnessMaterial(
            metallicFactor=0.0,
            alphaMode="OPAQUE",
            baseColorFactor=(*mesh_color, 1.0),
        )

        # Create mesh
        mesh = trimesh.Trimesh(vertices.copy(), faces.copy())

        # Apply 180-degree rotation around X-axis - EXACT as 4D-Humans
        # This flips Y and Z to match OpenGL conventions
        rot = trimesh.transformations.rotation_matrix(np.radians(180), [1, 0, 0])
        mesh.apply_transform(rot)

        mesh = pyrender.Mesh.from_trimesh(mesh, material=material)

        # Create scene
        scene = pyrender.Scene(bg_color=[0, 0, 0, 0], ambient_light=(0.3, 0.3, 0.3))
        scene.add(mesh, "mesh")

        # Setup camera - EXACT as 4D-Humans
        camera_pose = np.eye(4)
        camera_pose[:3, 3] = camera_translation

        # Camera center in image coordinates
        camera_center = [w / 2.0, h / 2.0]

        # Intrinsics camera - EXACT as 4D-Humans
        camera = pyrender.IntrinsicsCamera(
            fx=focal_length,
            fy=focal_length,
            cx=camera_center[0],
            cy=camera_center[1],
            zfar=1e12,
        )
        scene.add(camera, pose=camera_pose)

        # Add lighting - EXACT as 4D-Humans
        light_nodes = create_raymond_lights()
        for node in light_nodes:
            scene.add_node(node)

        # Render with alpha
        color, depth = renderer.render(scene, flags=pyrender.RenderFlags.RGBA)
        color = color.astype(np.float32) / 255.0
        renderer.delete()

        if return_rgba:
            return color

        # Blend with original image
        valid_mask = color[:, :, 3:4]  # Alpha channel
        output = color[:, :, :3] * valid_mask + (1 - valid_mask) * image

        return output.astype(np.float32)

    def render_mesh_overlay(
        self,
        image_bgr: np.ndarray,
        vertices: np.ndarray,
        faces: np.ndarray,
        camera_translation: np.ndarray,
        focal_length: float = None,
        mesh_color=LIGHT_BLUE,
    ) -> np.ndarray:
        """
        Render mesh overlay on BGR image (OpenCV format)
        
        Args:
            image_bgr: (H, W, 3) BGR image in [0, 255] range
            vertices: (V, 3) mesh vertices
            faces: (F, 3) mesh faces
            camera_translation: (3,) camera translation
            focal_length: Focal length
            mesh_color: RGB color tuple
        
        Returns:
            (H, W, 3) BGR image with mesh overlay
        """
        # Convert BGR to RGB and normalize
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

        # Render mesh
        rendered_rgb = self.render_mesh_on_image(
            image_rgb,
            vertices,
            faces,
            camera_translation,
            focal_length=focal_length,
            mesh_color=mesh_color,
            return_rgba=False,
        )

        # Convert back to BGR and uint8
        rendered_bgr = cv2.cvtColor((rendered_rgb * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)

        return rendered_bgr

    def render_mesh_rgba(
        self,
        vertices: np.ndarray,
        faces: np.ndarray,
        camera_translation: np.ndarray,
        render_size: tuple = (256, 256),
        focal_length: float = None,
        mesh_color=LIGHT_BLUE,
    ) -> np.ndarray:
        """
        Render mesh to RGBA (for compositing)
        
        Args:
            vertices: (V, 3) mesh vertices
            faces: (F, 3) mesh faces
            camera_translation: (3,) camera translation
            render_size: (W, H) render resolution
            focal_length: Focal length
            mesh_color: RGB color tuple
        
        Returns:
            (H, W, 4) RGBA image
        """
        w, h = render_size
        renderer = pyrender.OffscreenRenderer(viewport_width=w, viewport_height=h, point_size=1.0)

        material = pyrender.MetallicRoughnessMaterial(
            metallicFactor=0.0, alphaMode="OPAQUE", baseColorFactor=(*mesh_color, 1.0)
        )

        mesh = trimesh.Trimesh(vertices.copy(), faces.copy())
        rot = trimesh.transformations.rotation_matrix(np.radians(180), [1, 0, 0])
        mesh.apply_transform(rot)
        mesh = pyrender.Mesh.from_trimesh(mesh, material=material)

        scene = pyrender.Scene(bg_color=[0, 0, 0, 0], ambient_light=(0.3, 0.3, 0.3))
        scene.add(mesh, "mesh")

        camera_pose = np.eye(4)
        camera_pose[:3, 3] = camera_translation

        if focal_length is None:
            focal_length = self.focal_length

        camera = pyrender.IntrinsicsCamera(
            fx=focal_length, fy=focal_length, cx=w / 2.0, cy=h / 2.0, zfar=1e12
        )
        scene.add(camera, pose=camera_pose)

        light_nodes = create_raymond_lights()
        for node in light_nodes:
            scene.add_node(node)

        color, depth = renderer.render(scene, flags=pyrender.RenderFlags.RGBA)
        color = color.astype(np.float32) / 255.0
        renderer.delete()

        return color
