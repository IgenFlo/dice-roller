import { FACE_COUNT, type Die } from './dice';

/** Nombre de dés de chaque face, indexé de 1 à 6 (l'indice 0 est inutilisé). */
export type FaceCounts = readonly number[];

export const YAMS_DICE_COUNT = 5;
const BONUS_FACE_THRESHOLD = 3;

export const FULL_SCORE = 25;
export const SMALL_RUN_SCORE = 30;
export const LARGE_RUN_SCORE = 40;
export const YAMS_SCORE = 50;

export function countFaces(values: readonly number[]): FaceCounts {
  const counts = new Array<number>(FACE_COUNT + 1).fill(0);
  for (const value of values) counts[value]++;
  return counts;
}

export function diceValues(dice: readonly Die[]): number[] {
  return dice.map(die => die.value);
}

function highestFaceCount(counts: FaceCounts): number {
  return Math.max(...counts.slice(1));
}

function hasRun(counts: FaceCounts, length: number): boolean {
  for (let start = 1; start + length - 1 <= FACE_COUNT; start++) {
    let complete = true;
    for (let offset = 0; offset < length; offset++) {
      if (counts[start + offset] === 0) complete = false;
    }
    if (complete) return true;
  }
  return false;
}

function fullValues(counts: FaceCounts): { three: number; two: number } | null {
  const three = counts.findIndex((count, face) => face > 0 && count === 3);
  const two = counts.findIndex((count, face) => face > 0 && count === 2);
  return three > 0 && two > 0 ? { three, two } : null;
}

function sumOfFace(face: number, count: number): number {
  return face * count;
}

/** Un objectif est réussi ou non : c'est ce qui permet d'en calculer la probabilité. */
export interface YamsObjective {
  readonly id: string;
  readonly label: string;
  readonly isAchieved: (counts: FaceCounts) => boolean;
}

const LOWER_OBJECTIVES: readonly YamsObjective[] = [
  { id: 'three-of-a-kind', label: 'Brelan', isAchieved: counts => highestFaceCount(counts) >= 3 },
  { id: 'four-of-a-kind', label: 'Carré', isAchieved: counts => highestFaceCount(counts) >= 4 },
  { id: 'full-house', label: 'Full', isAchieved: counts => fullValues(counts) !== null },
  { id: 'small-run', label: 'Petite suite', isAchieved: counts => hasRun(counts, 4) },
  { id: 'large-run', label: 'Grande suite', isAchieved: counts => hasRun(counts, 5) },
  { id: 'yams', label: "Yam's", isAchieved: counts => highestFaceCount(counts) === YAMS_DICE_COUNT },
];

// Le bonus de 63 points suppose trois dés de chaque face : c'est le seuil utile
// à viser sur la partie haute.
const UPPER_OBJECTIVES: readonly YamsObjective[] = Array.from(
  { length: FACE_COUNT },
  (_, index) => {
    const face = index + 1;
    return {
      id: `upper-${face}`,
      label: `Trois ${face}`,
      isAchieved: (counts: FaceCounts) => counts[face] >= BONUS_FACE_THRESHOLD,
    };
  },
);

export const YAMS_OBJECTIVES: readonly YamsObjective[] = [
  ...LOWER_OBJECTIVES,
  ...UPPER_OBJECTIVES,
];

export interface ObtainedCombination {
  readonly id: string;
  readonly label: string;
  readonly score: number;
  /** La partie haute s'énonce « 16 aux 4 », la partie basse « Brelan 12 ». */
  readonly section: 'upper' | 'lower';
}

/** Combinaisons réellement présentes dans le tirage, avec les points qu'elles rapportent. */
export function findObtainedCombinations(values: readonly number[]): ObtainedCombination[] {
  const counts = countFaces(values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const obtained: ObtainedCombination[] = [];

  const bestFace = counts.findIndex(count => count === highestFaceCount(counts));
  const bestCount = highestFaceCount(counts);

  if (bestCount === YAMS_DICE_COUNT) {
    obtained.push({ id: 'yams', label: "Yam's", score: YAMS_SCORE, section: 'lower' });
  }
  if (bestCount >= 4) {
    obtained.push({
      id: 'four-of-a-kind',
      label: 'Carré',
      score: sumOfFace(bestFace, 4),
      section: 'lower',
    });
  }
  if (bestCount >= 3) {
    obtained.push({
      id: 'three-of-a-kind',
      label: 'Brelan',
      score: sumOfFace(bestFace, 3),
      section: 'lower',
    });
  }
  if (fullValues(counts) !== null) {
    obtained.push({ id: 'full-house', label: 'Full', score: FULL_SCORE, section: 'lower' });
  }
  if (hasRun(counts, 5)) {
    obtained.push({
      id: 'large-run',
      label: 'Grande suite',
      score: LARGE_RUN_SCORE,
      section: 'lower',
    });
  }
  if (hasRun(counts, 4)) {
    obtained.push({
      id: 'small-run',
      label: 'Petite suite',
      score: SMALL_RUN_SCORE,
      section: 'lower',
    });
  }
  obtained.push({ id: 'chance', label: 'Chance', score: total, section: 'lower' });

  for (let face = FACE_COUNT; face >= 1; face--) {
    if (counts[face] === 0) continue;
    obtained.push({
      id: `upper-${face}`,
      label: `aux ${face}`,
      score: sumOfFace(face, counts[face]),
      section: 'upper',
    });
  }

  return obtained;
}
