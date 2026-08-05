/**
 * `classic` : dés à points, avec combinaisons, flammes et analyse Yam's.
 * `photos` : les faces portent les photos du joueur, sans aucun effet de
 * combinaison — un 6 n'y a pas plus de sens qu'un 3.
 */
export type GameMode = 'classic' | 'photos';

export const DEFAULT_GAME_MODE: GameMode = 'classic';

export const GAME_MODE_LABELS: Readonly<Record<GameMode, string>> = {
  classic: 'Classique',
  photos: 'Photos',
};
