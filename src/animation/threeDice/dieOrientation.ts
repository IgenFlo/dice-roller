import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

// Ordre des 6 matériaux d'une BoxGeometry : +x, −x, +y, −y, +z, −z.
// Les faces opposées somment à 7, comme sur un dé réel.
export const FACE_VALUES: readonly number[] = [1, 6, 2, 5, 3, 4];

const LOCAL_FACE_NORMALS: readonly THREE.Vector3[] = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

export function getUpFaceValue(quaternion: THREE.Quaternion): number {
  let bestValue: number = FACE_VALUES[0];
  let bestAlignment = -Infinity;
  LOCAL_FACE_NORMALS.forEach((normal, index) => {
    const alignment = normal.clone().applyQuaternion(quaternion).dot(UP);
    if (alignment > bestAlignment) {
      bestAlignment = alignment;
      bestValue = FACE_VALUES[index];
    }
  });
  return bestValue;
}

export function quaternionForValueUp(value: number): THREE.Quaternion {
  const index = FACE_VALUES.indexOf(value);
  const normal = LOCAL_FACE_NORMALS[index] ?? LOCAL_FACE_NORMALS[2];
  return new THREE.Quaternion().setFromUnitVectors(normal, UP);
}
