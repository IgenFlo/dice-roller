import type { ComboTier } from '../domain/combos';

export const COMBO_EFFECT_DURATION_MS = 3000;

/** Couleurs [cœur, extérieur] des flammes, partagées par le rendu 2D et 3D. */
export const COMBO_FLAME_COLORS: Readonly<Record<ComboTier, readonly [string, string]>> = {
  triple: ['#ffd54a', '#ff9100'],
  quad: ['#ff7a18', '#e01b1b'],
  quint: ['#5ec8ff', '#1e5bff'],
};

/** Nombre de particules de flamme émises par dé et par bouffée (rendu 3D). */
export const COMBO_FLAME_INTENSITY: Readonly<Record<ComboTier, number>> = {
  triple: 2,
  quad: 3,
  quint: 3,
};
