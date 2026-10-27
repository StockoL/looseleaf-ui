import { test } from "node:test";
import assert from "node:assert/strict";
import { fluidClamp, typeScale, spaceScale } from "./utopia.mjs";

const inputs = {
  minViewport: 320,
  maxViewport: 1240,
  type: { minBase: 16, maxBase: 18, minRatio: 1.2, maxRatio: 1.25, stepsBelow: 1, stepsAbove: 5 },
  space: {
    minBase: 16,
    maxBase: 18,
    multipliers: { "3xs": 0.25, "2xs": 0.5, xs: 0.75, s: 1, m: 1.5, l: 2, xl: 3, "2xl": 4, "3xl": 6 },
    pairs: ["s-m", "m-l", "l-xl"],
  },
};

test("fluidClamp matches the Utopia calculator for 16px -> 18px over 320 -> 1240", () => {
  assert.equal(fluidClamp(16, 18, 320, 1240), "clamp(1rem, 0.96rem + 0.22vw, 1.13rem)");
});

test("fluidClamp keeps clamp() bounds ordered when the value shrinks", () => {
  assert.equal(fluidClamp(20, 16, 320, 1240), "clamp(1rem, 1.34rem + -0.43vw, 1.25rem)");
});

test("typeScale emits steps -1 … 5 in order", () => {
  const steps = typeScale(inputs);
  assert.deepEqual(
    steps.map((s) => s.key),
    ["-1", "0", "1", "2", "3", "4", "5"],
  );
  assert.equal(steps[1].value, "clamp(1rem, 0.96rem + 0.22vw, 1.13rem)");
  // step 5: 16 * 1.2^5 = 39.81px, 18 * 1.25^5 = 54.93px
  assert.equal(steps[6].value, "clamp(2.49rem, 2.16rem + 1.64vw, 3.43rem)");
});

test("spaceScale emits sizes then one-up pairs", () => {
  const space = spaceScale(inputs);
  const byKey = Object.fromEntries(space.map((s) => [s.key, s.value]));
  assert.equal(byKey.s, "clamp(1rem, 0.96rem + 0.22vw, 1.13rem)");
  // s-m: 16px (s at min) -> 27px (m at max)
  assert.equal(byKey["s-m"], "clamp(1rem, 0.76rem + 1.2vw, 1.69rem)");
  assert.deepEqual(space.slice(-3).map((s) => s.key), ["s-m", "m-l", "l-xl"]);
});

test("spaceScale rejects a pair naming an unknown size", () => {
  assert.throws(() => spaceScale({ ...inputs, space: { ...inputs.space, pairs: ["s-huge"] } }), /Unknown space pair/);
});
