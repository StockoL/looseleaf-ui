/**
 * LooseLeaf UI - Palette generator
 * PURE: no fs, no process, no DOM. Shared by the configurator and tests.
 *
 * LooseLeaf picks hues for roles, not five arbitrary colours: the lightness
 * recipes in $palette already fix how light every text, surface and border is,
 * so a hue set with matched chroma is coherent before it starts. generate()
 * rerolls the unlocked slots:
 *   - action: any hue; accent: a harmony of action (analogous, complementary,
 *     split-complementary, triadic, or a random one of those);
 *   - statuses: inside their bands (danger red-ish, warning amber, success
 *     green-ish, info blue-ish) at the point nearest a harmony of action, so
 *     alerts are never misread;
 *   - neutral: action's hue or its complement, barely tinted.
 * One vividness setting drives every chroma (statuses at 0.8 of it), which is
 * most of what makes a palette look designed rather than generated.
 */

export const SLOTS = ["neutral", "action", "accent", "success", "warning", "danger", "info"];
export const STATUS_SLOTS = ["success", "warning", "danger", "info"];
export const BANDS = { danger: [15, 35], warning: [60, 90], success: [130, 160], info: [220, 260] };
export const MODES = ["analogous", "complementary", "split-complementary", "triadic", "random"];
export const VIVIDNESS = { min: 0.08, max: 0.24, default: 0.16 };

const OFFSETS = {
  analogous: [30, -30],
  complementary: [180],
  "split-complementary": [150, 210],
  triadic: [120, 240],
};
const STATUS_SHARE = 0.8; // statuses at 0.8 of the vividness
const NEUTRAL_SHARE = 0.1; // neutral barely tinted...
const NEUTRAL_MAX = 0.02; // ...and never more than this

/** mulberry32: a small, fast, seeded PRNG. Same seed, same sequence. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const wrap = (hue) => ((hue % 360) + 360) % 360;
export const hueDistance = (a, b) => {
  const d = Math.abs(wrap(a) - wrap(b));
  return Math.min(d, 360 - d);
};
const round = (value, digits = 0) => Number(value.toFixed(digits));

/** The hues in harmony with actionHue under a mode (not "random"; resolve that first). */
export function harmony(actionHue, mode) {
  const offsets = OFFSETS[mode];
  if (!offsets) throw new Error(`Unknown harmony mode "${mode}" (use one of ${MODES.join(", ")})`);
  return offsets.map((offset) => wrap(actionHue + offset));
}

/** hue if it is inside [low, high], otherwise whichever end of the band is nearer. */
export function nearestInBand(hue, [low, high]) {
  const h = wrap(hue);
  if (h >= low && h <= high) return h;
  return hueDistance(h, low) <= hueDistance(h, high) ? low : high;
}

/** The point in a status band nearest any of the given harmony hues. */
function statusHue(band, candidates) {
  let best = null;
  for (const candidate of candidates) {
    const hue = nearestInBand(candidate, band);
    const distance = hueDistance(candidate, hue);
    if (!best || distance < best.distance) best = { hue, distance };
  }
  return best.hue;
}

/**
 * A new $palette from palette, rerolling every unlocked slot. Locked slots are
 * copied unchanged; the lightness recipes are always kept. Deterministic: the
 * same palette, locks, mode, vividness and seed give the same result.
 * Returns { palette, mode } (mode is the one used, resolved if "random").
 */
export function generate(palette, { locks = {}, mode = "random", vividness = VIVIDNESS.default, seed = 1 } = {}) {
  if (!MODES.includes(mode)) throw new Error(`Unknown harmony mode "${mode}" (use one of ${MODES.join(", ")})`);
  const random = mulberry32(seed);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const used = mode === "random" ? pick(MODES.filter((m) => m !== "random")) : mode;
  const chroma = Math.min(VIVIDNESS.max, Math.max(VIVIDNESS.min, vividness));

  const next = structuredClone(palette);
  next.status ??= {};

  const action = locks.action ? palette.action : { hue: round(random() * 360), chroma: round(chroma, 3) };
  next.action = { ...action };

  const relatives = harmony(action.hue, used);
  if (!locks.accent) next.accent = { hue: round(pick(relatives)), chroma: round(chroma, 3) };

  for (const name of STATUS_SLOTS) {
    if (locks[name]) continue;
    next.status[name] = { hue: round(statusHue(BANDS[name], [action.hue, ...relatives])), chroma: round(chroma * STATUS_SHARE, 3) };
  }

  if (!locks.neutral) {
    const hue = random() < 0.5 ? action.hue : wrap(action.hue + 180);
    next.neutral = { hue: round(hue), chroma: round(Math.min(NEUTRAL_MAX, chroma * NEUTRAL_SHARE), 3) };
  }

  return { palette: next, mode: used };
}
