/**
 * LooseLeaf UI - Utopia fluid scale maths
 * PURE: no fs, no process, no DOM. Shared by the Node build and the browser configurator.
 *
 * For a value that grows from minPx at minViewport to maxPx at maxViewport:
 *   slope     = (maxPx - minPx) / (maxViewport - minViewport)
 *   intercept = minPx - slope * minViewport
 *   clamp(minPx/16 rem, intercept/16 rem + slope*100 vw, maxPx/16 rem)
 */

const ROOT_PX = 16;

export function round(value, places = 2) {
  const factor = 10 ** places;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function fluidClamp(minPx, maxPx, minViewport, maxViewport) {
  const slope = (maxPx - minPx) / (maxViewport - minViewport);
  const intercept = minPx - slope * minViewport;
  const lower = Math.min(minPx, maxPx) / ROOT_PX;
  const upper = Math.max(minPx, maxPx) / ROOT_PX;
  const preferred = `${round(intercept / ROOT_PX)}rem + ${round(slope * 100)}vw`;
  return `clamp(${round(lower)}rem, ${preferred}, ${round(upper)}rem)`;
}

/** Type steps keyed "-1", "0", "1" … in ascending order. */
export function typeScale({ minViewport, maxViewport, type }) {
  const { minBase, maxBase, minRatio, maxRatio, stepsBelow, stepsAbove } = type;
  const steps = [];
  for (let step = -stepsBelow; step <= stepsAbove; step++) {
    const minPx = minBase * minRatio ** step;
    const maxPx = maxBase * maxRatio ** step;
    steps.push({ key: String(step), minPx, maxPx, value: fluidClamp(minPx, maxPx, minViewport, maxViewport) });
  }
  return steps;
}

/** Space sizes keyed by multiplier name, followed by the one-up pairs ("s-m"). */
export function spaceScale({ minViewport, maxViewport, space }) {
  const { minBase, maxBase, multipliers, pairs = [] } = space;
  const sizes = Object.entries(multipliers).map(([key, multiplier]) => {
    const minPx = minBase * multiplier;
    const maxPx = maxBase * multiplier;
    return { key, minPx, maxPx, value: fluidClamp(minPx, maxPx, minViewport, maxViewport) };
  });

  const byKey = Object.fromEntries(sizes.map((size) => [size.key, size]));
  const pairSizes = pairs.map((pair) => {
    const [from, to] = pair.split("-");
    if (!byKey[from] || !byKey[to]) throw new Error(`Unknown space pair "${pair}"`);
    const minPx = byKey[from].minPx;
    const maxPx = byKey[to].maxPx;
    return { key: pair, minPx, maxPx, value: fluidClamp(minPx, maxPx, minViewport, maxViewport) };
  });

  return [...sizes, ...pairSizes];
}
