import { MeshFrame, SyncedFrame } from '../types';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CameraService } from '../services/cameraService';

interface MeshViewerProps {
  riderMesh: (MeshFrame | SyncedFrame) | null;
  referenceMesh: (MeshFrame | SyncedFrame) | null;
  showRider: boolean;
  showReference: boolean;
  riderRotation: { x: number; y: number; z: number };
  referenceRotation: { x: number; y: number; z: number };
  riderColor?: string;
  riderOpacity?: number;
  referenceColor?: string;
  referenceOpacity?: number;
  showTrackingLines?: boolean;
  enabledKeypoints?: Set<number>;
  showAngles?: boolean;
  onCameraServiceReady?: (service: CameraService) => void;
}

export function MeshViewer({
  riderMesh,
  referenceMesh,
  showRider,
  showReference,
  riderRotation,
  referenceRotation,
  riderColor = '#FF6B6B',
  riderOpacity = 1,
  referenceColor = '#4ECDC4',
  referenceOpacity = 1,
  showTrackingLines = false,
  enabledKeypoints = new Set(),
  showAngles = false, // TODO: Implement joint angle visualization
  onCameraServiceReady,
}: MeshViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraServiceRef = useRef<CameraService | null>(null);
  const controlsRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0,
    phi: Math.PI / 4,
    radius: 5,
  });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const trackingLinesRef = useRef<THREE.LineSegments[]>([]);

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

      // Initialize camera service
      cameraServiceRef.current = new CameraService(camera);
      onCameraServiceReady?.(cameraServiceRef.current);

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

      // Grid Floor
      const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // Mouse drag for camera rotation
      const onMouseDown = (e: MouseEvent) => {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current || !cameraRef.current) return;

        const deltaX = e.clientX - lastMouseRef.current.x;
        const deltaY = e.clientY - lastMouseRef.current.y;

        controlsRef.current.theta -= deltaX * 0.01;
        controlsRef.current.phi += deltaY * 0.01;
        controlsRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controlsRef.current.phi));

        const { theta, phi, radius } = controlsRef.current;
        cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
        cameraRef.current.position.y = radius * Math.cos(phi);
        cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
        cameraRef.current.lookAt(0, 0, 0);

        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      };

      const onMouseUp = () => {
        isDraggingRef.current = false;
      };

      // Mouse wheel zoom
      const onMouseWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (!cameraServiceRef.current) return;
        const direction = e.deltaY > 0 ? 1 : -1;
        cameraServiceRef.current.zoom(direction);
      };

      renderer.domElement.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !renderer || !camera) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
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
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('wheel', onMouseWheel);
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

    // Clear existing meshes and tracking lines
    const meshesToRemove = sceneRef.current.children.filter(
      (child) => child instanceof THREE.Mesh && child.name.startsWith('mesh-')
    );
    meshesToRemove.forEach((mesh) => sceneRef.current!.remove(mesh));

    trackingLinesRef.current.forEach((line) => sceneRef.current!.remove(line));
    trackingLinesRef.current = [];
    meshesRef.current.clear();

    // Add rider mesh
    if (riderMesh && showRider) {
      const mesh = createMeshFromFrame(riderMesh, riderColor);
      if (mesh) {
        mesh.name = 'mesh-rider';
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(
          (riderRotation.x * Math.PI) / 180,
          (riderRotation.y * Math.PI) / 180,
          (riderRotation.z * Math.PI) / 180
        );
        // Apply opacity
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
            child.material.opacity = riderOpacity;
            child.material.transparent = riderOpacity < 1;
          }
        });
        sceneRef.current.add(mesh);
        meshesRef.current.set('rider', mesh);

        // Add tracking lines if enabled
        if (showTrackingLines && enabledKeypoints.size > 0) {
          addTrackingLines(riderMesh, enabledKeypoints, sceneRef.current, riderColor);
        }
      }
    }

    // Add reference mesh
    if (referenceMesh && showReference) {
      const mesh = createMeshFromFrame(referenceMesh, referenceColor);
      if (mesh) {
        mesh.name = 'mesh-reference';
        mesh.position.set(2, 0, 0);
        mesh.rotation.set(
          (referenceRotation.x * Math.PI) / 180,
          (referenceRotation.y * Math.PI) / 180,
          (referenceRotation.z * Math.PI) / 180
        );
        // Apply opacity
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
            child.material.opacity = referenceOpacity;
            child.material.transparent = referenceOpacity < 1;
          }
        });
        sceneRef.current.add(mesh);
        meshesRef.current.set('reference', mesh);
      }
    }

    // Note: showAngles is reserved for future joint angle visualization
    void showAngles;
  }, [riderMesh, referenceMesh, showRider, showReference, riderRotation, referenceRotation, riderColor, riderOpacity, referenceColor, referenceOpacity, showTrackingLines, enabledKeypoints, showAngles]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function createMeshFromFrame(frame: MeshFrame | SyncedFrame, colorHex: string): THREE.Mesh | null {
  // Extract vertices from either frame type
  let vertices: number[][];
  let faces: number[][];
  
  if ('meshData' in frame) {
    // SyncedFrame type
    vertices = frame.meshData.vertices;
    faces = frame.meshData.faces;
  } else {
    // MeshFrame type
    vertices = frame.vertices;
    faces = frame.faces;
  }
  
  if (!vertices || vertices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();

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
    
    // Rotate 90 degrees around Z axis: X becomes -Y, Y becomes X
    const tempX = nx;
    nx = -ny;
    ny = tempX;
    
    // Rotate 90 degrees around Y axis: X becomes Z, Z becomes -X
    const tempX2 = nx;
    nx = nz;
    nz = -tempX2;
    
    // Rotate another 90 degrees around Y axis: X becomes Z, Z becomes -X
    const tempX3 = nx;
    nx = nz;
    nz = -tempX3;
    
    // Rotate another 90 degrees around Y axis: X becomes Z, Z becomes -X
    const tempX4 = nx;
    nx = nz;
    nz = -tempX4;
    
    // Rotate another 90 degrees around Y axis: X becomes Z, Z becomes -X
    const tempX5 = nx;
    nx = nz;
    nz = -tempX5;
    
    // Rotate 180 degrees around Y axis (two 90-degree rotations)
    const tempX6 = nx;
    nx = nz;
    nz = -tempX6;
    
    const tempX7 = nx;
    nx = nz;
    nz = -tempX7;
    
    // Rotate 90 degrees around X axis: Y becomes -Z, Z becomes Y
    const tempY4 = ny;
    ny = nz;
    nz = -tempY4;
    
    // Rotate another 180 degrees around Y axis (two 90-degree rotations)
    const tempX8 = nx;
    nx = nz;
    nz = -tempX8;
    
    const tempX9 = nx;
    nx = nz;
    nz = -tempX9;
    
    // Rotate 180 degrees around X axis (two 90-degree rotations)
    const tempY5 = ny;
    ny = nz;
    nz = -tempY5;
    
    const tempY6 = ny;
    ny = nz;
    nz = -tempY6;
    
    // Rotate 90 degrees around Y axis: X becomes Z, Z becomes -X
    const tempX10 = nx;
    nx = nz;
    nz = -tempX10;
    
    // Rotate 180 degrees around Y axis (two 90-degree rotations)
    const tempX11 = nx;
    nx = nz;
    nz = -tempX11;
    
    const tempX12 = nx;
    nx = nz;
    nz = -tempX12;
    
    // Position feet on ground (add back the height offset)
    ny = ny + (sizeY * scale) / 2;
    
    return [nx, ny, nz];
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(normalizedVertices.flat()), 3));

  if (faces && faces.length > 0) {
    const flatFaces = faces.flat();
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(flatFaces), 1));
  }

  geometry.computeVertexNormals();

  // Convert hex color string to number
  const colorNum = parseInt(colorHex.replace('#', ''), 16);

  const material = new THREE.MeshPhongMaterial({
    color: colorNum,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  
  return mesh;
}

function addTrackingLines(frame: MeshFrame | SyncedFrame, enabledKeypoints: Set<number>, scene: THREE.Scene, meshColor: string): void {
  // Add point visualization for enabled keypoints
  let keypoints: any[] = [];
  if ('meshData' in frame && frame.meshData) {
    keypoints = frame.meshData.keypoints || [];
  }

  enabledKeypoints.forEach((index) => {
    if (keypoints && keypoints[index]) {
      const kp = keypoints[index];
      const pos = Array.isArray(kp) ? kp : (kp.position || [0, 0, 0]);
      
      // Create a small sphere for each keypoint
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const colorNum = parseInt(meshColor.replace('#', ''), 16);
      const material = new THREE.MeshBasicMaterial({ color: colorNum });
      const sphere = new THREE.Mesh(geometry, material);
      
      sphere.position.set(pos[0], pos[1], pos[2]);
      scene.add(sphere);
    }
  });
}
