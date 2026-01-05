import * as THREE from 'three';

export type CameraPreset = 'top' | 'front' | 'back' | 'left' | 'right';

interface RegisteredCamera {
  camera: THREE.PerspectiveCamera;
  targetPosition: THREE.Vector3;
  onPresetChange?: (preset: CameraPreset) => void;
}

class GlobalCameraManager {
  private cameras: Map<string, RegisteredCamera> = new Map();
  private currentPreset: CameraPreset = 'front';
  private animationDuration: number = 500;

  registerCamera(id: string, camera: THREE.PerspectiveCamera, targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    this.cameras.set(id, {
      camera,
      targetPosition,
    });
    console.log(`[GlobalCameraManager] Registered camera: ${id}`);
  }

  unregisterCamera(id: string) {
    this.cameras.delete(id);
    console.log(`[GlobalCameraManager] Unregistered camera: ${id}`);
  }

  private getPresetPosition(preset: CameraPreset, targetPosition: THREE.Vector3): THREE.Vector3 {
    const distance = 3;
    switch (preset) {
      case 'top':
        return new THREE.Vector3(targetPosition.x, targetPosition.y + distance * 2, targetPosition.z);
      case 'front':
        return new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z - distance);
      case 'back':
        return new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z + distance);
      case 'left':
        return new THREE.Vector3(targetPosition.x - distance, targetPosition.y, targetPosition.z);
      case 'right':
        return new THREE.Vector3(targetPosition.x + distance, targetPosition.y, targetPosition.z);
      default:
        return new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z - distance);
    }
  }

  private animateCameraToPosition(camera: THREE.PerspectiveCamera, targetPos: THREE.Vector3, lookAtPos: THREE.Vector3): void {
    const startPos = camera.position.clone();
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);

      const easeProgress = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, targetPos, easeProgress);
      camera.lookAt(lookAtPos);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  setPreset(preset: CameraPreset) {
    this.currentPreset = preset;
    console.log(`[GlobalCameraManager] Setting preset to: ${preset} for ${this.cameras.size} cameras`);

    this.cameras.forEach((registered, id) => {
      const targetPos = this.getPresetPosition(preset, registered.targetPosition);
      this.animateCameraToPosition(registered.camera, targetPos, registered.targetPosition);
      registered.onPresetChange?.(preset);
    });
  }

  getCurrentPreset(): CameraPreset {
    return this.currentPreset;
  }

  reset() {
    this.setPreset('front');
  }
}

export const globalCameraManager = new GlobalCameraManager();
