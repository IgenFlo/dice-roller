import type { RandomSource } from '../domain/dice';
import type { ThrowSettings } from './throwSettings';

export interface ThrowArena {
  readonly width: number;
  readonly height: number;
  readonly dieSize: number;
}

export interface ThrownDie {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly angle: number;
  readonly angularVelocity: number;
  readonly height: number;
  readonly verticalVelocity: number;
  readonly stopped: boolean;
}

// Unités : positions/vitesses en px et px/s, angles en degrés, `height` est une
// hauteur simulée au-dessus du plateau (vue de dessus) rendue via le scale.
const LAUNCH_SPEED_FACTOR = 1.6;
const LAUNCH_SPREAD_RADIANS = 1.2;
const INITIAL_HEIGHT = 20;
const GRAVITY = 2600;
const HEIGHT_RESTITUTION_FACTOR = 0.8;
const MIN_BOUNCE_VERTICAL_SPEED = 120;
const WALL_SPIN_LOSS = 0.8;
const GROUND_FRICTION = 3.2;
const AIR_FRICTION = 0.5;
const SPIN_FRICTION = 2.6;
const STOP_LINEAR_SPEED = 28;
const STOP_ANGULAR_SPEED = 45;
const LIFT_SCALE_PER_HEIGHT = 0.0035;

export function createThrownDie(
  id: number,
  arena: ThrowArena,
  settings: ThrowSettings,
  random: RandomSource,
): ThrownDie {
  const launchSpeed =
    (0.9 + random() * 0.5) *
    Math.min(arena.width, arena.height) *
    LAUNCH_SPEED_FACTOR *
    settings.launchPower;
  const direction = -Math.PI / 2 + (random() - 0.5) * LAUNCH_SPREAD_RADIANS;
  return {
    id,
    x: arena.width * (0.2 + random() * 0.6),
    y: arena.height - arena.dieSize / 2,
    velocityX: Math.cos(direction) * launchSpeed,
    velocityY: Math.sin(direction) * launchSpeed,
    angle: 0,
    angularVelocity: (random() - 0.5) * 1600 * settings.launchPower,
    height: INITIAL_HEIGHT,
    verticalVelocity: (150 + random() * 250) * settings.launchPower,
    stopped: false,
  };
}

export function stepThrownDie(
  die: ThrownDie,
  arena: ThrowArena,
  settings: ThrowSettings,
  deltaSeconds: number,
): ThrownDie {
  if (die.stopped) return die;

  const gravity = GRAVITY * settings.gravity;
  let height = die.height + die.verticalVelocity * deltaSeconds;
  let verticalVelocity = die.verticalVelocity - gravity * deltaSeconds;
  if (height <= 0) {
    height = 0;
    // Vitesse réelle au contact, déduite de l'énergie : la vitesse de fin de frame
    // inclut la gravité appliquée sous le sol et entretiendrait un rebond infini.
    const impactSpeed = Math.sqrt(die.verticalVelocity ** 2 + 2 * gravity * Math.max(die.height, 0));
    verticalVelocity =
      impactSpeed > MIN_BOUNCE_VERTICAL_SPEED
        ? impactSpeed * settings.bounciness * HEIGHT_RESTITUTION_FACTOR
        : 0;
  }

  const frictionRate = (height > 0 ? AIR_FRICTION : GROUND_FRICTION) * settings.friction;
  const damping = Math.exp(-frictionRate * deltaSeconds);
  let velocityX = die.velocityX * damping;
  let velocityY = die.velocityY * damping;
  let angularVelocity =
    die.angularVelocity * Math.exp(-SPIN_FRICTION * settings.friction * deltaSeconds);

  let x = die.x + velocityX * deltaSeconds;
  let y = die.y + velocityY * deltaSeconds;
  const halfSize = arena.dieSize / 2;
  if (x < halfSize) {
    x = halfSize;
    velocityX = Math.abs(velocityX) * settings.bounciness;
    angularVelocity *= WALL_SPIN_LOSS;
  } else if (x > arena.width - halfSize) {
    x = arena.width - halfSize;
    velocityX = -Math.abs(velocityX) * settings.bounciness;
    angularVelocity *= WALL_SPIN_LOSS;
  }
  if (y < halfSize) {
    y = halfSize;
    velocityY = Math.abs(velocityY) * settings.bounciness;
    angularVelocity *= WALL_SPIN_LOSS;
  } else if (y > arena.height - halfSize) {
    y = arena.height - halfSize;
    velocityY = -Math.abs(velocityY) * settings.bounciness;
    angularVelocity *= WALL_SPIN_LOSS;
  }

  const angle = die.angle + angularVelocity * deltaSeconds;
  const stopped =
    height === 0 &&
    verticalVelocity === 0 &&
    Math.hypot(velocityX, velocityY) < STOP_LINEAR_SPEED &&
    Math.abs(angularVelocity) < STOP_ANGULAR_SPEED;

  return {
    id: die.id,
    x,
    y,
    velocityX,
    velocityY,
    angle,
    angularVelocity,
    height,
    verticalVelocity,
    stopped,
  };
}

export function resolveDiceCollisions(
  dice: readonly ThrownDie[],
  arena: ThrowArena,
  settings: ThrowSettings,
): ThrownDie[] {
  const result = dice.map(die => ({ ...die }));
  const minDistance = arena.dieSize * 0.95;

  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i];
      const b = result[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0 || distance >= minDistance) continue;

      const normalX = dx / distance;
      const normalY = dy / distance;
      const overlap = (minDistance - distance) / 2;
      a.x -= normalX * overlap;
      a.y -= normalY * overlap;
      b.x += normalX * overlap;
      b.y += normalY * overlap;

      const approachSpeed =
        (a.velocityX - b.velocityX) * normalX + (a.velocityY - b.velocityY) * normalY;
      if (approachSpeed <= 0) continue;

      const impulse = (approachSpeed * (1 + settings.bounciness)) / 2;
      a.velocityX -= impulse * normalX;
      a.velocityY -= impulse * normalY;
      b.velocityX += impulse * normalX;
      b.velocityY += impulse * normalY;
      a.stopped = false;
      b.stopped = false;
    }
  }

  return result;
}

export function thrownDieLiftScale(die: ThrownDie): number {
  return 1 + die.height * LIFT_SCALE_PER_HEIGHT;
}
