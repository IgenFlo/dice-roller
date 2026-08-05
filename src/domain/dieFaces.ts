export type PipPosition = readonly [number, number];

const LEFT = 26;
const CENTER = 50;
const RIGHT = 74;
const TOP = 26;
const MIDDLE = 50;
const BOTTOM = 74;

// Coordonnées en pourcentage de la face, partagées par le rendu SVG (2D)
// et la génération de textures (3D).
export const PIP_LAYOUTS: Readonly<Record<number, readonly PipPosition[]>> = {
  1: [[CENTER, MIDDLE]],
  2: [[LEFT, TOP], [RIGHT, BOTTOM]],
  3: [[LEFT, TOP], [CENTER, MIDDLE], [RIGHT, BOTTOM]],
  4: [[LEFT, TOP], [RIGHT, TOP], [LEFT, BOTTOM], [RIGHT, BOTTOM]],
  5: [[LEFT, TOP], [RIGHT, TOP], [CENTER, MIDDLE], [LEFT, BOTTOM], [RIGHT, BOTTOM]],
  6: [[LEFT, TOP], [RIGHT, TOP], [LEFT, MIDDLE], [RIGHT, MIDDLE], [LEFT, BOTTOM], [RIGHT, BOTTOM]],
};

export const PIP_RADIUS = 9;
