import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useMeshSampler, MeshFrameData } from '../hooks/useMeshSampler';
import { useVideoMeshSync } from '../hooks/useVideoMeshSync';
import { useVideoPlaybackSync } from '../hooks/useVideoPlaybackSync';
import { MeshNametag } from './MeshNametag';
import { MeshScrubber } from './MeshScrubber';
import { globalCameraManager } from '../services/globalCameraManager';
import { getGlobalPlaybackEngine } from '../engine/PlaybackEngine';

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
  const activeCellIdRef = useRef<string | null>(null);
  const [meshFrameIndex, setMeshFrameIndex] = useState(0);
  const [actualFps, setActualFps] = useState(fps);
  const [videoDuration, setVideoDuration] = useState(0);

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
      activeCellIdRef.current = cellId;
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || activeCellIdRef.current !== cellId || !cameraRef.current) return;

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
      activeCellIdRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      globalCameraManager.unregisterCamera(cellId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('wheel', onMouseWheel);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const updateMeshGeometry = (frame: MeshFrameData) => {
    if (!sceneRef.current || !frame) return;

    // First frame: create geometry and mesh once
    if (!meshRef.current) {
      const geometry = new THREE.BufferGeometry();

      // Set position attribute with first frame's vertices
      const posAttr = new THREE.BufferAttribute(frame.vertices, 3);
      geometry.setAttribute('position', posAttr);

      // Set index once (faces are static across all frames)
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
      const minY = bbox.min.y;
      mesh.position.y = -minY;

      sceneRef.current.add(mesh);
      meshRef.current = mesh;
      return;
    }

    // Subsequent frames: only update position attribute (no dispose, no new mesh)
    const geometry = meshRef.current.geometry as THREE.BufferGeometry;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute | null;

    if (posAttr && posAttr.count === frame.vertices.length / 3) {
      // Fast path: just copy vertex data
      posAttr.copyArray(frame.vertices);
      posAttr.needsUpdate = true;
    } else {
      // Fallback: recreate position attribute if count mismatch
      const newPosAttr = new THREE.BufferAttribute(frame.vertices, 3);
      geometry.setAttribute('position', newPosAttr);
    }
  };

  useEffect(() => {
    if (!modelId) return;

    const loadMeshData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/mesh-data/${modelId}`);
        const data = await response.json();

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

          meshDataRef.current = frames;

          if (data.data.fps && data.data.totalFrames) {
            setActualFps(data.data.fps);
            const durationMs = (data.data.totalFrames / data.data.fps) * 1000;
            setVideoDuration(durationMs);
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

  useEffect(() => {
    if (meshDataRef.current && meshDataRef.current.length > 0) {
      const frame = meshDataRef.current[meshFrameIndex];
      if (frame) {
        updateMeshGeometry(frame);
      }
    }
  }, [meshFrameIndex]);

  useVideoMeshSync(videoRef, meshDataRef, !!videoRef, (frame) => {
    updateMeshGeometry(frame);
  });

  useVideoPlaybackSync(videoRef, !!videoRef);

  useEffect(() => {
    if (!videoRef?.current) return;

    const engine = getGlobalPlaybackEngine();
    const video = videoRef.current;

    const unsubscribe = engine.addEventListener((event) => {
      if (event.type === 'play') {
        video.play().catch(() => { });
      } else if (event.type === 'pause') {
        video.pause();
      } else if (event.type === 'speedChanged') {
        video.playbackRate = Math.abs(event.speed);
      } else if (event.type === 'cellFrameNext') {
        engine.advanceIndependentCellFrame(cellId, 1);
      } else if (event.type === 'cellFramePrev') {
        engine.advanceIndependentCellFrame(cellId, -1);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cellId, videoRef]);

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '90px', zIndex: 10 }}>
        <MeshScrubber
          cellId={cellId}
          cellContainerRef={containerRef}
          meshDataRef={meshDataRef}
          fps={actualFps}
          duration={videoDuration}
          onFrameChange={setMeshFrameIndex}
        />
      </div>
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
