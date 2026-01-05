import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useMeshSampler, MeshFrameData } from '../hooks/useMeshSampler';
import { useVideoMeshSync } from '../hooks/useVideoMeshSync';
import { MeshNametag } from './MeshNametag';
import { globalCameraManager } from '../services/globalCameraManager';

interface MeshViewerProps {
  cellId: string;
  fps?: number;
  nametag?: string;
  modelId?: string;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onMetadataLoaded?: (fps: number, totalFrames: number) => void;
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export function MeshViewer({
  cellId,
  fps = 30,
  nametag,
  modelId = '',
  videoRef,
  onMetadataLoaded,
}: MeshViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef({ theta: 0, phi: Math.PI / 4, radius: 5 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const meshDataRef = useRef<MeshFrameData[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    globalCameraManager.registerCamera(cellId, camera, new THREE.Vector3(0, 1, 0));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

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

    const onMouseWheel = (e: WheelEvent) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? 1 : -1;
      controlsRef.current.radius += direction * 0.5;
      controlsRef.current.radius = Math.max(1, Math.min(20, controlsRef.current.radius));

      const { theta, phi, radius } = controlsRef.current;
      if (cameraRef.current) {
        cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
        cameraRef.current.position.y = radius * Math.cos(phi);
        cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      globalCameraManager.unregisterCamera(cellId);
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
  }, []);

  const updateMeshGeometry = (frame: MeshFrameData) => {
    if (!sceneRef.current) return;

    console.log('[MeshViewer] Updating mesh geometry:', {
      frameNumber: frame.frameNumber,
      vertexCount: frame.vertices.length / 3,
      faceCount: frame.faces.length / 3,
    });

    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (meshRef.current.material instanceof THREE.Material) {
        meshRef.current.material.dispose();
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(frame.vertices, 3));

    if (frame.faces && frame.faces.length > 0) {
      geometry.setIndex(new THREE.BufferAttribute(frame.faces, 1));
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: 0xff6b6b,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.y = Math.PI / 2;
    mesh.rotation.z = Math.PI / 2;

    const bbox = new THREE.Box3().setFromObject(mesh);
    const height = bbox.max.y - bbox.min.y;
    const minY = bbox.min.y;

    mesh.position.y = -minY;

    sceneRef.current.add(mesh);
    meshRef.current = mesh;

    console.log('[MeshViewer] Mesh added to scene with orientation fix');
  };

  useEffect(() => {
    if (!modelId) return;

    const loadMeshData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/mesh-data/${modelId}`);
        const data = await response.json();

        console.log('[MeshViewer] Loaded mesh data:', { modelId, data });

        if (data.data && data.data.frames && Array.isArray(data.data.frames)) {
          const frames: MeshFrameData[] = data.data.frames.map((frame: any) => {
            const meshData = frame.meshData || {};
            const vertices = meshData.vertices || [];
            const faces = meshData.faces || [];

            return {
              frameNumber: frame.frameIndex || 0,
              vertices: new Float32Array(
                Array.isArray(vertices[0])
                  ? vertices.flat()
                  : vertices
              ),
              faces: new Uint32Array(
                Array.isArray(faces[0])
                  ? faces.flat()
                  : faces
              ),
              camera: meshData.cameraParams || {
                tx: 0,
                ty: 0,
                tz: 0,
                focal_length: 1.0,
              },
            };
          });

          console.log('[MeshViewer] Transformed frames:', {
            count: frames.length,
            firstFrame: frames[0],
          });

          meshDataRef.current = frames;

          if (data.data.fps && data.data.totalFrames) {
            onMetadataLoaded?.(data.data.fps, data.data.totalFrames);
          }
        }
      } catch (error) {
        console.error('Failed to load mesh data:', error);
      }
    };

    loadMeshData();
  }, [modelId, onMetadataLoaded]);

  useMeshSampler(cellId, meshDataRef, fps, !videoRef, (frame) => {
    updateMeshGeometry(frame);
  });

  useVideoMeshSync(videoRef, meshDataRef, fps, !!videoRef, (frame) => {
    updateMeshGeometry(frame);
  });

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {sceneRef.current && cameraRef.current && nametag && (
        <MeshNametag
          scene={sceneRef.current}
          camera={cameraRef.current}
          text={nametag}
          position={[0, 2.5, 0]}
          fontSize={64}
          color="#4ECDC4"
        />
      )}
    </>
  );
}
