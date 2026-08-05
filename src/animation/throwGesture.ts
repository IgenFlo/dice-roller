/**
 * Lancer visé au doigt : direction et puissance déduites d'un swipe.
 *
 * Repère écran (x vers la droite, y vers le bas) : un swipe vers le haut a donc
 * un `directionY` négatif. La direction est normalisée, la puissance est un
 * multiplicateur appliqué au réglage « puissance du lancer ».
 */
export interface ThrowImpulse {
  readonly directionX: number;
  readonly directionY: number;
  readonly power: number;
}

export interface PointerSample {
  readonly x: number;
  readonly y: number;
  readonly time: number;
}

/**
 * Seul le geste des dernières millisecondes compte : un doigt immobilisé avant
 * le relâchement ne produit plus d'impulsion, et le lancer repart par défaut.
 */
const SWIPE_WINDOW_MS = 120;

const MIN_SWIPE_SPEED = 400;
const MAX_SWIPE_SPEED = 3200;
const MIN_SWIPE_POWER = 0.6;
const MAX_SWIPE_POWER = 2.4;
/** Au-delà, le geste est trop horizontal : les dés glisseraient le long du bord. */
const MAX_TILT_RADIANS = Math.PI / 3;

export function appendSample(
  samples: readonly PointerSample[],
  sample: PointerSample,
): PointerSample[] {
  return [...withinWindow(samples, sample.time), sample];
}

/** `null` quand le geste n'est pas un swipe vers le haut assez franc. */
export function swipeImpulse(
  samples: readonly PointerSample[],
  now: number,
): ThrowImpulse | null {
  const recent = withinWindow(samples, now);
  if (recent.length < 2) return null;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const seconds = (last.time - first.time) / 1000;
  if (seconds <= 0) return null;

  const velocityX = (last.x - first.x) / seconds;
  const velocityY = (last.y - first.y) / seconds;
  if (velocityY >= 0) return null;

  const speed = Math.hypot(velocityX, velocityY);
  if (speed < MIN_SWIPE_SPEED) return null;

  const tilt = clamp(Math.atan2(velocityX, -velocityY), -MAX_TILT_RADIANS, MAX_TILT_RADIANS);
  const progress =
    (Math.min(speed, MAX_SWIPE_SPEED) - MIN_SWIPE_SPEED) / (MAX_SWIPE_SPEED - MIN_SWIPE_SPEED);
  return {
    directionX: Math.sin(tilt),
    directionY: -Math.cos(tilt),
    power: MIN_SWIPE_POWER + progress * (MAX_SWIPE_POWER - MIN_SWIPE_POWER),
  };
}

function withinWindow(samples: readonly PointerSample[], now: number): PointerSample[] {
  return samples.filter(sample => now - sample.time <= SWIPE_WINDOW_MS);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
