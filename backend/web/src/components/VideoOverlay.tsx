import { useRef, useEffect } from 'react';
import { MeshFrame } from '../types';
import * as THREE from 'three';

interface VideoOverlayProps {
  videoUrl: string;
  currentFrame: number;
  meshFrame?: MeshFrame | null;
  meshOpacity: number;
}

/**
 * VideoOverlay Component
 * Displays 2D video with optional 3D mesh overlay
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */
export function VideoOverlay({
  videoUrl,
  currentFrame,
  meshFrame,
  meshOpacity,
}: VideoOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Initialize Three.js scene for mesh overlay
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = null; // Transparent background
      sceneRef.current = scene;

      // Camera setup - orthographic for 2D overlay
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const camera = new THREE.OrthographicCamera(
        -width / 2,
        width / 2,
        height / 2,
        -height / 2,
        0.1,
        1000
      );
      camera.position.z = 5;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1);
      scene.add(ambientLight);

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();

      // Handle resize
      const handleResize = () => {
        if (!containerRef.current || !renderer) return;
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        renderer.setSize(newWidth, newHeight);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    } catch (error) {
      console.error('Failed to initialize overlay scene:', error);
    }
  }, []);

  // Update video playback position
  useEffect(() => {
    if (!videoRef.current) return;
    const fps = 30; // Default FPS
    const timestamp = currentFrame / fps;
    videoRef.current.currentTime = timestamp;
  }, [currentFrame]);

  // Update mesh overlay
  useEffect(() => {
    if (!sceneRef.current || !meshFrame) return;

    // Clear existing meshes
    const meshesToRemove = sceneRef.current.children.filter(
      (child) => child instanceof THREE.Mesh
    );
    meshesToRemove.forEach((mesh) => sceneRef.current!.remove(mesh));

    // Create mesh from frame
    const mesh = createOverlayMesh(meshFrame, meshOpacity);
    if (mesh) {
      sceneRef.current.add(mesh);
    }
  }, [meshFrame, meshOpacity]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

function createOverlayMesh(frame: MeshFrame, opacity: number): THREE.Mesh | null {
  if (!frame.vertices || frame.vertices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  const vertices = frame.vertices;

  // Normalize vertices for overlay
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const [x, y, z] of vertices) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const sizeX = maxX - minX || 1;
  const sizeY = maxY - minY || 1;
  const sizeZ = maxZ - minZ || 1;
  const maxSize = Math.max(sizeX, sizeY, sizeZ);
  const scale = maxSize > 0 ? 2 / maxSize : 1;

  const normalizedVertices = vertices.map(([x, y, z]) => {
    const nx = (x - centerX) * scale;
    const ny = (y - centerY) * scale;
    const nz = (z - centerZ) * scale;
    return [nx, ny, nz];
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(normalizedVertices.flat()), 3));

  if (frame.faces && frame.faces.length > 0) {
    const flatFaces = frame.faces.flat();
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(flatFaces), 1));
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    color: 0x4ECDC4,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  geometry.center();

  return mesh;
}
