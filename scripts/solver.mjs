/**
 * LooseLeaf UI - Contrast repair
 * PURE: no fs, no process, no DOM. Shared by the configurator and tests.
 *
 * Runs the contrast table on both schemes and repairs each failing pair by
 * adjusting, in order, and stopping at the first change that passes AA:
 *   1. the lightness behind the foreground (or failing that, the background),
 *      within 0.08 of where it started;
 *   2. the chroma of that role, lowered in steps of 0.02 (never raised);
 *   3. the hue of a status, nudged towards the nearer end of its band;
 *   4. for links only, the next action step (400 in dark, 600 in light): links
 *      share action.500 with buttons, and white text on a button and a link on
 *      a dark page pull that one colour in opposite directions.
 * A change is kept only if no pair that passed before it now fails: the
 * lightness ramp is shared by neutral, action and accent, so a step that fixes
 * one pair can break another. Pairs that still fail are reported with their
 * ratio ("best available"). Locked slots never change hue.
 */

import { compile, contrastReport, RAMP_KEYS, STATUS_NAMES } from "./tokens-core.mjs";
import { hexToOklch, oklchToHex, relativeLuminance, isHex } from "./color.mjs";
import { BANDS, hueDistance } from "./harmony.mjs";

const RAMPED = ["neutral", "action", "accent"];
const LIGHTNESS_RANGE = 0.08;
const YOUR_COLOUR_RANGE = 0.4; // a pasted brand colour may move further: the panel reports exactly how far
const LIGHTNESS_STEP = 0.01;
const CHROMA_STEP = 0.02;
const HUE_STEP = 5;
const DEFAULT_STATUS_CHROMA = 0.15;
const ROUND = (value) => Number(value.toFixed(3));

const LABELS = {
  "color.text": "text",
  "color.text-muted": "muted text",
  "color.surface": "the page",
  "color.surface-sunken": "sunken surfaces",
  "color.action-text": "text on action",
  "color.action": "action",
  "color.link": "links",
};
const label = (path) => LABELS[path] ?? path.replace("color.status-", "").replace(/-/g, " ");

// Only what colour needs: the palette, the colour roles and explicit overrides of derived groups
function colourPart(draft) {
  const part = { $palette: draft.$palette, color: draft.color };
  for (const group of [...RAMPED, ...STATUS_NAMES]) if (draft[group]) part[group] = draft[group];
  return part;
}

const rowKey = (row) => `${row.scheme}|${row.foreground}|${row.background}`;
const evaluate = (work) => contrastReport(compile(work).tokens);

/** The derived token a colour role resolves to in a scheme: { group, key }, or null. */
function source(work, path, scheme, depth = 0) {
  let node = work.color?.[path.split(".")[1]];
  if (node && typeof node === "object" && "$value" in node) node = node.$value;
  const value = node && typeof node === "object" ? (node[scheme] ?? node.light) : node;
  const reference = /^\{([^{}]+)\}$/.exec(String(value ?? ""));
  if (!reference) return null;
  const [group, key] = reference[1].split(".");
  if (group === "color") return depth < 8 ? source(work, reference[1], scheme, depth + 1) : null;
  return { group, key };
}

function getPath(object, path) {
  return path.reduce((node, key) => (node == null ? undefined : node[key]), object);
}

function setPath(object, path, value) {
  let node = object;
  for (const key of path.slice(0, -1)) node = node[key] ??= {};
  node[path[path.length - 1]] = value;
}

function lightnessKnob(work, { group, key }, direction, fixed) {
  if (RAMPED.includes(group)) {
    const override = work[group]?.[key];
    if (typeof override === "string" && isHex(override)) {
      if (fixed.includes(`${group}.${key}`)) return null;
      const { l, c, h } = hexToOklch(override);
      return {
        role: group,
        property: `lightness of ${group}.${key} (your colour)`,
        path: [group, key],
        start: override,
        steps: range(l, direction, YOUR_COLOUR_RANGE, LIGHTNESS_STEP).map((L) => oklchToHex(L, c, h)),
      };
    }
    const index = RAMP_KEYS.indexOf(key);
    if (index < 0) return null;
    const path = ["$palette", "lightness", "ramp", index];
    const start = getPath(work, path);
    return { role: group, property: `lightness of ramp step ${key} (shared by neutral, action and accent)`, path, start, steps: range(start, direction, LIGHTNESS_RANGE, LIGHTNESS_STEP) };
  }
  if (STATUS_NAMES.includes(group)) {
    const [role, scheme = "light"] = key === "base" ? ["base", "light"] : key.split("-");
    const path = ["$palette", "lightness", "status", scheme, role];
    const start = getPath(work, path);
    if (typeof start !== "number") return null;
    return { role: group, property: `${role} lightness (${scheme} scheme, shared by every status)`, path, start, steps: range(start, direction, LIGHTNESS_RANGE, LIGHTNESS_STEP) };
  }
  return null;
}

function chromaKnob(work, { group }) {
  const path = RAMPED.includes(group) ? ["$palette", group, "chroma"] : STATUS_NAMES.includes(group) ? ["$palette", "status", group, "chroma"] : null;
  if (!path) return null;
  const start = getPath(work, path) ?? (STATUS_NAMES.includes(group) ? DEFAULT_STATUS_CHROMA : undefined);
  if (typeof start !== "number" || start <= 0) return null;
  const steps = [];
  for (let c = start - CHROMA_STEP; c > -CHROMA_STEP / 2; c -= CHROMA_STEP) steps.push(ROUND(Math.max(0, c)));
  return { role: group, property: "chroma", path, start, steps };
}

function hueKnob(work, { group }, locks) {
  if (!STATUS_NAMES.includes(group) || locks[group]) return null;
  const path = ["$palette", "status", group, "hue"];
  const start = getPath(work, path);
  const [low, high] = BANDS[group];
  if (typeof start !== "number") return null;
  const end = hueDistance(start, low) <= hueDistance(start, high) ? low : high;
  const direction = Math.sign(end - start);
  const steps = [];
  for (let h = start + direction * HUE_STEP; direction !== 0 && (direction > 0 ? h <= end : h >= end); h += direction * HUE_STEP) steps.push(h);
  if (steps[steps.length - 1] !== end && direction !== 0) steps.push(end);
  return { role: group, property: "hue", path, start, steps };
}

/* Darker action for white text on it, with dark-scheme links moved to the lighter 400 step so they don't pay for it */
function decoupledActionKnob(work, bg, fixed) {
  if (bg?.group !== "action" || bg.key !== "500") return null;
  const knob = lightnessKnob(work, bg, -1, fixed);
  if (!knob) return null;
  const link = linkKnob(work, "dark");
  return { ...knob, property: `${knob.property}, with dark-scheme links on action.400`, also: { path: link.path, start: link.start, value: link.steps[0] } };
}

function linkKnob(work, scheme) {
  const start = getPath(work, ["color", "link"]);
  const light = typeof start === "object" ? start.light : start;
  const dark = typeof start === "object" ? start.dark : start;
  const value = scheme === "dark" ? { light, dark: "{action.400}" } : { light: "{action.600}", dark };
  return { role: "link", property: `${scheme} colour (the ${scheme === "dark" ? "lighter" : "darker"} action step)`, path: ["color", "link"], start, steps: [value] };
}

function range(start, direction, span, step) {
  const steps = [];
  for (let i = 1; i * step <= span + 1e-9; i++) {
    const value = ROUND(start + direction * i * step);
    if (value < 0 || value > 1) break;
    steps.push(value);
  }
  return steps;
}

/**
 * repair(draft, options) -> { patch, adjustments, unresolved }
 *   patch:        { $palette, color, ...overrides } to merge back into the draft
 *   adjustments:  [{ role, property, path, from, to, reason, locked }]
 *   unresolved:   [{ foreground, background, scheme, ratio }]
 * Options: locks ({ action: true, … }); fixed (["action.500"]: overrides never
 * to touch); swapActionText (let text on action switch to the dark end, for an
 * exact brand colour that white text can't sit on).
 */
export function repair(draft, { locks = {}, fixed = [], swapActionText = false } = {}) {
  const work = structuredClone(colourPart(draft));
  const adjustments = [];
  const unresolved = [];

  for (const target of evaluate(work).filter((row) => !row.passes)) {
    const rows = evaluate(work);
    const current = rows.find((row) => rowKey(row) === rowKey(target));
    if (!current || current.passes) continue;
    const passing = rows.filter((row) => row.passes).map(rowKey);
    const fg = source(work, current.foreground, current.scheme);
    const bg = source(work, current.background, current.scheme);
    const lighter = relativeLuminance(current.fg) >= relativeLuminance(current.bg) ? 1 : -1;

    const knobs = [
      fg && lightnessKnob(work, fg, lighter, fixed),
      bg && lightnessKnob(work, bg, -lighter, fixed),
      fg && chromaKnob(work, fg),
      bg && chromaKnob(work, bg),
      fg && hueKnob(work, fg, locks),
      bg && hueKnob(work, bg, locks),
      current.foreground === "color.link" ? linkKnob(work, current.scheme) : null,
      current.foreground === "color.action-text" ? decoupledActionKnob(work, bg, fixed) : null,
      swapActionText && current.foreground === "color.action-text"
        ? { role: "action-text", property: "colour", path: ["color", "action-text"], start: getPath(work, ["color", "action-text"]), steps: ["{neutral.950}", "{neutral.0}"] }
        : null,
    ].filter(Boolean);

    let done = false;
    for (const knob of knobs) {
      for (const value of knob.steps) {
        setPath(work, knob.path, value);
        if (knob.also) setPath(work, knob.also.path, knob.also.value);
        const now = evaluate(work);
        if (passing.some((key) => !now.find((row) => rowKey(row) === key)?.passes)) break; // went too far: it broke another pair
        if (now.find((row) => rowKey(row) === rowKey(current))?.passes) {
          adjustments.push({
            role: knob.role,
            property: knob.property,
            path: knob.path,
            from: knob.start,
            to: value,
            reason: `${label(current.foreground)} on ${label(current.background)} (${current.scheme})`,
            locked: Boolean(locks[knob.role]),
          });
          if (knob.also) {
            adjustments.push({
              role: "link",
              property: "dark colour (the lighter action step)",
              path: knob.also.path,
              from: knob.also.start,
              to: knob.also.value,
              reason: `keeps links readable on the dark page after darkening action`,
              locked: false,
            });
          }
          done = true;
          break;
        }
      }
      if (done) break;
      setPath(work, knob.path, knob.start);
      if (knob.also) setPath(work, knob.also.path, knob.also.start);
    }

    if (!done) {
      const after = evaluate(work).find((row) => rowKey(row) === rowKey(current));
      unresolved.push({ foreground: current.foreground, background: current.background, scheme: current.scheme, ratio: after.ratio });
    }
  }

  return { patch: work, adjustments, unresolved };
}

/*
 * A brand colour: how far white text would push it decides what to do. A small
 * shift is invisible and white text is the convention, so the colour moves. A
 * big one (yellows, light cyans, limes) would stop it being the brand, so the
 * hex stays exact and the text on it switches to the dark end instead.
 */
export const BRAND_MOVE_LIMIT = 0.15;

/**
 * repairBrand(draft, hex, { locks, prefer }) -> repair()'s result plus { exact, shift }
 * The draft carries the brand colour as action.500. prefer: "exact" or "move" to
 * override the threshold; omitted, BRAND_MOVE_LIMIT decides. shift is the lightness
 * move white text would need (0 if none), reported either way.
 */
export function repairBrand(draft, hex, { locks = {}, prefer } = {}) {
  const moved = repair(draft, { locks });
  const move = moved.adjustments.find((a) => a.path.join(".") === "action.500");
  const shift = move ? hexToOklch(move.to).l - hexToOklch(hex).l : 0;
  const exact = prefer === "exact" || (prefer !== "move" && Math.abs(shift) > BRAND_MOVE_LIMIT);
  if (!exact) return { ...moved, exact: false, shift };
  return { ...repair(draft, { locks, fixed: ["action.500"], swapActionText: true }), exact: true, shift };
}
