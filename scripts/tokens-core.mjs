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
 */

import { typeScale, spaceScale } from "./utopia.mjs";
import { oklchToHex, isHex, contrast } from "./color.mjs";

export const RAMP_KEYS = ["0", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
export const BRAND_KEYS = ["500", "600"];
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

/** Raw groups computed from $palette and $utopia, in output order. */
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
        purpose: `Raw ${name} hue (500 and its 600 hover step), derived from $palette.${name}.`,
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
    const context = { tier: 1, purpose: explicit.$purpose ?? group.purpose };
    const derivedKeys = new Set(group.entries.map((entry) => entry.key));

    for (const { key, value } of group.entries) {
      if (key in explicit) {
        walk(explicit[key], [group.name, key], { ...context, derived: false, overridden: true }, entries);
      } else {
        entries.push({ path: [group.name, key], ...context, light: value, derived: true, overridden: false });
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
