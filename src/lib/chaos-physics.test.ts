import { describe, expect, it } from "vitest";

import {
  bodyTransform,
  createBody,
  frameStep,
  MAX_FRAME_STEP,
  MAX_SPEED,
  REPEL_RADIUS,
  stepBody,
  type ChaosBody,
} from "./chaos-physics";

const BOUNDS = { width: 100, height: 100 };

/** A body whose cruise speed equals its speed, so easing leaves it alone. */
function body(overrides: Partial<ChaosBody> = {}): ChaosBody {
  const vx = overrides.vx ?? 0;
  const vy = overrides.vy ?? 0;
  return {
    x: 45,
    y: 45,
    vx,
    vy,
    size: 10,
    cruise: Math.hypot(vx, vy),
    phase: 0,
    ...overrides,
  };
}

const speed = (b: ChaosBody) => Math.hypot(b.vx, b.vy);

describe("frameStep", () => {
  it("treats the first tick as one frame", () => {
    expect(frameStep(null)).toBe(1);
  });

  it("converts elapsed time to frames", () => {
    expect(frameStep(1000 / 30)).toBeCloseTo(2);
  });

  it("caps a long pause", () => {
    expect(frameStep(5000)).toBe(MAX_FRAME_STEP);
  });

  it("never steps backwards", () => {
    expect(frameStep(-20)).toBe(0);
  });
});

describe("createBody", () => {
  it("clamps the start position inside the bounds", () => {
    const b = createBody({ x: 250, y: -30 }, 10, BOUNDS, () => 0);
    expect(b.x).toBe(90);
    expect(b.y).toBe(0);
  });

  it("heads off at its cruise speed", () => {
    const b = createBody({ x: 0, y: 0 }, 10, BOUNDS, () => 0.5);
    expect(speed(b)).toBeCloseTo(b.cruise);
    expect(b.cruise).toBeGreaterThan(0);
  });
});

describe("stepBody", () => {
  it("moves by velocity times dt", () => {
    const next = stepBody(body({ vx: 1, vy: -0.5 }), 2, BOUNDS, null);
    expect(next.x).toBeCloseTo(47);
    expect(next.y).toBeCloseTo(44);
  });

  it.each([
    ["left", { x: 1, vx: -2 }, "x", 0, "vx", 1],
    ["right", { x: 89, vx: 2 }, "x", 90, "vx", -1],
    ["top", { y: 1, vy: -2 }, "y", 0, "vy", 1],
    ["bottom", { y: 89, vy: 2 }, "y", 90, "vy", -1],
  ] as const)(
    "bounces off the %s wall",
    (_wall, start, axis, edge, velocity, sign) => {
      const next = stepBody(body(start), 1, BOUNDS, null);
      expect(next[axis]).toBe(edge);
      expect(Math.sign(next[velocity])).toBe(sign);
    },
  );

  it("pushes a body away from a pointer inside the radius", () => {
    // Body centre is (50, 50); the pointer sits 20px to its left.
    const next = stepBody(body({ cruise: 0.35 }), 1, BOUNDS, { x: 30, y: 50 });
    expect(next.vx).toBeGreaterThan(0);
    expect(next.vy).toBe(0);
    expect(next.x).toBeGreaterThan(45);
  });

  it("ignores a pointer outside the radius", () => {
    const start = body({ vx: 0.5, vy: 0 });
    const pointer = { x: 50 - REPEL_RADIUS - 1, y: 50 };
    const next = stepBody(start, 1, BOUNDS, pointer);
    expect(next.vx).toBeCloseTo(0.5);
    expect(next.vy).toBe(0);
  });

  it("pushes straight up from a pointer dead on the centre", () => {
    const next = stepBody(body({ cruise: 0.35 }), 1, BOUNDS, { x: 50, y: 50 });
    expect(next.vx).toBe(0);
    expect(next.vy).toBeLessThan(0);
  });

  it("eases a fast body back down to its cruise speed", () => {
    let b = body({ vx: 4, vy: 0, cruise: 0.5, x: 0, size: 0 });
    const wide = { width: 1_000_000, height: 100 };
    b = stepBody(b, 1, wide, null);
    expect(speed(b)).toBeLessThan(4);
    for (let i = 0; i < 200; i++) b = stepBody(b, 1, wide, null);
    expect(speed(b)).toBeCloseTo(0.5);
  });

  it("speeds a slow body back up to its cruise speed", () => {
    let b = body({ vx: 0.1, vy: 0, cruise: 0.5 });
    for (let i = 0; i < 200; i++) b = stepBody(b, 1, BOUNDS, null);
    expect(speed(b)).toBeCloseTo(0.5);
  });

  it("never exceeds the maximum speed", () => {
    const next = stepBody(body({ vx: 50, vy: 0, cruise: 0.5 }), 1, BOUNDS, null);
    expect(speed(next)).toBeLessThanOrEqual(MAX_SPEED);
  });

  it("does not mutate its input", () => {
    const start = body({ vx: 1, vy: 1 });
    const copy = { ...start };
    stepBody(start, 1, BOUNDS, { x: 50, y: 50 });
    expect(start).toEqual(copy);
  });
});

describe("bodyTransform", () => {
  it("positions the body with a neutral pulse at phase zero", () => {
    expect(bodyTransform(body({ x: 10, y: 20 }), 0)).toBe(
      "translate(10.0px, 20.0px) rotate(0.00deg) scale(1.000)",
    );
  });
});
