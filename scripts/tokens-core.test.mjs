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
