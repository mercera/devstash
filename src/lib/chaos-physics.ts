/**
 * Motion for the homepage's floating "chaos" icons. Pure functions, so
 * `ChaosField` only has to drive the loop and write transforms.
 *
 * Velocities are in pixels per frame at 60fps; `dt` scales them by how many
 * frames actually passed.
 */

export interface ChaosBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  /** The speed a body drifts at, and eases back to after a push. */
  cruise: number;
  /** Offset for the rotation and scale pulse, so bodies are out of step. */
  phase: number;
}

export interface Bounds {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export const FRAME_MS = 1000 / 60;
/** A long pause (tab switch, scrolled away) must not teleport the icons. */
export const MAX_FRAME_STEP = 3;
export const REPEL_RADIUS = 110;
export const REPEL_FORCE = 0.9;
export const MAX_SPEED = 5;

const MIN_CRUISE = 0.35;
const CRUISE_RANGE = 0.35;
const SLOW_DOWN_RATE = 0.04;
const SPEED_UP_RATE = 0.02;

/** Frames elapsed since the last tick, capped. `null` means the first tick. */
export function frameStep(elapsedMs: number | null): number {
  if (elapsedMs === null) return 1;
  return Math.min(Math.max(elapsedMs, 0) / FRAME_MS, MAX_FRAME_STEP);
}

/** A body at a clamped start position, heading in a random direction. */
export function createBody(
  start: Point,
  size: number,
  bounds: Bounds,
  random: () => number = Math.random,
): ChaosBody {
  const angle = random() * Math.PI * 2;
  const cruise = MIN_CRUISE + random() * CRUISE_RANGE;
  return {
    x: clamp(start.x, 0, bounds.width - size),
    y: clamp(start.y, 0, bounds.height - size),
    vx: Math.cos(angle) * cruise,
    vy: Math.sin(angle) * cruise,
    size,
    cruise,
    phase: random() * Math.PI * 2,
  };
}

/** Advances a body by `dt` frames: repel, ease to cruise speed, move, bounce. */
export function stepBody(
  body: ChaosBody,
  dt: number,
  bounds: Bounds,
  pointer: Point | null,
): ChaosBody {
  let { vx, vy } = repel(body, dt, pointer);
  ({ vx, vy } = easeSpeed(vx, vy, body.cruise, dt));

  const x = bounce(body.x + vx * dt, vx, bounds.width - body.size);
  const y = bounce(body.y + vy * dt, vy, bounds.height - body.size);

  return { ...body, x: x.position, y: y.position, vx: x.velocity, vy: y.velocity };
}

/** The pulse at `time` ms, as a CSS transform for the body's position. */
export function bodyTransform(body: ChaosBody, time: number): string {
  const rotate = Math.sin(time * 0.0008 + body.phase) * 12;
  const scale = 1 + Math.sin(time * 0.0016 + body.phase) * 0.06;
  return (
    `translate(${body.x.toFixed(1)}px, ${body.y.toFixed(1)}px) ` +
    `rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(3)})`
  );
}

function repel(body: ChaosBody, dt: number, pointer: Point | null) {
  let { vx, vy } = body;
  if (!pointer) return { vx, vy };

  const dx = body.x + body.size / 2 - pointer.x;
  const dy = body.y + body.size / 2 - pointer.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= REPEL_RADIUS) return { vx, vy };

  // A pointer dead on the centre has no direction, so push straight up.
  const [ux, uy] = distance === 0 ? [0, -1] : [dx / distance, dy / distance];
  const push = (1 - distance / REPEL_RADIUS) * REPEL_FORCE * dt;
  vx += ux * push;
  vy += uy * push;
  return { vx, vy };
}

function easeSpeed(vx: number, vy: number, cruise: number, dt: number) {
  const speed = Math.hypot(vx, vy);
  if (speed === 0) return { vx, vy };

  const eased =
    speed > cruise
      ? Math.max(cruise, speed * (1 - SLOW_DOWN_RATE * dt))
      : Math.min(cruise, speed * (1 + SPEED_UP_RATE * dt));
  const ratio = Math.min(eased, MAX_SPEED) / speed;
  return { vx: vx * ratio, vy: vy * ratio };
}

function bounce(position: number, velocity: number, max: number) {
  if (position < 0) return { position: 0, velocity: Math.abs(velocity) };
  if (position > max) return { position: max, velocity: -Math.abs(velocity) };
  return { position, velocity };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
