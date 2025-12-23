import { MeshFrame } from '../types';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MeshViewerProps {
  riderMesh: MeshFrame | null;
  referenceMesh: MeshFrame | null;
  showRider: boolean;
  showReference: boolean;
  riderRotation: { x: number; y: number; z: number };
  referenceRotation: { x: number; y: number; z: number };
}

export function MeshViewer({
  riderMesh,
  referenceMesh,
  showRider,
  showReference,
  riderRotation,
  referenceRotation,
}: MeshViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);
      sceneRef.current = scene;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        75,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(3, 3, 3);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);

      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !renderer || !camera) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        camera.aspect = width / height;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();

      console.log('Three.js scene initialized successfully');

      return () => {
        window.removeEventListener('resize', handleResize);
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    } catch (error) {
      console.error('Failed to initialize Three.js scene:', error);
    }
  }, []);

  // Update meshes when they change
  useEffect(() => {
    if (!sceneRef.current) return;

    // Clear existing meshes
    const meshesToRemove = sceneRef.current.children.filter(
      (child) => child instanceof THREE.Mesh && child.name.startsWith('mesh-')
    );
    meshesToRemove.forEach((mesh) => sceneRef.current!.remove(mesh));

    // Add rider mesh
    if (riderMesh && showRider) {
      const mesh = createMeshFromFrame(riderMesh, 0xFF6B6B);
      if (mesh) {
        mesh.name = 'mesh-rider';
        // Position at origin, rotation happens around center
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(
          (riderRotation.x * Math.PI) / 180,
          (riderRotation.y * Math.PI) / 180,
          (riderRotation.z * Math.PI) / 180
        );
        sceneRef.current.add(mesh);
      }
    }

    // Add reference mesh
    if (referenceMesh && showReference) {
      const mesh = createMeshFromFrame(referenceMesh, 0x4ECDC4);
      if (mesh) {
        mesh.name = 'mesh-reference';
        // Position offset from rider, rotation happens around center
        mesh.position.set(2, 0, 0);
        mesh.rotation.set(
          (referenceRotation.x * Math.PI) / 180,
          (referenceRotation.y * Math.PI) / 180,
          (referenceRotation.z * Math.PI) / 180
        );
        sceneRef.current.add(mesh);
      }
    }
  }, [riderMesh, referenceMesh, showRider, showReference, riderRotation, referenceRotation]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function createMeshFromFrame(frame: MeshFrame, color: number): THREE.Mesh | null {
  if (!frame.vertices || frame.vertices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();

  // Normalize vertices
  const vertices = frame.vertices;
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

  // Normalize and reorient vertices to be upright
  // HMR2 outputs in camera space (X right, Y down, Z forward)
  // We want world space (X right, Y up, Z back)
  const normalizedVertices = vertices.map(([x, y, z]) => {
    // Center all axes
    let nx = (x - centerX) * scale;
    let ny = (y - centerY) * scale;
    let nz = (z - centerZ) * scale;
    
    // Rotate 90 degrees around X axis: Y becomes -Z, Z becomes Y
    // This converts camera space (Y down) to world space (Y up)
    const tempY = ny;
    ny = nz;
    nz = -tempY;
    
    // Position feet on ground (add back the height offset)
    ny = ny + (sizeY * scale) / 2;
    
    return [nx, ny, nz];
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(normalizedVertices.flat()), 3));

  if (frame.faces && frame.faces.length > 0) {
    const flatFaces = frame.faces.flat();
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(flatFaces), 1));
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    color,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  
  // Center the mesh's geometry so rotations happen around the center
  geometry.center();
  
  return mesh;
}
