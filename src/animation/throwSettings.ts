export type AnimationMode = '2d' | '3d';

export interface ThrowSettings {
  readonly launchPower: number;
  readonly bounciness: number;
  readonly friction: number;
}

export const DEFAULT_THROW_SETTINGS: ThrowSettings = {
  launchPower: 1,
  bounciness: 0.55,
  friction: 1,
};
