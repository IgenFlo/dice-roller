import type { AnimationMode } from '../animation/throwSettings';
import { DEFAULT_DICE_COUNT, MAX_DICE_COUNT, MIN_DICE_COUNT } from '../domain/dice';
import { DEFAULT_DIE_APPEARANCE, type DieAppearance } from '../domain/dieAppearance';
import { DEFAULT_GAME_MODE, type GameMode } from '../domain/gameMode';
import { readJson, writeJson } from './localStore';

/**
 * Réglages d'affichage retrouvés d'une visite à l'autre sur le même appareil.
 * L'état de partie (valeurs, dés bloqués, historique) reste volatil.
 */
export interface Preferences {
  readonly diceCount: number;
  readonly appearance: DieAppearance;
  readonly animationMode: AnimationMode;
  readonly gameMode: GameMode;
}

export const DEFAULT_PREFERENCES: Preferences = {
  diceCount: DEFAULT_DICE_COUNT,
  appearance: DEFAULT_DIE_APPEARANCE,
  animationMode: '2d',
  gameMode: DEFAULT_GAME_MODE,
};

const STORAGE_KEY = 'dice-roller.preferences';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function loadPreferences(): Preferences {
  return parsePreferences(readJson(STORAGE_KEY));
}

export function savePreferences(preferences: Preferences): void {
  writeJson(STORAGE_KEY, preferences);
}

/**
 * Le contenu stocké peut dater d'une version antérieure ou avoir été édité à la
 * main : chaque champ est validé isolément et retombe sur son défaut.
 */
function parsePreferences(value: unknown): Preferences {
  if (typeof value !== 'object' || value === null) return DEFAULT_PREFERENCES;
  const stored = value as Partial<Record<keyof Preferences, unknown>>;
  return {
    diceCount: parseDiceCount(stored.diceCount),
    appearance: parseAppearance(stored.appearance),
    animationMode: stored.animationMode === '3d' || stored.animationMode === '2d'
      ? stored.animationMode
      : DEFAULT_PREFERENCES.animationMode,
    gameMode: stored.gameMode === 'photos' || stored.gameMode === 'classic'
      ? stored.gameMode
      : DEFAULT_PREFERENCES.gameMode,
  };
}

function parseDiceCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return DEFAULT_PREFERENCES.diceCount;
  if (value < MIN_DICE_COUNT || value > MAX_DICE_COUNT) return DEFAULT_PREFERENCES.diceCount;
  return value;
}

function parseAppearance(value: unknown): DieAppearance {
  if (typeof value !== 'object' || value === null) return DEFAULT_DIE_APPEARANCE;
  const stored = value as Partial<Record<keyof DieAppearance, unknown>>;
  return {
    background: parseColor(stored.background, DEFAULT_DIE_APPEARANCE.background),
    pipColor: parseColor(stored.pipColor, DEFAULT_DIE_APPEARANCE.pipColor),
  };
}

function parseColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value : fallback;
}
