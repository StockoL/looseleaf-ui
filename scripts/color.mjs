/**
 * LooseLeaf UI - Colour maths
 * PURE: no fs, no process, no DOM. Shared by the Node build and the browser configurator.
 *
 * OKLab/OKLCH conversions follow Björn Ottosson, "A perceptual color space for
 * image processing" (2020). Contrast follows WCAG 2.x relative luminance.
 */

const GAMUT_EPSILON = 0.000001;

/* --------------------------------------------------------------------------
   sRGB transfer functions
   -------------------------------------------------------------------------- */
function toLinear(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function toGamma(channel) {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
}

/* --------------------------------------------------------------------------
   OKLab <-> linear sRGB (Ottosson)
   -------------------------------------------------------------------------- */
function oklabToLinearSrgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearSrgbToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklchToLinearSrgb(L, C, H) {
  const radians = (H * Math.PI) / 180;
  return oklabToLinearSrgb(L, C * Math.cos(radians), C * Math.sin(radians));
}

function inGamut(linear) {
  return linear.every((channel) => channel >= -GAMUT_EPSILON && channel <= 1 + GAMUT_EPSILON);
}

/* --------------------------------------------------------------------------
   Hex helpers
   -------------------------------------------------------------------------- */
export function isHex(value) {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function hexToRgb(hex) {
  let digits = hex.trim().replace(/^#/, "");
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join("");
  if (!/^[0-9a-f]{6}$/i.test(digits)) throw new Error(`Not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255);
}

export function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
}

/* --------------------------------------------------------------------------
   OKLCH <-> hex
   -------------------------------------------------------------------------- */

/**
 * Largest chroma <= C that keeps (L, C, H) inside sRGB, found by bisection.
 * Hue and lightness are preserved; channels are never clipped independently.
 */
export function maxInGamutChroma(L, C, H) {
  if (inGamut(oklchToLinearSrgb(L, C, H))) return C;
  let low = 0;
  let high = C;
  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    if (inGamut(oklchToLinearSrgb(L, mid, H))) low = mid;
    else high = mid;
  }
  return low;
}

export function oklchToHex(L, C, H) {
  const lightness = Math.min(1, Math.max(0, L));
  const chroma = maxInGamutChroma(lightness, Math.max(0, C), H);
  return rgbToHex(oklchToLinearSrgb(lightness, chroma, H).map(toGamma));
}

export function hexToOklch(hex) {
  const [L, a, b] = linearSrgbToOklab(...hexToRgb(hex).map(toLinear));
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 0.0001 ? 0 : H };
}

/** One hex per lightness stop, all at the same hue and (gamut-limited) chroma. */
export function ramp(hue, chroma, lightnesses) {
  return lightnesses.map((lightness) => oklchToHex(lightness, chroma, hue));
}

/* --------------------------------------------------------------------------
   WCAG 2.x contrast
   -------------------------------------------------------------------------- */
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(hexA, hexB) {
  const [lighter, darker] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
