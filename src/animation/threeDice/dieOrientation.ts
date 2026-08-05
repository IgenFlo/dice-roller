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

export interface UpFace {
  readonly value: number;
  /** 1 = face parfaitement horizontale, ~0.71 = dé posé sur une arête. */
  readonly alignment: number;
}

export function getUpFace(quaternion: THREE.Quaternion): UpFace {
  let value: number = FACE_VALUES[0];
  let alignment = -Infinity;
  LOCAL_FACE_NORMALS.forEach((normal, index) => {
    const candidate = normal.clone().applyQuaternion(quaternion).dot(UP);
    if (candidate > alignment) {
      alignment = candidate;
      value = FACE_VALUES[index];
    }
  });
  return { value, alignment };
}

export function quaternionForValueUp(value: number): THREE.Quaternion {
  const index = FACE_VALUES.indexOf(value);
  const normal = LOCAL_FACE_NORMALS[index] ?? LOCAL_FACE_NORMALS[2];
  return new THREE.Quaternion().setFromUnitVectors(normal, UP);
}
