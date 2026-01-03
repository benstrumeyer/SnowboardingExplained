import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MeshNametagProps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  text: string;
  position?: [number, number, number];
  fontSize?: number;
  color?: string;
}

export const MeshNametag: React.FC<MeshNametagProps> = ({
  scene,
  camera,
  text,
  position = [0, 2.5, 0],
  fontSize = 64,
  color = '#4ECDC4',
}) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const canvasTextureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (!text || text.trim() === '') {
      if (groupRef.current) {
        scene.remove(groupRef.current);
        groupRef.current = null;
      }
      return;
    }

    if (groupRef.current) {
      scene.remove(groupRef.current);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    canvasTextureRef.current = texture;

    const geometry = new THREE.PlaneGeometry(4, 1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);

    const group = new THREE.Group();
    group.add(mesh);
    group.name = 'mesh-nametag';

    scene.add(group);
    groupRef.current = group;

    return () => {
      if (groupRef.current) {
        scene.remove(groupRef.current);
        groupRef.current = null;
      }
      texture.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [text, scene, position, fontSize, color]);

  return null;
};
