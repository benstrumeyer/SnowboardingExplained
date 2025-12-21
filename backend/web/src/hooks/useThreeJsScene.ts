import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MeshFrame } from '../types';

export function useThreeJsScene(containerRef: React.RefObject<HTMLDivElement>, containerReady: boolean) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const riderMeshRef = useRef<THREE.Mesh | null>(null);
  const referenceMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const initScene = () => {
      if (!containerRef.current) {
        console.error('Container ref still not available');
        return false;
      }

      console.log('Initializing Three.js scene', { containerRef: !!containerRef.current });

      // Clear any existing content
      containerRef.current.innerHTML = '';

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);
      sceneRef.current = scene;

      // Camera setup
      const width = containerRef.current.clientWidth || 800;
      const height = containerRef.current.clientHeight || 600;
      
      console.log('Container dimensions:', { width, height });
      
      if (width === 0 || height === 0) {
        console.error('Container has zero dimensions', { width, height });
        return false;
      }

      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(3, 3, 3);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x1a1a1a, 1);
      
      // Store the canvas element before appending
      const canvas = renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      
      containerRef.current.appendChild(canvas);
      rendererRef.current = renderer;

      console.log('Three.js scene initialized', { width, height, canvasSize: { w: canvas.width, h: canvas.height } });

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);

      // Handle window resize
      const handleResize = () => {
        const newWidth = containerRef.current?.clientWidth || width;
        const newHeight = containerRef.current?.clientHeight || height;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };

      window.addEventListener('resize', handleResize);

      // Animation loop
      let animationId: number;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();

      // Return cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationId);
        if (containerRef.current && canvas.parentNode === containerRef.current) {
          containerRef.current.removeChild(canvas);
        }
        renderer.dispose();
      };
    };

    // Try immediately first
    let cleanup = initScene();
    
    // If failed, retry with delays
    if (!cleanup) {
      const timer1 = setTimeout(() => {
        cleanup = initScene();
      }, 50);

      if (!cleanup) {
        const timer2 = setTimeout(() => {
          cleanup = initScene();
        }, 200);

        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
          if (cleanup) cleanup();
        };
      }

      return () => {
        clearTimeout(timer1);
        if (cleanup) cleanup();
      };
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [containerReady]);

  const createMesh = (color: number): THREE.Mesh => {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshPhongMaterial({ 
      color,
      emissive: 0x000000,
      shininess: 30,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  };

  const loadMeshData = (meshData: MeshFrame, isRider: boolean): void => {
    if (!sceneRef.current) return;

    console.log(`Loading mesh data for ${isRider ? 'rider' : 'reference'}`, {
      vertexCount: meshData.vertices.length,
      faceCount: meshData.faces.length,
    });

    // Create or update mesh
    // Rider: Red (#FF6B6B), Reference: Cyan (#4ECDC4)
    const riderColor = 0xFF6B6B;
    const referenceColor = 0x4ECDC4;

    let mesh = isRider ? riderMeshRef.current : referenceMeshRef.current;

    if (!mesh) {
      mesh = createMesh(isRider ? riderColor : referenceColor);
      sceneRef.current.add(mesh);
      if (isRider) {
        riderMeshRef.current = mesh;
      } else {
        referenceMeshRef.current = mesh;
      }
      console.log(`Created new mesh for ${isRider ? 'rider' : 'reference'}`);
    }

    // Update geometry
    const geometry = mesh.geometry as THREE.BufferGeometry;
    
    // Normalize and scale vertices for proper visualization
    const vertices = meshData.vertices;
    if (vertices.length > 0) {
      // Find bounds
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

      // Calculate center and scale
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      
      const sizeX = maxX - minX || 1;
      const sizeY = maxY - minY || 1;
      const sizeZ = maxZ - minZ || 1;
      const maxSize = Math.max(sizeX, sizeY, sizeZ);
      const scale = maxSize > 0 ? 2 / maxSize : 1; // Scale to fit in [-1, 1]

      console.log(`Mesh bounds: X[${minX}, ${maxX}] Y[${minY}, ${maxY}] Z[${minZ}, ${maxZ}], scale: ${scale}`);

      // Normalize vertices
      const normalizedVertices = vertices.map(([x, y, z]) => [
        (x - centerX) * scale,
        (y - centerY) * scale,
        (z - centerZ) * scale,
      ]);

      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(normalizedVertices.flat()), 3));

      // Set faces as indices
      if (meshData.faces && meshData.faces.length > 0) {
        const flatFaces = meshData.faces.flat();
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(flatFaces), 1));
      }

      // Compute normals for proper lighting
      geometry.computeVertexNormals();
    }

    geometry.computeBoundingBox();
  };

  const updateMeshPose = (meshData: MeshFrame, isRider: boolean): void => {
    const mesh = isRider ? riderMeshRef.current : referenceMeshRef.current;
    if (!mesh) return;

    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positionAttribute = geometry.getAttribute('position');

    if (positionAttribute && meshData.vertices) {
      // Normalize vertices the same way as loadMeshData
      const vertices = meshData.vertices;
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

      const normalizedVertices = vertices.map(([x, y, z]) => [
        (x - centerX) * scale,
        (y - centerY) * scale,
        (z - centerZ) * scale,
      ]);

      const positions = new Float32Array(normalizedVertices.flat());
      (positionAttribute as any).array = positions;
      positionAttribute.needsUpdate = true;
    }
  };

  const setMeshRotation = (rotation: { x: number; y: number; z: number }, isRider: boolean): void => {
    const mesh = isRider ? riderMeshRef.current : referenceMeshRef.current;
    if (!mesh) return;

    mesh.rotation.x = (rotation.x * Math.PI) / 180;
    mesh.rotation.y = (rotation.y * Math.PI) / 180;
    mesh.rotation.z = (rotation.z * Math.PI) / 180;
  };

  const setMeshVisibility = (visible: boolean, isRider: boolean): void => {
    const mesh = isRider ? riderMeshRef.current : referenceMeshRef.current;
    if (mesh) {
      mesh.visible = visible;
    }
  };

  const setMeshOpacity = (opacity: number, isRider: boolean): void => {
    const mesh = isRider ? riderMeshRef.current : referenceMeshRef.current;
    if (mesh && mesh.material instanceof THREE.MeshPhongMaterial) {
      mesh.material.opacity = opacity;
      mesh.material.transparent = opacity < 1;
    }
  };

  const resetCamera = (): void => {
    if (cameraRef.current) {
      cameraRef.current.position.set(3, 3, 3);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return {
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    loadMeshData,
    updateMeshPose,
    setMeshRotation,
    setMeshVisibility,
    setMeshOpacity,
    resetCamera,
  };
}
