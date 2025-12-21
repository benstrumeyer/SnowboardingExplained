import * as THREE from 'three';

/**
 * Normalize two mesh sequences to a shared coordinate space using PCA-based alignment
 */
export function normalizeSkeletons(
  riderMesh: THREE.Mesh,
  referenceMesh: THREE.Mesh
): void {
  // Get geometries
  const riderGeom = riderMesh.geometry as THREE.BufferGeometry;
  const refGeom = referenceMesh.geometry as THREE.BufferGeometry;

  // Get position attributes
  const riderPositions = riderGeom.getAttribute('position');
  const refPositions = refGeom.getAttribute('position');

  // Compute centers of mass
  const riderCenter = computeCenterOfMass(riderPositions as any);
  const refCenter = computeCenterOfMass(refPositions as any);

  // Translate both to origin
  translateGeometry(riderGeom, riderCenter.multiplyScalar(-1));
  translateGeometry(refGeom, refCenter.multiplyScalar(-1));

  // Compute principal axes using PCA
  const riderAxes = computePrincipalAxes(riderPositions as any);
  const refAxes = computePrincipalAxes(refPositions as any);

  // Compute rotation to align axes
  const riderRotation = new THREE.Matrix4();
  riderRotation.makeBasis(riderAxes.x, riderAxes.y, riderAxes.z);

  const refRotation = new THREE.Matrix4();
  refRotation.makeBasis(refAxes.x, refAxes.y, refAxes.z);

  // Apply rotations
  riderMesh.geometry.applyMatrix4(riderRotation.invert());
  referenceMesh.geometry.applyMatrix4(refRotation.invert());
}

function computeCenterOfMass(positions: THREE.BufferAttribute): THREE.Vector3 {
  const center = new THREE.Vector3();
  const count = positions.count;

  for (let i = 0; i < count; i++) {
    center.x += positions.getX(i);
    center.y += positions.getY(i);
    center.z += positions.getZ(i);
  }

  center.divideScalar(count);
  return center;
}

function translateGeometry(geometry: THREE.BufferGeometry, offset: THREE.Vector3): void {
  const positions = geometry.getAttribute('position');
  const count = positions.count;

  for (let i = 0; i < count; i++) {
    positions.setXYZ(
      i,
      positions.getX(i) + offset.x,
      positions.getY(i) + offset.y,
      positions.getZ(i) + offset.z
    );
  }

  positions.needsUpdate = true;
}

function computePrincipalAxes(positions: THREE.BufferAttribute) {
  const count = positions.count;
  const covariance = new Array(9).fill(0);

  // Compute covariance matrix
  for (let i = 0; i < count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    covariance[0] += x * x;
    covariance[1] += x * y;
    covariance[2] += x * z;
    covariance[3] += y * x;
    covariance[4] += y * y;
    covariance[5] += y * z;
    covariance[6] += z * x;
    covariance[7] += z * y;
    covariance[8] += z * z;
  }

  // Normalize
  for (let i = 0; i < 9; i++) {
    covariance[i] /= count;
  }

  // Compute eigenvectors (simplified - using power iteration)
  const x = new THREE.Vector3(1, 0, 0);
  const y = new THREE.Vector3(0, 1, 0);
  const z = new THREE.Vector3(0, 0, 1);

  // Power iteration for principal axis
  for (let iter = 0; iter < 10; iter++) {
    const newX = new THREE.Vector3(
      covariance[0] * x.x + covariance[1] * x.y + covariance[2] * x.z,
      covariance[3] * x.x + covariance[4] * x.y + covariance[5] * x.z,
      covariance[6] * x.x + covariance[7] * x.y + covariance[8] * x.z
    );
    x.copy(newX.normalize());
  }

  return { x, y, z };
}
