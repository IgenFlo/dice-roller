export const MIN_DICE_COUNT = 1;
export const MAX_DICE_COUNT = 10;
export const DEFAULT_DICE_COUNT = 1;
export const FACE_COUNT = 6;

export const INITIAL_FACE_VALUE = 1;

export interface Die {
  readonly id: number;
  readonly value: number;
  readonly isHeld: boolean;
}

export type RandomSource = () => number;

export function createDice(count: number): Die[] {
  const clampedCount = clampDiceCount(count);
  return Array.from({ length: clampedCount }, (_, index) => createDie(index));
}

export function rollDice(dice: readonly Die[], random: RandomSource = Math.random): Die[] {
  return dice.map(die => (die.isHeld ? die : { ...die, value: randomFaceValue(random) }));
}

export function randomFaceValue(random: RandomSource = Math.random): number {
  return Math.floor(random() * FACE_COUNT) + 1;
}

export function toggleHold(dice: readonly Die[], dieId: number): Die[] {
  return dice.map(die => (die.id === dieId ? { ...die, isHeld: !die.isHeld } : die));
}

export function resizeDice(dice: readonly Die[], targetCount: number): Die[] {
  const clampedCount = clampDiceCount(targetCount);
  if (clampedCount <= dice.length) {
    return dice.slice(0, clampedCount);
  }
  const firstNewId = dice.reduce((maxId, die) => Math.max(maxId, die.id), -1) + 1;
  const newDice = Array.from({ length: clampedCount - dice.length }, (_, index) =>
    createDie(firstNewId + index),
  );
  return [...dice, ...newDice];
}

function createDie(id: number): Die {
  return { id, value: INITIAL_FACE_VALUE, isHeld: false };
}

function clampDiceCount(count: number): number {
  return Math.min(MAX_DICE_COUNT, Math.max(MIN_DICE_COUNT, count));
}
