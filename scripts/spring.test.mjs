import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateSpring, springEasing } from "./spring.mjs";

const STOP = /^(-?\d+(\.\d+)?)( (\d+(\.\d+)?)%)?$/;

function parseLinear(easing) {
  const match = easing.match(/^linear\((.+)\)$/);
  assert.ok(match, `not a linear() easing: ${easing}`);
  return match[1].split(", ").map((stop) => {
    const parts = stop.match(STOP);
    assert.ok(parts, `malformed stop "${stop}"`);
    return { value: Number(parts[1]), position: parts[4] === undefined ? undefined : Number(parts[4]) };
  });
}

test("a critically damped spring never overshoots", () => {
  const mass = 1;
  const stiffness = 200;
  const { samples } = simulateSpring({ mass, stiffness, damping: 2 * Math.sqrt(stiffness * mass) });
  for (let i = 1; i < samples.length; i++) assert.ok(samples[i].x >= samples[i - 1].x - 1e-12, `dips at ${samples[i].t}s`);
  assert.ok(Math.max(...samples.map((s) => s.x)) <= 1 + 1e-9);
});

test("a lightly damped spring overshoots", () => {
  const { overshoot } = springEasing({ mass: 1, stiffness: 180, damping: 6 });
  assert.ok(overshoot > 0.3, `overshoot ${overshoot}`);
});

test("more damping settles sooner and overshoots less", () => {
  const loose = springEasing({ mass: 1, stiffness: 180, damping: 8 });
  const firm = springEasing({ mass: 1, stiffness: 180, damping: 20 });
  assert.ok(firm.overshoot < loose.overshoot);
  assert.ok(firm.settleMs < loose.settleMs);
});

test("the easing is valid linear() with at most 40 stops", () => {
  for (const spring of [
    { mass: 1, stiffness: 180, damping: 12 },
    { mass: 1, stiffness: 500, damping: 4 },
    { mass: 5, stiffness: 50, damping: 40 },
  ]) {
    const stops = parseLinear(springEasing(spring).easing);
    assert.ok(stops.length <= 40, `${stops.length} stops`);
    assert.deepEqual(stops[0], { value: 0, position: undefined });
    assert.deepEqual(stops.at(-1), { value: 1, position: undefined });
    const positions = stops.slice(1, -1).map((stop) => stop.position);
    positions.forEach((position, i) => {
      assert.ok(position > 0 && position < 100, `position ${position}`);
      if (i > 0) assert.ok(position > positions[i - 1], "positions must increase");
    });
  }
});

test("the settle time is the moment it comes to rest", () => {
  const { settle, samples } = simulateSpring({ mass: 1, stiffness: 180, damping: 12 });
  assert.ok(settle > 0.5 && settle < 2, `settle ${settle}s`);
  assert.ok(Math.abs(samples.at(-1).x - 1) < 0.001);
});

test("invalid springs are rejected with the input's name", () => {
  assert.throws(() => simulateSpring({ mass: 0, stiffness: 180, damping: 12 }), /\$motion\.spring\.mass/);
  assert.throws(() => simulateSpring({ mass: 1, stiffness: -5, damping: 12 }), /\$motion\.spring\.stiffness/);
  assert.throws(() => simulateSpring({ mass: 1, stiffness: 180, damping: -1 }), /\$motion\.spring\.damping/);
});
