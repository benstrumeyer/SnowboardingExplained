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

    console.log('%c[MESH-UPDATE] ═══════════════════════════════════════', 'color: #FF00FF; font-weight: bold; font-size: 14px;');
    console.log('%c[MESH-UPDATE] 🎬 MESH UPDATE TRIGGERED', 'color: #FF00FF; font-weight: bold; font-size: 14px;');
    console.log('%c[MESH-UPDATE] ═══════════════════════════════════════', 'color: #FF00FF; font-weight: bold; font-size: 14px;');
    
    console.log('%c[MESH-UPDATE] Input state:', 'color: #FF00FF;', {
      riderMeshExists: !!riderMesh,
      referenceMeshExists: !!referenceMesh,
      showRider,
      showReference,
      riderMeshType: riderMesh ? ('meshData' in riderMesh ? 'SyncedFrame' : 'MeshFrame') : 'null',
      referenceMeshType: referenceMesh ? ('meshData' in referenceMesh ? 'SyncedFrame' : 'MeshFrame') : 'null'
    });

    // Clear existing meshes and tracking lines
    const meshesToRemove = sceneRef.current.children.filter(
      (child) => child instanceof THREE.Mesh && child.name.startsWith('mesh-')
    );
    console.log('%c[MESH-UPDATE] 🗑️  Removing old meshes:', 'color: #FFAA00;', {
      count: meshesToRemove.length
    });
    meshesToRemove.forEach((mesh) => sceneRef.current!.remove(mesh));

    trackingLinesRef.current.forEach((line) => sceneRef.current!.remove(line));
    trackingLinesRef.current = [];
    meshesRef.current.clear();

    // Add rider mesh
    if (riderMesh && showRider) {
      console.log('%c[MESH-UPDATE] 🎯 RIDER MESH: Creating from frame', 'color: #00FF00; font-weight: bold;');
      console.log('%c[MESH-UPDATE] Rider frame structure:', 'color: #00FF00;', {
        frameKeys: Object.keys(riderMesh).slice(0, 10),
        hasMeshData: 'meshData' in riderMesh,
        meshDataKeys: ('meshData' in riderMesh) ? Object.keys((riderMesh as SyncedFrame).meshData) : 'N/A'
      });
      
      const mesh = createMeshFromFrame(riderMesh, riderColor);
      if (mesh) {
        console.log('%c[MESH-UPDATE] ✅ RIDER MESH CREATED', 'color: #00FF00; font-weight: bold; font-size: 13px;');
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
        console.log('%c[MESH-UPDATE] ✅ RIDER MESH ADDED TO SCENE', 'color: #00FF00; font-weight: bold; font-size: 13px;');
      } else {
        console.error('%c[MESH-UPDATE] ❌ RIDER MESH CREATION FAILED', 'color: #FF0000; font-weight: bold; font-size: 13px;');
      }
    } else {
      console.warn('%c[MESH-UPDATE] ⏭️  Skipping rider mesh:', 'color: #FFAA00;', {
        riderMeshExists: !!riderMesh,
        showRider
      });
    }

    // Add reference mesh
    if (referenceMesh && showReference) {
      console.log('%c[MESH-UPDATE] 🎯 REFERENCE MESH: Creating from frame', 'color: #00FFFF; font-weight: bold;');
      const mesh = createMeshFromFrame(referenceMesh, referenceColor);
      if (mesh) {
        console.log('%c[MESH-UPDATE] ✅ REFERENCE MESH CREATED', 'color: #00FFFF; font-weight: bold; font-size: 13px;');
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
        console.log('%c[MESH-UPDATE] ✅ REFERENCE MESH ADDED TO SCENE', 'color: #00FFFF; font-weight: bold; font-size: 13px;');
      } else {
        console.error('%c[MESH-UPDATE] ❌ REFERENCE MESH CREATION FAILED', 'color: #FF0000; font-weight: bold; font-size: 13px;');
      }
    } else {
      console.warn('%c[MESH-UPDATE] ⏭️  Skipping reference mesh:', 'color: #FFAA00;', {
        referenceMeshExists: !!referenceMesh,
        showReference
      });
    }

    console.log('%c[MESH-UPDATE] ═══════════════════════════════════════', 'color: #FF00FF; font-weight: bold; font-size: 14px;');
    console.log('%c[MESH-UPDATE] 🎬 MESH UPDATE COMPLETE', 'color: #FF00FF; font-weight: bold; font-size: 14px;');
    console.log('%c[MESH-UPDATE] ═══════════════════════════════════════', 'color: #FF00FF; font-weight: bold; font-size: 14px;');

    // Note: showAngles is reserved for future joint angle visualization
    void showAngles;
  }, [riderMesh, referenceMesh, showRider, showReference, riderRotation, referenceRotation, riderColor, riderOpacity, referenceColor, referenceOpacity, showTrackingLines, enabledKeypoints, showAngles]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function createMeshFromFrame(frame: MeshFrame | SyncedFrame, colorHex: string): THREE.Mesh | null {
  console.log('%c[MESH-CREATE] 🔍 Starting mesh creation', 'color: #FF00FF; font-weight: bold; font-size: 12px;');
  console.log('%c[MESH-CREATE] Frame type check:', 'color: #FF00FF;', {
    hasMeshData: 'meshData' in frame,
    frameKeys: Object.keys(frame).slice(0, 5)
  });

  // Extract vertices and faces from either frame type
  let vertices: number[][];
  let faces: number[][];
  
  if ('meshData' in frame) {
    // SyncedFrame type - mesh has already been processed through 2-pass transformation
    console.log('%c[MESH-CREATE] ✅ Detected SyncedFrame format', 'color: #00FF00;');
    vertices = frame.meshData.vertices;
    faces = frame.meshData.faces;
    console.log('%c[MESH-CREATE] SyncedFrame meshData:', 'color: #00FF00;', {
      verticesCount: vertices?.length || 0,
      facesCount: faces?.length || 0,
      verticesType: typeof vertices,
      facesType: typeof faces,
      firstVertex: vertices?.[0],
      firstFace: faces?.[0]
    });
  } else {
    // MeshFrame type - check for both old and new property names
    console.log('%c[MESH-CREATE] ⚠️  Detected MeshFrame format (legacy)', 'color: #FFAA00;');
    vertices = (frame as any).mesh_vertices_data || (frame as any).vertices || [];
    faces = (frame as any).mesh_faces_data || (frame as any).faces || [];
    console.log('%c[MESH-CREATE] MeshFrame data:', 'color: #FFAA00;', {
      verticesCount: vertices?.length || 0,
      facesCount: faces?.length || 0,
      hasMeshVerticesData: !!(frame as any).mesh_vertices_data,
      hasVertices: !!(frame as any).vertices,
      hasMeshFacesData: !!(frame as any).mesh_faces_data,
      hasFaces: !!(frame as any).faces
    });
  }
  
  console.log('%c[MESH-CREATE] 📊 Extracted data:', 'color: #00FFFF;', {
    verticesLength: vertices?.length || 0,
    facesLength: faces?.length || 0,
    verticesIsArray: Array.isArray(vertices),
    facesIsArray: Array.isArray(faces)
  });

  if (!vertices || vertices.length === 0) {
    console.error('%c[MESH-CREATE] ❌ CRITICAL: No vertices found!', 'color: #FF0000; font-weight: bold; font-size: 14px;');
    console.error('%c[MESH-CREATE] Frame structure:', 'color: #FF0000;', frame);
    console.error('%c[MESH-CREATE] Full frame dump:', 'color: #FF0000;', JSON.stringify(frame).substring(0, 500));
    return null;
  }

  console.log('%c[MESH-CREATE] ✅ Vertices found, creating geometry', 'color: #00FF00; font-weight: bold;');

  const geometry = new THREE.BufferGeometry();

  // Vertices are already normalized and transformed by the 2-pass pipeline
  // Just set them directly without additional transformation
  const flatVertices = vertices.flat();
  console.log('%c[MESH-CREATE] 📐 Flattened vertices:', 'color: #00FFFF;', {
    flatLength: flatVertices.length,
    expectedLength: vertices.length * 3,
    firstThreeValues: flatVertices.slice(0, 3),
    lastThreeValues: flatVertices.slice(-3)
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flatVertices), 3));
  console.log('%c[MESH-CREATE] ✅ Position attribute set', 'color: #00FF00;');

  // Set faces if available
  if (faces && faces.length > 0) {
    const flatFaces = faces.flat();
    console.log('%c[MESH-CREATE] 📐 Setting faces:', 'color: #00FFFF;', {
      facesCount: faces.length,
      flatLength: flatFaces.length,
      expectedLength: faces.length * 3,
      firstFace: faces[0],
      lastFace: faces[faces.length - 1]
    });
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(flatFaces), 1));
    console.log('%c[MESH-CREATE] ✅ Index attribute set', 'color: #00FF00;');
  } else {
    console.warn('%c[MESH-CREATE] ⚠️  No faces provided, rendering as point cloud', 'color: #FFAA00;');
  }

  geometry.computeVertexNormals();
  console.log('%c[MESH-CREATE] ✅ Vertex normals computed', 'color: #00FF00;');

  // Convert hex color string to number
  const colorNum = parseInt(colorHex.replace('#', ''), 16);
  console.log('%c[MESH-CREATE] 🎨 Color:', 'color: #00FFFF;', {
    hexInput: colorHex,
    colorNum: colorNum,
    colorHex: '0x' + colorNum.toString(16)
  });

  const material = new THREE.MeshPhongMaterial({
    color: colorNum,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  console.log('%c[MESH-CREATE] ✅✅✅ MESH CREATED SUCCESSFULLY ✅✅✅', 'color: #00FF00; font-weight: bold; font-size: 14px;', {
    vertexCount: vertices.length,
    faceCount: faces?.length || 0,
    meshName: mesh.name
  });
  
  return mesh;
}

