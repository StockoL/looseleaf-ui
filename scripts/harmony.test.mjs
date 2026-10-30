import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, harmony, nearestInBand, mulberry32, BANDS, STATUS_SLOTS, hueDistance } from "./harmony.mjs";

const palette = {
  neutral: { hue: 286, chroma: 0.01 },
  action: { hue: 255, chroma: 0.2 },
  accent: { hue: 300, chroma: 0.2 },
  status: { success: { hue: 145 }, warning: { hue: 70 }, danger: { hue: 25 }, info: { hue: 240 } },
  lightness: { ramp: [1, 0.985, 0.97, 0.92, 0.87, 0.71, 0.56, 0.44, 0.37, 0.27, 0.21, 0.13], status: { light: {}, dark: {} } },
};

test("the PRNG is deterministic", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test("harmonies sit at the right angles", () => {
  assert.deepEqual(harmony(10, "complementary"), [190]);
  assert.deepEqual(harmony(350, "analogous"), [20, 320]);
  assert.deepEqual(harmony(0, "triadic"), [120, 240]);
  assert.deepEqual(harmony(0, "split-complementary"), [150, 210]);
  assert.throws(() => harmony(0, "random"), /Unknown harmony mode/);
});

test("nearestInBand keeps hues inside and snaps outside ones to the nearer end", () => {
  assert.equal(nearestInBand(25, BANDS.danger), 25);
  assert.equal(nearestInBand(50, BANDS.danger), 35);
  assert.equal(nearestInBand(350, BANDS.danger), 15); // across 0°
});

test("a fixed seed yields a fixed palette, and the same inputs give the same result", () => {
  const first = generate(palette, { seed: 7, mode: "random", vividness: 0.16 });
  const again = generate(palette, { seed: 7, mode: "random", vividness: 0.16 });
  assert.deepEqual(first, again);
  assert.notDeepEqual(first.palette.action, generate(palette, { seed: 8 }).palette.action);
  assert.notEqual(first.mode, "random");
});

test("every status hue lands inside its band, for many seeds and modes", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const mode = ["analogous", "complementary", "split-complementary", "triadic", "random"][seed % 5];
    const { palette: next } = generate(palette, { seed, mode });
    for (const name of STATUS_SLOTS) {
      const [low, high] = BANDS[name];
      const hue = next.status[name].hue;
      assert.ok(hue >= low && hue <= high, `seed ${seed}: ${name} ${hue} outside ${low}–${high}`);
    }
  }
});

test("locked slots never change; the recipes are kept", () => {
  const locks = { action: true, warning: true };
  for (let seed = 1; seed <= 50; seed++) {
    const { palette: next } = generate(palette, { seed, locks });
    assert.deepEqual(next.action, palette.action);
    assert.deepEqual(next.status.warning, palette.status.warning);
    assert.deepEqual(next.lightness, palette.lightness);
  }
});

test("one vividness drives every chroma: statuses at 0.8 of it, neutral barely tinted", () => {
  const { palette: next } = generate(palette, { seed: 3, vividness: 0.2 });
  assert.equal(next.action.chroma, 0.2);
  assert.equal(next.accent.chroma, 0.2);
  assert.equal(next.status.info.chroma, 0.16);
  assert.ok(next.neutral.chroma <= 0.02);
  const neutralOffset = hueDistance(next.neutral.hue, next.action.hue);
  assert.ok(neutralOffset === 0 || neutralOffset === 180, `neutral is action's hue or its complement, not ${neutralOffset}° away`);
});
