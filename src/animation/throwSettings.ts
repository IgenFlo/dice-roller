export type AnimationMode = '2d' | '3d';

export interface ThrowSettings {
  readonly launchPower: number;
  readonly bounciness: number;
  readonly friction: number;
  readonly gravity: number;
}

export const DEFAULT_THROW_SETTINGS: ThrowSettings = {
  launchPower: 1,
  bounciness: 0.55,
  friction: 1,
  gravity: 1,
};

export interface ThrowSettingRange {
  readonly key: keyof ThrowSettings;
  readonly label: string;
  readonly min: number;
  readonly max: number;
}

/**
 * Plages volontairement larges pour expérimenter. La gravité garde un plancher :
 * à zéro les dés flotteraient sans jamais se poser.
 */
export const THROW_SETTING_RANGES: readonly ThrowSettingRange[] = [
  { key: 'launchPower', label: 'Puissance du lancer', min: 0, max: 3 },
  { key: 'bounciness', label: 'Rebond', min: 0, max: 0.95 },
  { key: 'friction', label: 'Friction', min: 0, max: 4 },
  { key: 'gravity', label: 'Gravité', min: 0.1, max: 3 },
];

export const THROW_SETTING_STEP = 0.01;
