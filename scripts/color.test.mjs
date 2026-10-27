import { test } from "node:test";
import assert from "node:assert/strict";
import { oklchToHex, hexToOklch, ramp, contrast, maxInGamutChroma, hexToRgb } from "./color.mjs";

test("oklchToHex converts a known OKLCH value (sRGB red)", () => {
  assert.equal(oklchToHex(0.627955, 0.257683, 29.2339), "#ff0000");
});

test("hexToOklch is the inverse of oklchToHex", () => {
  const { l, c, h } = hexToOklch("#ff0000");
  assert.ok(Math.abs(l - 0.627955) < 0.0005);
  assert.ok(Math.abs(c - 0.257683) < 0.0005);
  assert.ok(Math.abs(h - 29.2339) < 0.05);
  assert.equal(oklchToHex(l, c, h), "#ff0000");
});

test("lightness extremes map to white and black", () => {
  assert.equal(oklchToHex(1, 0, 0), "#ffffff");
  assert.equal(oklchToHex(0, 0, 0), "#000000");
});

test("out-of-gamut colours reduce chroma instead of clipping channels", () => {
  // L 0.97 cannot hold chroma 0.2 at any hue in sRGB.
  const chroma = maxInGamutChroma(0.97, 0.2, 145);
  assert.ok(chroma < 0.2 && chroma > 0);
  const { l, h } = hexToOklch(oklchToHex(0.97, 0.2, 145));
  assert.ok(Math.abs(l - 0.97) < 0.01, "lightness preserved");
  assert.ok(Math.abs(h - 145) < 3, "hue preserved");
});

test("ramp returns one hex per stop, darkening monotonically", () => {
  const hexes = ramp(286, 0.01, [1, 0.71, 0.44, 0.13]);
  assert.equal(hexes.length, 4);
  const luminance = hexes.map((hex) => hexToRgb(hex).reduce((sum, c) => sum + c, 0));
  assert.deepEqual([...luminance].sort((a, b) => b - a), luminance);
});

test("contrast matches WCAG reference ratios", () => {
  assert.equal(contrast("#000000", "#ffffff"), 21);
  assert.equal(contrast("#ffffff", "#000000"), 21);
  // #767676 is the lightest grey that passes AA on white.
  assert.equal(Math.round(contrast("#767676", "#ffffff") * 100) / 100, 4.54);
});
