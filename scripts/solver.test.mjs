import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repair, repairBrand } from "./solver.mjs";
import { generate } from "./harmony.mjs";
import { compile, contrastReport } from "./tokens-core.mjs";

const tokens = JSON.parse(fs.readFileSync(new URL("../design-tokens.json", import.meta.url), "utf8"));
const draftWith = (changes) => ({ ...structuredClone(tokens), ...changes });
const failing = (draft) => contrastReport(compile(draft).tokens).filter((row) => !row.passes);
const apply = (draft, { patch }) => ({ ...draft, ...patch });

test("a palette that already passes is left alone", () => {
  const palette = structuredClone(tokens.$palette);
  palette.action = { hue: 255, chroma: 0.2 };
  palette.lightness.ramp[6] = 0.5; // a darker action: passes both ways
  const draft = draftWith({ $palette: palette });
  if (failing(draft).length) return; // (guard: only meaningful if it does pass)
  const result = repair(draft);
  assert.deepEqual(result.adjustments, []);
  assert.deepEqual(result.unresolved, []);
});

test("a failing yellow warning is repaired in at most three steps, each recorded", () => {
  const palette = structuredClone(tokens.$palette);
  palette.status.warning = { hue: 95, chroma: 0.24 };
  palette.lightness.status.light.text = 0.62; // pale text on a pale surface: fails
  const draft = draftWith({ $palette: palette });
  assert.ok(failing(draft).some((row) => row.foreground === "color.status-warning-text"), "the setup must fail first");

  const result = repair(draft);
  const fixed = apply(draft, result);
  assert.ok(!failing(fixed).some((row) => row.foreground === "color.status-warning-text" && row.scheme === "light"));
  // Status text lightness is shared, so the first failing status pair's fix repairs warning too
  const steps = result.adjustments;
  assert.ok(steps.length >= 1 && steps.length <= 3, `${steps.length} adjustments`);
  for (const step of steps) {
    assert.ok(step.role && step.property && step.path && step.from !== undefined && step.to !== undefined && step.reason);
  }
});

test("a repair never breaks a pair that passed", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const { palette } = generate(tokens.$palette, { seed });
    const draft = draftWith({ $palette: palette });
    const passedBefore = new Set(contrastReport(compile(draft).tokens).filter((r) => r.passes).map((r) => `${r.scheme}|${r.foreground}|${r.background}`));
    const fixed = apply(draft, repair(draft));
    for (const row of contrastReport(compile(fixed).tokens)) {
      if (passedBefore.has(`${row.scheme}|${row.foreground}|${row.background}`)) assert.ok(row.passes, `seed ${seed}: broke ${row.foreground} (${row.scheme})`);
    }
  }
});

test("ten generated palettes come out fully passing, or with every failure reported", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const { palette } = generate(tokens.$palette, { seed });
    const draft = draftWith({ $palette: palette });
    const result = repair(draft);
    const remaining = failing(apply(draft, result));
    assert.equal(remaining.length, result.unresolved.length, `seed ${seed}: every remaining failure is reported`);
  }
});

test("locked hues never change, though their lightness or chroma may", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const { palette } = generate(tokens.$palette, { seed });
    const locks = { action: true, success: true, warning: true, danger: true, info: true };
    const result = repair(draftWith({ $palette: palette }), { locks });
    assert.equal(result.patch.$palette.action.hue, palette.action.hue);
    for (const name of ["success", "warning", "danger", "info"]) assert.equal(result.patch.$palette.status[name].hue, palette.status[name].hue);
    for (const adjustment of result.adjustments) if (locks[adjustment.role]) assert.equal(adjustment.locked, true);
  }
});

test("an exact brand colour keeps its hex; text on it switches end instead", () => {
  const draft = draftWith({ action: { 500: "#ffd500" } }); // a hard yellow: white text can't sit on it
  assert.ok(failing(draft).some((row) => row.foreground === "color.action-text"));
  const result = repair(draft, { fixed: ["action.500"], swapActionText: true });
  assert.equal(result.patch.action["500"], "#ffd500");
  assert.ok(result.adjustments.some((a) => a.role === "action-text"));
  assert.ok(!failing(apply(draft, result)).some((row) => row.foreground === "color.action-text"));
});

test("a pasted hard yellow passes by moving the colour, and says how far", () => {
  const draft = draftWith({ action: { 500: "#ffd500" } });
  const result = repair(draft);
  assert.deepEqual(result.unresolved, []);
  const moved = result.adjustments.find((a) => a.role === "action");
  assert.ok(moved && moved.from === "#ffd500" && moved.to !== "#ffd500", "the colour moved, and the move is recorded");
  assert.deepEqual(failing(apply(draft, result)), []);
});

test("a big move keeps the brand hex and switches the text on it; a small one moves the colour", () => {
  const yellow = repairBrand(draftWith({ action: { 500: "#ffd500" } }), "#ffd500");
  assert.equal(yellow.exact, true);
  assert.ok(Math.abs(yellow.shift) > 0.15, `shift ${yellow.shift}`);
  assert.equal(yellow.patch.action["500"], "#ffd500");
  assert.equal(yellow.patch.color["action-text"], "{neutral.950}");

  const moveAnyway = repairBrand(draftWith({ action: { 500: "#ffd500" } }), "#ffd500", { prefer: "move" });
  assert.equal(moveAnyway.exact, false);
  assert.notEqual(moveAnyway.patch.action["500"], "#ffd500");

  for (const hex of ["#1d4ed8", "#dc2626", "#2563eb"]) {
    const result = repairBrand(draftWith({ action: { 500: hex } }), hex);
    assert.equal(result.exact, false, `${hex} keeps white text`);
    assert.ok(Math.abs(result.shift) <= 0.15, `${hex} shift ${result.shift}`);
  }
});

test("a hundred generated palettes, every mode and vividness, all come out passing", () => {
  const modes = ["analogous", "complementary", "split-complementary", "triadic", "random"];
  for (let seed = 1; seed <= 100; seed++) {
    const { palette } = generate(tokens.$palette, { seed, mode: modes[seed % 5], vividness: 0.08 + (seed % 9) * 0.02 });
    const draft = draftWith({ $palette: palette });
    const result = repair(draft);
    assert.deepEqual(result.unresolved, [], `seed ${seed}`);
    assert.deepEqual(failing(apply(draft, result)), [], `seed ${seed}`);
  }
});
