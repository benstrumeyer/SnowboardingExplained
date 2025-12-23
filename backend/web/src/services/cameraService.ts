import * as THREE from 'three';

export type CameraPreset = 'top' | 'front' | 'back' | 'left' | 'right';

/**
 * Camera Service
 * Manages camera controls and preset views
 */
export class CameraService {
  private camera: THREE.PerspectiveCamera;
  private targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private currentPreset: CameraPreset | 'free' = 'front';
  private animationDuration: number = 500; // milliseconds
  private isAnimating: boolean = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.setPreset('front');
  }

  /**
   * Get preset camera position
   */
  private getPresetPosition(preset: CameraPreset): THREE.Vector3 {
    const distance = 3;
    switch (preset) {
      case 'top':
        return new THREE.Vector3(0, distance * 2, 0);
      case 'front':
        return new THREE.Vector3(0, 0, distance);
      case 'back':
        return new THREE.Vector3(0, 0, -distance);
      case 'left':
        return new THREE.Vector3(-distance, 0, 0);
      case 'right':
        return new THREE.Vector3(distance, 0, 0);
      default:
        return new THREE.Vector3(0, 0, distance);
    }
  }

  /**
   * Set camera to preset view
   */
  setPreset(preset: CameraPreset): void {
    this.currentPreset = preset;
    const targetPos = this.getPresetPosition(preset);
    this.animateToPosition(targetPos);
  }

  /**
   * Animate camera to position
   */
  private animateToPosition(targetPos: THREE.Vector3): void {
    if (this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    const startPos = this.camera.position.clone();
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);

      // Easing function (ease-out-cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPos, targetPos, easeProgress);
      this.camera.lookAt(this.targetPosition);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Rotate camera manually
   */
  rotate(deltaX: number, deltaY: number): void {
    this.currentPreset = 'free';

    const radius = this.camera.position.length();
    let theta = Math.atan2(this.camera.position.x, this.camera.position.z);
    let phi = Math.acos(this.camera.position.y / radius);

    theta -= deltaX * 0.01;
    phi += deltaY * 0.01;

    // Clamp phi to avoid gimbal lock
    phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

    this.camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
    this.camera.position.y = radius * Math.cos(phi);
    this.camera.position.z = radius * Math.sin(phi) * Math.cos(theta);

    this.camera.lookAt(this.targetPosition);
  }

  /**
   * Zoom camera
   */
  zoom(direction: number): void {
    const currentDistance = this.camera.position.length();
    const newDistance = Math.max(0.5, Math.min(10, currentDistance + direction * 0.5));
    const scale = newDistance / currentDistance;

    this.camera.position.multiplyScalar(scale);
    this.camera.lookAt(this.targetPosition);
  }

  /**
   * Get current preset
   */
  getCurrentPreset(): CameraPreset | 'free' {
    return this.currentPreset;
  }

  /**
   * Reset camera to default view
   */
  reset(): void {
    this.setPreset('front');
  }
}
