import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, contrastReport, resolvedTokens, themeStylesheet, fontImports, parseFont, webFonts, RAMP_KEYS } from "./tokens-core.mjs";

const palette = {
  neutral: { hue: 286, chroma: 0.01 },
  action: { hue: 255, chroma: 0.2 },
  status: { success: { hue: 145 } },
  lightness: {
    ramp: [1, 0.985, 0.97, 0.92, 0.87, 0.71, 0.56, 0.44, 0.37, 0.27, 0.21, 0.13],
    status: {
      light: { base: 0.55, surface: 0.97, border: 0.88, text: 0.35 },
      dark: { base: 0.7, surface: 0.22, border: 0.35, text: 0.85 },
    },
  },
};

const utopia = {
  minViewport: 320,
  maxViewport: 1240,
  type: { minBase: 16, maxBase: 18, minRatio: 1.2, maxRatio: 1.25, stepsBelow: 1, stepsAbove: 1 },
  space: { minBase: 16, maxBase: 18, multipliers: { s: 1, m: 1.5 }, pairs: ["s-m"] },
};

const byName = (tokens) => Object.fromEntries(tokens.map((t) => [t.name, t]));

test("flattens nested groups, negative steps and top-level leaves", () => {
  const { tokens } = compile({
    $utopia: utopia,
    color: { "surface-raised": "#ffffff" },
    gutter: "{space.s}",
    _comment: "ignored",
  });
  const names = tokens.map((t) => t.name);
  assert.ok(names.includes("--color-surface-raised"));
  assert.ok(names.includes("--step--1"));
  assert.ok(names.includes("--space-s-m"));
  assert.ok(names.includes("--gutter"));
  assert.ok(!names.some((n) => n.includes("comment")));
});

test("references compile to var() and resolve to literals", () => {
  const { css, tokens } = compile({ $utopia: utopia, gutter: "{space.s}", inset: "{space.s} {space.m}" });
  const t = byName(tokens);
  assert.equal(t["--gutter"].value, "var(--space-s)");
  assert.equal(t["--gutter"].light, t["--space-s"].light);
  assert.equal(t["--inset"].value, "var(--space-s) var(--space-m)");
  assert.match(css, /--gutter: var\(--space-s\);/);
});

test("derives the neutral ramp and brand steps from $palette", () => {
  const { tokens } = compile({ $palette: palette });
  const t = byName(tokens);
  assert.deepEqual(
    tokens.filter((x) => x.group === "neutral").map((x) => x.path),
    RAMP_KEYS.map((k) => `neutral.${k}`),
  );
  assert.equal(t["--neutral-0"].light, "#ffffff");
  assert.ok(t["--action-500"].derived);
  assert.equal(t["--action-500"].tier, 1);
  for (const key of ["base", "surface-light", "border-light", "text-light", "surface-dark", "border-dark", "text-dark"]) {
    assert.ok(t[`--success-${key}`], `--success-${key}`);
  }
});

test("explicit values in a derived group win and are flagged overridden", () => {
  const { tokens } = compile({ $palette: palette, neutral: { 500: "#71717a" } });
  const t = byName(tokens);
  assert.equal(t["--neutral-500"].light, "#71717a");
  assert.equal(t["--neutral-500"].overridden, true);
  assert.equal(t["--neutral-400"].overridden, false);
});

test("a raw group without inputs (v1 file) is marked overridden throughout", () => {
  const { tokens } = compile({ neutral: { 0: "#ffffff", 900: "#18181b" } });
  assert.ok(tokens.every((t) => t.overridden && t.tier === 1));
});

test("themed values emit exactly one light, one media and one forced-dark block", () => {
  const { css, tokens } = compile({
    $palette: palette,
    color: {
      $purpose: "Semantic colour roles.",
      surface: { light: "{neutral.0}", dark: "{neutral.950}" },
      focus: "{color.surface}",
    },
  });
  const t = byName(tokens);
  assert.equal(t["--color-surface"].dark, t["--neutral-950"].light);
  assert.equal(t["--color-focus"].themed, true, "themed through its reference");
  assert.equal(t["--color-surface"].purpose, "Semantic colour roles.");

  assert.equal(css.match(/^:root \{/gm).length, 1);
  assert.equal(css.match(/@media \(prefers-color-scheme: dark\)/g).length, 1);
  assert.equal(css.match(/:root\[data-theme="dark"\]/g).length, 1);

  const forced = css.slice(css.indexOf(':root[data-theme="dark"]'));
  assert.match(forced, /--color-surface: var\(--neutral-950\);/);
  assert.doesNotMatch(forced, /--color-focus/, "unthemed tokens follow their refs, not redeclared");
});

test("unknown references are a hard error", () => {
  assert.throws(() => compile({ gutter: "{space.nope}" }), /Unknown token reference "\{space.nope\}" in --gutter/);
});

test("circular references are a hard error", () => {
  assert.throws(() => compile({ a: "{b}", b: "{a}" }), /Circular token reference/);
});

test("contrastReport rates both schemes against WCAG AA", () => {
  const { tokens } = compile({
    $palette: palette,
    color: {
      text: { light: "{neutral.900}", dark: "{neutral.100}" },
      surface: { light: "{neutral.0}", dark: "{neutral.950}" },
    },
  });
  const rows = contrastReport(tokens);
  assert.deepEqual(rows.map((r) => r.scheme), ["light", "dark"]);
  assert.ok(rows.every((r) => r.passes && r.ratio > 12));
});

test("resolvedTokens puts metadata first and keys tokens by path", () => {
  const { tokens } = compile({ $palette: palette, color: { surface: { light: "{neutral.0}", dark: "{neutral.950}" } } });
  const resolved = resolvedTokens(tokens, { $version: "2.0.0", $generated: "2026-10-27" });
  assert.deepEqual(Object.keys(resolved).slice(0, 2), ["$version", "$generated"]);
  assert.equal(resolved["color.surface"].name, "--color-surface");
  assert.equal(resolved["color.surface"].light, "#ffffff");
  assert.equal(resolved["color.surface"].themed, true);
});

test("themeStylesheet wraps tokens in the global layer with imports first", () => {
  const { css } = compile({ gutter: "1rem" });
  const fontImport = '@import url("https://fonts.example/inter.css");\n';
  const sheet = themeStylesheet(css, fontImport);
  assert.ok(sheet.startsWith(`${fontImport}@layer global {\n`));
  assert.ok(sheet.trimEnd().endsWith("}"));
  assert.match(sheet, /--gutter: 1rem;/);
});

test("font helpers find web fonts layered on system stacks", () => {
  const stack = "system-ui, sans-serif";
  assert.deepEqual(parseFont(`'Inter', ${stack}`), { stack, family: "Inter" });
  assert.deepEqual(parseFont(stack), { stack, family: "" });
  const json = { font: { body: `'Open Sans', ${stack}`, heading: { $value: `'Inter', ${stack}` } } };
  assert.deepEqual(webFonts(json), ["Open Sans", "Inter"]);
  assert.equal(
    fontImports(json),
    '@import url("https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap");\n',
  );
  assert.equal(fontImports({ font: { body: stack } }), "");
});

const space = { "3xs": "4px", "2xs": "8px", s: "16px" };

test("$motion derives the motion tokens as tier 2", () => {
  const { tokens } = compile({ space, $motion: { spring: { mass: 1, stiffness: 180, damping: 12 }, durations: { quick: 100, base: 200, slow: 300 } } });
  const t = byName(tokens);
  assert.equal(t["--duration-quick"].value, "100ms");
  assert.equal(t["--duration-slow"].value, "300ms");
  assert.match(t["--duration-spring"].value, /^\d+ms$/);
  assert.match(t["--ease-spring"].value, /^linear\(0, .+, 1\)$/);
  assert.equal(t["--press-scale"].value, "0.97");
  assert.equal(t["--lift-distance"].light, "4px");
  assert.equal(t["--duration-quick"].tier, 2);
  assert.equal(t["--ease-spring"].derived, true);
});

test("$motion switches become token values the motion layer reads", () => {
  const on = byName(compile({ space, duration: {}, $motion: {} }).tokens);
  assert.equal(on["--reveal-animation"].value, "ll-reveal");
  assert.equal(on["--duration-page"].value, "var(--duration-base)");
  assert.equal(on["--navbar-stuck-padding"].value, "var(--space-2xs)");

  const off = byName(compile({ space, $motion: { reveal: false, pageTransition: false, stuck: false, lift: "none" } }).tokens);
  assert.equal(off["--reveal-animation"].value, "none");
  assert.equal(off["--duration-page"].value, "0ms");
  assert.equal(off["--navbar-stuck-padding"].value, "var(--space-s)");
  assert.equal(off["--lift-distance"].value, "0px");
});

test("explicit motion tokens sit beside the derived ones and can override them", () => {
  const t = byName(compile({ space, $motion: {}, duration: { enter: "{duration.base}", quick: "90ms" } }).tokens);
  assert.equal(t["--duration-enter"].light, "250ms");
  assert.equal(t["--duration-quick"].value, "90ms");
  assert.equal(t["--duration-quick"].overridden, true);
});

test("a file without $motion keeps its explicit motion tokens", () => {
  const t = byName(compile({ duration: { quick: "150ms" }, ease: { spring: "cubic-bezier(0.2, 0, 0, 1)" } }).tokens);
  assert.equal(t["--duration-quick"].value, "150ms");
  assert.equal(t["--ease-spring"].value, "cubic-bezier(0.2, 0, 0, 1)");
  assert.equal(t["--reveal-animation"], undefined);
});

test("invalid $motion values are rejected with their path", () => {
  assert.throws(() => compile({ space, $motion: { durations: { base: -1 } } }), /\$motion\.durations\.base/);
  assert.throws(() => compile({ space, $motion: { press: 1.5 } }), /\$motion\.press/);
  assert.throws(() => compile({ space, $motion: { lift: "huge" } }), /\$motion\.lift/);
  assert.throws(() => compile({ space, $motion: { spring: { mass: 0, stiffness: 1, damping: 1 } } }), /\$motion\.spring\.mass/);
});

const shape = (shadow = {}) => ({ $palette: { neutral: { hue: 200, chroma: 0.01 }, lightness: palette.lightness }, $shape: { shadow } });

test("$shape.shadow derives a tinted colour and three layered elevations", () => {
  const t = byName(compile(shape()).tokens);
  assert.equal(t["--shadow-color"].light, "0.2 0.03 200");
  assert.equal(t["--shadow-color"].dark, "0.05 0.03 200");
  const layers = (name) => t[name].value.split("oklch(").length - 1;
  assert.deepEqual([layers("--shadow-raised"), layers("--shadow-floating"), layers("--shadow-overlay")], [3, 4, 5]);
  assert.match(t["--shadow-raised"].value, /oklch\(var\(--shadow-color\) \/ [\d.]+\)/);
  assert.equal(t["--shadow-raised"].tier, 2);
});

test("one light source: every layer drops twice as far as it shifts", () => {
  for (const [angle, sign] of [["top-left", 1], ["top", 0], ["top-right", -1]]) {
    const value = byName(compile(shape({ angle })).tokens)["--shadow-floating"].value;
    for (const layer of value.split(/\), /)) {
      const [x, y] = layer.match(/-?[\d.]+(?=px)/g);
      assert.ok(Math.abs(Number(x) - (sign * Number(y)) / 2) < 0.02, `${angle}: ${x} vs ${y}`);
    }
  }
});

test("higher elevations are fainter per layer; strength scales opacity; dark is stronger", () => {
  const t = byName(compile(shape({ strength: 1 })).tokens);
  const alpha = (value) => Number(value.match(/\/ ([\d.]+)\)/)[1]);
  assert.ok(alpha(t["--shadow-raised"].value) > alpha(t["--shadow-overlay"].value));
  assert.ok(alpha(t["--shadow-raised"].darkValue) > alpha(t["--shadow-raised"].value));
  const none = byName(compile(shape({ strength: 0 })).tokens);
  assert.equal(alpha(none["--shadow-raised"].value), 0);
});

test("invalid $shape.shadow values are rejected with their path", () => {
  assert.throws(() => compile(shape({ strength: 2 })), /\$shape\.shadow\.strength/);
  assert.throws(() => compile(shape({ softness: -1 })), /\$shape\.shadow\.softness/);
  assert.throws(() => compile(shape({ angle: "below" })), /\$shape\.shadow\.angle/);
});

test("values and names that could break out of the CSS are refused", () => {
  for (const value of [
    "white; background: url(https://example.invalid/t.png)",
    'white } body::after { content: "x"',
    "white /* the rest is a comment",
    "</style><script>",
  ]) {
    assert.throws(() => compile({ color: { surface: value } }), /can't hold safely/, value);
  }
  assert.throws(() => compile({ color: { "surface: red; --x": "white" } }), /may only use letters/);
  assert.throws(() => compile({ color: { surface: { light: "white", dark: "black; color: red" } } }), /can't hold safely/);
  // Ordinary values, references and the generated ones all still pass
  const { tokens } = compile({ space: { s: "1rem" }, gutter: "{space.s}", ease: { x: "linear(0, 0.5 40%, 1)" }, font: { body: "'Inter', system-ui, sans-serif" } });
  assert.equal(tokens.find((t) => t.name === "--gutter").value, "var(--space-s)");
});
