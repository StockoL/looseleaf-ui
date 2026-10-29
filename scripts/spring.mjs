/**
 * LooseLeaf UI - Spring easing
 * PURE: no fs, no process, no DOM. Shared by the token compiler and the configurator.
 *
 * A damped spring (mass, stiffness, damping) is pulled from 0 to 1 and simulated
 * with a fixed 1 ms step until it settles. The motion becomes a CSS linear() easing:
 * the samples, normalised to the settle time, simplified to about 25 stops
 * (never more than 40), each with an explicit percentage. A spring too loose to
 * settle is clamped to a damping ratio of 0.1 so it always comes to rest.
 * linear() is in every Baseline browser (Chrome 113, Safari 17.2, Firefox 112).
 */

const STEP = 0.001; // seconds
const SETTLE_DISTANCE = 0.001; // within 0.1% of the target...
const SETTLE_HOLD = 0.05; // ...for 50 ms
const MAX_TIME = 10; // an undamped spring never settles; stop here
const MAX_STOPS = 40;
const TOLERANCE = 0.003; // drop points within 0.3% of the chord between kept points
const MIN_DAMPING_RATIO = 0.1; // below this a spring rings for seconds; zero never settles

function validate({ mass, stiffness, damping }) {
  for (const [name, value, min] of [["mass", mass, 0], ["stiffness", stiffness, 0], ["damping", damping, -1]]) {
    if (!Number.isFinite(value) || value <= min) {
      throw new Error(`$motion.spring.${name} must be a number above ${Math.max(min, 0)}${name === "damping" ? " or 0" : ""}`);
    }
  }
}

/**
 * Simulates the spring. Returns { samples: [{ t, x }] (t in seconds), settle (seconds) }.
 * Semi-implicit Euler at 1 ms is stable well past the stiffness range the configurator offers.
 */
/** The damping actually used: at least MIN_DAMPING_RATIO of critical damping. */
export function effectiveDamping({ mass = 1, stiffness = 180, damping = 12 } = {}) {
  return Math.max(damping, MIN_DAMPING_RATIO * 2 * Math.sqrt(stiffness * mass));
}

export function simulateSpring({ mass = 1, stiffness = 180, damping = 12 } = {}) {
  validate({ mass, stiffness, damping });
  damping = effectiveDamping({ mass, stiffness, damping });
  const samples = [{ t: 0, x: 0 }];
  let x = 0;
  let v = 0;
  let settledSince = null;

  for (let step = 1; step * STEP <= MAX_TIME; step++) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * STEP;
    x += v * STEP;
    const t = step * STEP;
    samples.push({ t, x });

    if (Math.abs(x - 1) < SETTLE_DISTANCE) {
      settledSince ??= t;
      if (t - settledSince >= SETTLE_HOLD) return { samples: samples.filter((s) => s.t <= settledSince), settle: settledSince };
    } else {
      settledSince = null;
    }
  }
  return { samples, settle: MAX_TIME };
}

/** Greedy chord simplification: keep a point only when skipping it would bend the curve by more than tolerance. */
function simplify(points, tolerance) {
  const kept = [points[0]];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = anchor + 1;
    for (let candidate = anchor + 2; candidate < points.length; candidate++) {
      const a = points[anchor];
      const b = points[candidate];
      let fits = true;
      for (let i = anchor + 1; i < candidate; i++) {
        const p = points[i];
        const onChord = a.x + ((b.x - a.x) * (p.t - a.t)) / (b.t - a.t);
        if (Math.abs(p.x - onChord) > tolerance) {
          fits = false;
          break;
        }
      }
      if (!fits) break;
      next = candidate;
    }
    kept.push(points[next]);
    anchor = next;
  }
  return kept;
}

const fixed = (value, digits) => String(Number(value.toFixed(digits)));

/**
 * The spring as a CSS easing.
 * Returns { easing: "linear(…)", settleMs, overshoot, damping (as used, after clamping),
 * points: [{ t, x }] (t normalised to 0..1) }.
 */
export function springEasing(spring) {
  const { samples, settle } = simulateSpring(spring);
  const normalised = samples.map(({ t, x }) => ({ t: t / settle, x }));
  normalised[normalised.length - 1] = { t: 1, x: 1 }; // it ends exactly at rest

  let tolerance = TOLERANCE;
  let points = simplify(normalised, tolerance);
  while (points.length > MAX_STOPS) {
    tolerance *= 1.5;
    points = simplify(normalised, tolerance);
  }

  const stops = points.map(({ t, x }, index) => {
    if (index === 0) return "0";
    if (index === points.length - 1) return "1";
    return `${fixed(x, 4)} ${fixed(t * 100, 2)}%`;
  });

  return {
    easing: `linear(${stops.join(", ")})`,
    settleMs: Math.round(settle * 1000),
    damping: effectiveDamping(spring),
    overshoot: Math.max(...samples.map((s) => s.x)) - 1,
    points,
  };
}
