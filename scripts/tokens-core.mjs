/**
 * LooseLeaf UI - Design Token Compiler (core)
 * PURE: no fs, no process, no DOM. design-tokens JSON object in, CSS string out.
 * Imported by scripts/build-tokens.js and by the browser configurator, so the
 * preview is byte-identical to the build.
 *
 * Schema (see docs/TOKENS.md):
 *   - Nested groups flatten with "-": color.surface-raised -> --color-surface-raised,
 *     step.-1 -> --step--1, a top-level leaf (gutter) -> --gutter.
 *   - "{neutral.900}" is a reference and compiles to var(--neutral-900).
 *   - { "light": …, "dark": … } is a themed leaf; { "$value": …, "$purpose": … } a documented one.
 *   - "$" keys are inputs/metadata ($utopia, $palette, $purpose, $tier); "_" keys are comments.
 *   - Raw groups (neutral, action, accent, status hues, step, space) are derived from
 *     $palette / $utopia. An explicit value in one of those groups wins and is flagged overridden.
 *   - Motion tokens (duration, ease.spring, press, lift, reveal, navbar.stuck-padding) are
 *     derived from $motion, the configurator's Motion panel. They are tier 2 (semantic).
 *   - Shadows (shadow.color, raised, floating, overlay) are derived from $shape.shadow and the
 *     neutral hue: layered, tinted toward the page, one light source for every elevation.
 */

import { typeScale, spaceScale } from "./utopia.mjs";
import { oklchToHex, isHex, contrast } from "./color.mjs";
import { springEasing } from "./spring.mjs";

export const RAMP_KEYS = ["0", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
export const BRAND_KEYS = ["400", "500", "600"];
export const STATUS_NAMES = ["success", "warning", "danger", "info"];
export const RAW_GROUPS = ["neutral", "action", "accent", ...STATUS_NAMES, "step", "space"];

// Chroma of each status role relative to the status hue's chroma: pale surfaces, muted borders.
const STATUS_CHROMA_SCALE = { base: 1, surface: 0.25, border: 0.5, text: 0.8 };
const DEFAULT_STATUS_CHROMA = 0.15;

const REFERENCE = /\{([^{}]+)\}/g;

export const CONTRAST_TARGET = 4.5;
export const CONTRAST_PAIRS = [
  ["color.text", "color.surface"],
  ["color.text-muted", "color.surface"],
  ["color.text-muted", "color.surface-sunken"],
  ["color.text", "color.surface-sunken"],
  ["color.action-text", "color.action"],
  ...STATUS_NAMES.map((status) => [`color.status-${status}-text`, `color.status-${status}-surface`]),
  ["color.link", "color.surface"],
];

// Motion presets: a spring and three durations that suit each other
export const MOTION_PRESETS = {
  calm: { spring: { mass: 1, stiffness: 120, damping: 20 }, durations: { quick: 200, base: 320, slow: 500 } },
  snappy: { spring: { mass: 1, stiffness: 180, damping: 12 }, durations: { quick: 150, base: 250, slow: 400 } },
  playful: { spring: { mass: 1, stiffness: 220, damping: 8 }, durations: { quick: 180, base: 300, slow: 450 } },
};
export const DURATION_KEYS = ["quick", "base", "slow"];

// Shadows: one light source; each elevation stacks more, larger, softer, fainter layers
export const SHADOW_ANGLES = ["top-left", "top", "top-right"];
const ELEVATIONS = [
  { key: "raised", layers: 3, reach: 4, alpha: 0.28 },
  { key: "floating", layers: 4, reach: 14, alpha: 0.22 },
  { key: "overlay", layers: 5, reach: 36, alpha: 0.18 },
];
const SHADOW_TINT = { light: 0.2, dark: 0.05, chroma: 0.03 }; // OKLCH lightness per scheme, chroma
const DARK_ALPHA = 2; // dark surfaces need a stronger shadow to read at all
export const LIFT_SIZES = ["none", "3xs", "2xs", "xs", "s"];

/* --------------------------------------------------------------------------
   DERIVATION
   -------------------------------------------------------------------------- */
function rampLightness(palette) {
  const stops = palette.lightness?.ramp;
  if (!Array.isArray(stops) || stops.length !== RAMP_KEYS.length) {
    throw new Error(`$palette.lightness.ramp must list ${RAMP_KEYS.length} lightness stops (${RAMP_KEYS.join(", ")})`);
  }
  return (key) => stops[RAMP_KEYS.indexOf(key)];
}

function statusEntries({ hue, chroma = DEFAULT_STATUS_CHROMA }, recipes) {
  const entries = [];
  for (const scheme of ["light", "dark"]) {
    const recipe = recipes?.[scheme];
    if (!recipe) throw new Error(`$palette.lightness.status.${scheme} is missing`);
    for (const role of ["base", "surface", "border", "text"]) {
      const key = scheme === "light" && role === "base" ? "base" : `${role}-${scheme}`;
      entries.push({ key, value: oklchToHex(recipe[role], chroma * STATUS_CHROMA_SCALE[role], hue) });
    }
  }
  return entries;
}

function motionGroups(motion) {
  const preset = MOTION_PRESETS.snappy;
  const { spring = preset.spring, durations = {}, press = 0.97, lift = "3xs", reveal = true, pageTransition = true, stuck = true } = motion;
  const { easing, settleMs } = springEasing(spring);

  const ms = DURATION_KEYS.map((key) => {
    const value = durations[key] ?? preset.durations[key];
    if (!Number.isFinite(value) || value < 0) throw new Error(`$motion.durations.${key} must be a number of milliseconds, 0 or more`);
    return { key, value: `${value}ms` };
  });
  if (!Number.isFinite(press) || press <= 0 || press > 1) throw new Error("$motion.press must be a scale above 0 and at most 1");
  if (!LIFT_SIZES.includes(lift)) throw new Error(`$motion.lift must be one of ${LIFT_SIZES.join(", ")}`);

  const group = (name, purpose, entries) => ({ name, tier: 2, purpose, entries });
  return [
    group("duration", "Motion durations, derived from $motion. Spring is the spring's settle time; page is 0ms when page transitions are off.", [
      ...ms,
      { key: "spring", value: `${settleMs}ms` },
      { key: "page", value: pageTransition ? "{duration.base}" : "0ms" },
    ]),
    group("ease", "Easing curves. Spring is a linear() curve simulated from $motion.spring.", [{ key: "spring", value: easing }]),
    group("press", "Scale of a pressed button or choice, from $motion.press.", [{ key: "scale", value: String(press) }]),
    group("lift", "How far .anim-lift and interactive cards rise on hover, from $motion.lift.", [
      { key: "distance", value: lift === "none" ? "0px" : `{space.${lift}}` },
    ]),
    group("reveal", "Scroll reveal for [data-reveal]: the animation, or none when $motion.reveal is off.", [
      { key: "animation", value: reveal ? "ll-reveal" : "none" },
    ]),
    group("navbar", "Padding of a sticky navbar once stuck; the normal padding when $motion.stuck is off.", [
      { key: "stuck-padding", value: stuck ? "{space.2xs}" : "{space.s}" },
    ]),
  ];
}

const px = (value) => `${Number(value.toFixed(2))}px`;

function shadowLayers({ layers, reach, alpha }, { strength, softness, angle }, scheme) {
  const across = { "top-left": 0.5, top: 0, "top-right": -0.5 }[angle];
  const opacity = Number(Math.min(1, alpha * strength * (scheme === "dark" ? DARK_ALPHA : 1)).toFixed(3));
  return Array.from({ length: layers }, (_, i) => {
    const y = reach * ((i + 1) / layers) ** 2; // each layer twice as far as the last, roughly
    const blur = y * (1 + softness * 2);
    const spread = -y * 0.25 * (1 - softness);
    return `${px(y * across)} ${px(y)} ${px(blur)} ${px(spread)} oklch({shadow.color} / ${opacity})`;
  }).join(", ");
}

function shadowGroup(shape, palette) {
  const { strength = 0.6, softness = 0.5, angle = "top-left" } = shape.shadow;
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) throw new Error("$shape.shadow.strength must be between 0 and 1");
  if (!Number.isFinite(softness) || softness < 0 || softness > 1) throw new Error("$shape.shadow.softness must be between 0 and 1");
  if (!SHADOW_ANGLES.includes(angle)) throw new Error(`$shape.shadow.angle must be one of ${SHADOW_ANGLES.join(", ")}`);
  const hue = palette?.neutral?.hue ?? 0;
  const tint = (lightness) => `${lightness} ${SHADOW_TINT.chroma} ${hue}`;
  const settings = { strength, softness, angle };
  return {
    name: "shadow",
    tier: 2,
    purpose: "Elevation, derived from $shape.shadow: layered shadows tinted with the neutral hue (shadow.color holds OKLCH components).",
    entries: [
      { key: "color", value: tint(SHADOW_TINT.light), dark: tint(SHADOW_TINT.dark) },
      ...ELEVATIONS.map((elevation) => ({
        key: elevation.key,
        value: shadowLayers(elevation, settings, "light"),
        dark: shadowLayers(elevation, settings, "dark"),
      })),
    ],
  };
}

/** Groups computed from the $palette, $utopia, $motion and $shape inputs, in output order. */
export function deriveGroups(json) {
  const groups = [];
  const palette = json.$palette;
  const utopia = json.$utopia;

  if (palette) {
    const lightness = rampLightness(palette);
    if (palette.neutral) {
      const { hue, chroma } = palette.neutral;
      groups.push({
        name: "neutral",
        purpose: "Raw grayscale ramp, derived from $palette.neutral. Never used directly by blocks.",
        entries: RAMP_KEYS.map((key) => ({ key, value: oklchToHex(lightness(key), chroma, hue) })),
      });
    }
    for (const name of ["action", "accent"]) {
      if (!palette[name]) continue;
      const { hue, chroma } = palette[name];
      groups.push({
        name,
        purpose: `Raw ${name} hue (500, a lighter 400 and a darker 600), derived from $palette.${name}.`,
        entries: BRAND_KEYS.map((key) => ({ key, value: oklchToHex(lightness(key), chroma, hue) })),
      });
    }
    for (const name of STATUS_NAMES) {
      const input = palette.status?.[name];
      if (!input) continue;
      groups.push({
        name,
        purpose: `Raw ${name} status colours for both schemes, derived from $palette.status.${name}.`,
        entries: statusEntries(input, palette.lightness?.status),
      });
    }
  }

  if (utopia) {
    if (utopia.type) {
      groups.push({
        name: "step",
        purpose: "Raw Utopia fluid type steps, derived from $utopia.type.",
        entries: typeScale(utopia).map(({ key, value }) => ({ key, value })),
      });
    }
    if (utopia.space) {
      groups.push({
        name: "space",
        purpose: "Raw Utopia fluid space scale and one-up pairs, derived from $utopia.space.",
        entries: spaceScale(utopia).map(({ key, value }) => ({ key, value })),
      });
    }
  }

  if (json.$motion) groups.push(...motionGroups(json.$motion));
  if (json.$shape?.shadow) groups.push(shadowGroup(json.$shape, palette));

  return groups;
}

/* --------------------------------------------------------------------------
   FLATTENING
   -------------------------------------------------------------------------- */
const isMeta = (key) => key.startsWith("$") || key.startsWith("_");

function asLeaf(node) {
  if (typeof node === "string" || typeof node === "number") return { light: String(node) };
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;
  if ("$value" in node) return { light: String(node.$value), purpose: node.$purpose };

  const keys = Object.keys(node).filter((key) => !isMeta(key));
  if (keys.length > 0 && keys.includes("light") && keys.every((key) => key === "light" || key === "dark")) {
    return {
      light: String(node.light),
      dark: node.dark === undefined ? undefined : String(node.dark),
      purpose: node.$purpose,
    };
  }
  return null;
}

function walk(node, path, context, out) {
  const leaf = asLeaf(node);
  if (leaf) {
    out.push({ path, ...context, ...leaf, purpose: leaf.purpose ?? context.purpose });
    return;
  }
  if (!node || typeof node !== "object") {
    throw new Error(`Unsupported token value at ${path.join(".")}`);
  }
  const groupContext = {
    ...context,
    purpose: node.$purpose ?? context.purpose,
    tier: node.$tier ?? context.tier,
  };
  for (const [key, child] of Object.entries(node)) {
    if (isMeta(key)) continue;
    walk(child, [...path, key], groupContext, out);
  }
}

function collectEntries(json) {
  const entries = [];
  const derived = deriveGroups(json);
  const derivedNames = new Set(derived.map((group) => group.name));

  for (const group of derived) {
    const explicit = json[group.name] ?? {};
    const context = { tier: group.tier ?? 1, purpose: explicit.$purpose ?? group.purpose };
    const derivedKeys = new Set(group.entries.map((entry) => entry.key));

    for (const { key, value, dark } of group.entries) {
      if (key in explicit) {
        walk(explicit[key], [group.name, key], { ...context, derived: false, overridden: true }, entries);
      } else {
        entries.push({ path: [group.name, key], ...context, light: value, dark, derived: true, overridden: false });
      }
    }
    for (const [key, child] of Object.entries(explicit)) {
      if (isMeta(key) || derivedKeys.has(key)) continue;
      walk(child, [group.name, key], { ...context, derived: false, overridden: false }, entries);
    }
  }

  for (const [key, node] of Object.entries(json)) {
    if (isMeta(key) || derivedNames.has(key)) continue;
    const raw = RAW_GROUPS.includes(key);
    // A raw group without its $palette / $utopia inputs (e.g. a v1 file) is hand-set throughout.
    walk(node, [key], { tier: raw ? 1 : 2, purpose: undefined, derived: false, overridden: raw }, entries);
  }

  return entries.map((entry) => ({ ...entry, name: `--${entry.path.join("-")}` }));
}

/* --------------------------------------------------------------------------
   REFERENCES
   -------------------------------------------------------------------------- */
const referenceName = (reference) => `--${reference.trim().split(".").join("-")}`;
const toCssValue = (value) => value.replace(REFERENCE, (_, reference) => `var(${referenceName(reference)})`);

function createResolver(entries) {
  const byName = new Map();
  for (const entry of entries) {
    if (byName.has(entry.name)) throw new Error(`Duplicate token ${entry.name} (from ${entry.path.join(".")})`);
    byName.set(entry.name, entry);
  }

  return function resolve(entry, scheme, chain = []) {
    if (chain.includes(entry.name)) {
      throw new Error(`Circular token reference: ${[...chain, entry.name].join(" -> ")}`);
    }
    const raw = scheme === "dark" && entry.dark !== undefined ? entry.dark : entry.light;
    return raw.replace(REFERENCE, (_, reference) => {
      const target = byName.get(referenceName(reference));
      if (!target) throw new Error(`Unknown token reference "{${reference}}" in ${entry.name}`);
      return resolve(target, scheme, [...chain, entry.name]);
    });
  };
}

/* --------------------------------------------------------------------------
   CSS OUTPUT
   -------------------------------------------------------------------------- */
const HEADER = `/* ==========================================================================
   AUTO-GENERATED CUSTOM PROPERTIES - DO NOT EDIT DIRECTLY
   ==========================================================================
   Source: design-tokens.json, compiled by scripts/tokens-core.mjs
   ========================================================================== */`;

function declarations(tokens, valueOf, indent) {
  const lines = [];
  let group = null;
  for (const token of tokens) {
    if (token.group !== group) {
      group = token.group;
      if (lines.length) lines.push("");
      lines.push(`${indent}/* --- ${group}${token.purpose ? `: ${token.purpose}` : ""} --- */`);
    }
    lines.push(`${indent}${token.name}: ${valueOf(token)};`);
  }
  return lines.join("\n");
}

function renderCss(tokens) {
  const darkTokens = tokens.filter((token) => token.darkValue !== undefined);
  const darkBody = (indent) => `${indent}color-scheme: dark;\n\n${declarations(darkTokens, (t) => t.darkValue, indent)}`;

  return `${HEADER}

:root {
  color-scheme: light;

${declarations(tokens, (t) => t.value, "  ")}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${darkBody("    ")}
  }
}

:root[data-theme="dark"] {
${darkBody("  ")}
}
`;
}

/* --------------------------------------------------------------------------
   PUBLIC API
   -------------------------------------------------------------------------- */

/**
 * compile(json) -> { css, tokens }
 * tokens[]: { name, path, group, tier, purpose, value, darkValue, light, dark, themed, derived, overridden }
 *   value / darkValue are the CSS (var() references); light / dark are fully resolved literals.
 */
export function compile(json) {
  const entries = collectEntries(json);
  const resolve = createResolver(entries);

  const tokens = entries.map((entry) => {
    const light = resolve(entry, "light");
    const dark = resolve(entry, "dark");
    return {
      name: entry.name,
      path: entry.path.join("."),
      group: entry.path[0],
      tier: entry.tier,
      purpose: entry.purpose ?? null,
      value: toCssValue(entry.light),
      darkValue: entry.dark === undefined ? undefined : toCssValue(entry.dark),
      light,
      dark,
      themed: light !== dark,
      derived: entry.derived,
      overridden: entry.overridden,
    };
  });

  return { css: renderCss(tokens), tokens };
}

/* --------------------------------------------------------------------------
   FONTS
   A font token is a system stack, or "'<Family>', <stack>" when a web font is
   layered on top; web fonts are loaded from Google Fonts by the theme CSS.
   -------------------------------------------------------------------------- */

// Modern Font Stacks (modernfontstacks.com): the system stacks the configurator offers
export const FONT_STACKS = [
  { label: "System UI", stack: "system-ui, sans-serif" },
  { label: "Humanist", stack: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif" },
  { label: "Transitional", stack: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif" },
  { label: "Geometric humanist", stack: "Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif" },
  { label: "Monospace", stack: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace" },
];

export function parseFont(value = "") {
  for (const { stack } of FONT_STACKS) {
    if (value === stack) return { stack, family: "" };
    const match = value.match(/^\s*(['"])(.+?)\1\s*,\s*(.+)$/);
    if (match && match[3] === stack) return { stack, family: match[2] };
  }
  return { stack: value, family: "" };
}

export function composeFont(family, stack) {
  return family ? `'${family.replace(/['"]/g, "")}', ${stack}` : stack;
}

const leafValue = (node) => (node && typeof node === "object" && "$value" in node ? node.$value : node);

/** Web font families named by the body and heading font tokens. */
export function webFonts(json) {
  const families = ["body", "heading"].map((role) => parseFont(leafValue(json.font?.[role])).family).filter(Boolean);
  return [...new Set(families)];
}

/** The Google Fonts @import for those families, or "" when only system stacks are used. */
export function fontImports(json) {
  const families = webFonts(json);
  if (!families.length) return "";
  const query = families.map((family) => `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700`).join("&");
  return `@import url("https://fonts.googleapis.com/css2?${query}&display=swap");\n`;
}

/**
 * The tokens.resolved.json object: metadata keys ("$version", "$generated") first,
 * then one entry per token path with its resolved light and dark values.
 */
export function resolvedTokens(tokens, meta = {}) {
  const resolved = { ...meta };
  for (const token of tokens) {
    resolved[token.path] = {
      name: token.name,
      tier: token.tier,
      light: token.light,
      dark: token.dark,
      themed: token.themed,
      overridden: token.overridden,
      purpose: token.purpose,
    };
  }
  return resolved;
}

/**
 * A theme stylesheet: compiled tokens wrapped in @layer global, so loaded after
 * looseleaf.css they replace the shipped variables by source order alone.
 * Any @import (web fonts) must precede every other rule, so it goes first.
 */
export function themeStylesheet(css, imports = "") {
  return `${imports}@layer global {\n${css}}\n`;
}

/** WCAG ratios for the semantic pairings in CONTRAST_PAIRS, for both schemes. */
export function contrastReport(tokens) {
  const byPath = new Map(tokens.map((token) => [token.path, token]));
  const rows = [];
  for (const [foregroundPath, backgroundPath] of CONTRAST_PAIRS) {
    const foreground = byPath.get(foregroundPath);
    const background = byPath.get(backgroundPath);
    if (!foreground || !background) continue;
    for (const scheme of ["light", "dark"]) {
      const fg = foreground[scheme];
      const bg = background[scheme];
      if (!isHex(fg) || !isHex(bg)) continue;
      const ratio = contrast(fg, bg);
      rows.push({ foreground: foregroundPath, background: backgroundPath, scheme, fg, bg, ratio, passes: ratio >= CONTRAST_TARGET });
    }
  }
  return rows;
}
