import * as THREE from 'three';
import type { DieAppearance } from '../../domain/dieAppearance';
import { PIP_LAYOUTS, PIP_RADIUS } from '../../domain/dieFaces';
import { FACE_VALUES } from './dieOrientation';

const TEXTURE_SIZE = 128;

function createFaceTexture(value: number, appearance: DieAppearance): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.fillStyle = appearance.background;
    context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    context.fillStyle = appearance.pipColor;
    for (const [x, y] of PIP_LAYOUTS[value] ?? []) {
      context.beginPath();
      context.arc(
        (x / 100) * TEXTURE_SIZE,
        (y / 100) * TEXTURE_SIZE,
        (PIP_RADIUS / 100) * TEXTURE_SIZE,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createDieMaterials(appearance: DieAppearance): THREE.MeshStandardMaterial[] {
  return FACE_VALUES.map(
    value =>
      new THREE.MeshStandardMaterial({
        map: createFaceTexture(value, appearance),
        roughness: 0.45,
        metalness: 0.05,
      }),
  );
}

export function disposeDieMaterials(materials: readonly THREE.MeshStandardMaterial[]): void {
  for (const material of materials) {
    material.map?.dispose();
    material.dispose();
  }
}
