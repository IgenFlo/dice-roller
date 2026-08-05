import type { Die } from './dice';

export type ComboTier = 'triple' | 'quad' | 'quint';

export const COMBO_SIZES: Readonly<Record<ComboTier, number>> = {
  triple: 3,
  quad: 4,
  quint: 5,
};

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
 * Part de la combinaison portée par les dés bloqués : eux seuls conservent leur
 * valeur au lancer suivant, donc eux seuls continuent de brûler. Le palier reste
 * celui de la combinaison obtenue.
 */
export function keepComboOnHeldDice(combo: Combo, dice: readonly Die[]): Combo | null {
  const heldIds = new Set(dice.filter(die => die.isHeld).map(die => die.id));
  const dieIds = combo.dieIds.filter(dieId => heldIds.has(dieId));
  return dieIds.length === 0 ? null : { ...combo, dieIds };
}
