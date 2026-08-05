import { FACE_COUNT, randomFaceValue, type Die, type RandomSource } from './dice';

export type ComboTier = 'triple' | 'quad' | 'quint';

export const COMBO_SIZES: Readonly<Record<ComboTier, number>> = {
  triple: 3,
  quad: 4,
  quint: 5,
};

export const TESTABLE_COMBO_SIZES: readonly number[] = [
  COMBO_SIZES.triple,
  COMBO_SIZES.quad,
  COMBO_SIZES.quint,
];

export interface Combo {
  readonly tier: ComboTier;
  readonly value: number;
  readonly dieIds: readonly number[];
}

/** Plus grand groupe de dés identiques, à partir de 3. */
export function findCombo(dice: readonly Die[]): Combo | null {
  const idsByValue = new Map<number, number[]>();
  for (const die of dice) {
    const ids = idsByValue.get(die.value) ?? [];
    ids.push(die.id);
    idsByValue.set(die.value, ids);
  }

  let best: { value: number; ids: number[] } | null = null;
  for (const [value, ids] of idsByValue) {
    if (ids.length < COMBO_SIZES.triple) continue;
    if (best === null || ids.length > best.ids.length) best = { value, ids };
  }
  if (best === null) return null;

  return { tier: tierForSize(best.ids.length), value: best.value, dieIds: best.ids };
}

function tierForSize(size: number): ComboTier {
  if (size >= COMBO_SIZES.quint) return 'quint';
  if (size >= COMBO_SIZES.quad) return 'quad';
  return 'triple';
}

/**
 * Valeurs garantissant exactement `comboSize` dés identiques : les dés restants
 * sont répartis sur les autres faces pour ne jamais former un groupe plus grand.
 */
export function forceCombination(
  dice: readonly Die[],
  comboSize: number,
  random: RandomSource = Math.random,
): Record<number, number> {
  const comboValue = randomFaceValue(random);
  const fillerValues = Array.from({ length: FACE_COUNT }, (_, index) => index + 1).filter(
    value => value !== comboValue,
  );
  return Object.fromEntries(
    dice.map((die, index) => [
      die.id,
      index < comboSize ? comboValue : fillerValues[(index - comboSize) % fillerValues.length],
    ]),
  );
}
