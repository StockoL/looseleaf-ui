/**
 * LooseLeaf UI - Token Configurator
 * Classic script (browsers block module scripts from file://). The draft *is* a
 * design-tokens.json object and every control is a view onto it. Each change compiles
 * the draft with the build's own compiler (tokens-lib.js) and posts the CSS into the
 * preview iframe, so the preview is byte-identical to what npm run build writes.
 * The tool never writes to disk: Export downloads the draft.
 */

(() => {
  "use strict";

  const lib = window.LooseLeafTokens;
  const STORAGE_KEY = "looseleaf-configurator:draft";
  const VIEWPORT_KEY = "looseleaf-configurator:viewport";
  const HASH_PREFIX = "#draft=";
  const PALETTE_GROUPS = ["neutral", "action", "accent", ...lib.STATUS_NAMES];

  const { FONT_STACKS } = lib; // Modern Font Stacks, shared with the CLI

  const EASINGS = [
    { label: "Standard", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
    { label: "Ease out", value: "cubic-bezier(0, 0, 0.2, 1)" },
    { label: "Ease in out", value: "cubic-bezier(0.65, 0, 0.35, 1)" },
    { label: "Linear", value: "linear" },
  ];

  const { MOTION_PRESETS, DURATION_KEYS, LIFT_SIZES } = lib;

  const BUTTON_STYLES = {
    outlined: {
      "default-bg": "transparent",
      "default-text": "{color.text}",
      "default-border": "{color.border}",
      "default-bg-hover": "{color.surface-sunken}",
      "default-border-hover": "{color.border-strong}",
    },
    filled: {
      "default-bg": "{color.action}",
      "default-text": "{color.action-text}",
      "default-border": "{color.action}",
      "default-bg-hover": "{color.action-hover}",
      "default-border-hover": "{color.action-hover}",
    },
  };

  const LINK_STYLES = {
    always: { decoration: "underline", "decoration-hover": "underline" },
    hover: { decoration: "none", "decoration-hover": "underline" },
  };

  const dom = {
    toolbar: document.querySelector(".configurator__toolbar"),
    errors: document.getElementById("errors"),
    preview: document.getElementById("preview"),
    frame: document.getElementById("preview-frame"),
    viewportRange: document.getElementById("viewport-range"),
    viewportNumber: document.getElementById("viewport-number"),
    viewportScale: document.getElementById("viewport-scale"),
    contrastRows: document.getElementById("contrast-rows"),
    importDialog: document.getElementById("import-dialog"),
    importFile: document.getElementById("import-file"),
    importError: document.getElementById("import-error"),
    dropzone: document.getElementById("dropzone"),
    copyLink: document.getElementById("copy-link"),
    section: (name) => document.querySelector(`[data-section="${name}"]`),
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  let draft = loadInitialDraft();
  let compiled = null;
  let draftError = null; // set while the draft fails to compile; exports refuse to run
  let theme = "auto";
  let viewport = readViewport();
  let uid = 0;
  const syncers = [];
  const renderers = [];

  /* ------------------------------------------------------------------------
     DRAFT ACCESS
     Token leaves are plain values or { $value, $purpose } objects.
     ------------------------------------------------------------------------ */
  function getPath(path) {
    return path.reduce((node, key) => (node == null ? undefined : node[key]), draft);
  }

  function setPath(path, value) {
    let node = draft;
    for (const key of path.slice(0, -1)) {
      if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
      node = node[key];
    }
    node[path[path.length - 1]] = value;
  }

  function deletePath(path) {
    const parent = path.length > 1 ? getPath(path.slice(0, -1)) : draft;
    if (parent && typeof parent === "object") delete parent[path[path.length - 1]];
  }

  function isValueObject(node) {
    return node !== null && typeof node === "object" && "$value" in node;
  }

  function getToken(path) {
    const node = getPath(path);
    return isValueObject(node) ? node.$value : node;
  }

  function setToken(path, value) {
    const node = getPath(path);
    if (isValueObject(node)) node.$value = value;
    else setPath(path, value);
  }

  /* ------------------------------------------------------------------------
     DOM HELPERS
     ------------------------------------------------------------------------ */
  function el(tag, attributes = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (value === false || value === null || value === undefined) continue;
      node.setAttribute(name, value === true ? "" : String(value));
    }
    node.append(...children.filter((child) => child !== null && child !== undefined));
    return node;
  }

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#icon-${name}`);
    svg.append(use);
    return svg;
  }

  function heading(container, text) {
    container.append(el("p", { class: "label" }, text));
  }

  /* ------------------------------------------------------------------------
     CONTROLS
     ------------------------------------------------------------------------ */

  /** Range slider + number input bound to one numeric value. */
  function slider(container, { label, min, max, step, unit, hint, read, write }) {
    const id = `control-${++uid}`;
    const range = el("input", { class: "input", type: "range", min, max, step, "aria-label": label, tabindex: -1 });
    const number = el("input", { class: "input", type: "number", id, min, max, step });
    const group = el("div", { class: "input-group" }, number, unit ? el("span", { class: "input-group__addon" }, unit) : null);

    container.append(
      el(
        "div",
        { class: "field" },
        el("label", { class: "label", for: id }, label),
        el("div", { class: "field__controls" }, range, group),
        hint ? el("p", { class: "field__hint" }, hint) : null,
      ),
    );

    const commit = (source, mirror) => {
      const value = Number(source.value);
      if (source.value === "" || !Number.isFinite(value)) return;
      mirror.value = value;
      write(value);
      changed();
    };
    range.addEventListener("input", () => commit(range, number));
    number.addEventListener("input", () => commit(number, range));

    syncers.push(() => {
      const value = read();
      range.value = Number.isFinite(value) ? value : "";
      number.value = Number.isFinite(value) ? value : "";
    });
  }

  function select(container, { label, options, hint, read, write }) {
    const id = `control-${++uid}`;
    const input = el("select", { class: "input", id });
    container.append(
      el(
        "div",
        { class: "field" },
        el("label", { class: "label", for: id }, label),
        input,
        hint ? el("p", { class: "field__hint" }, hint) : null,
      ),
    );
    input.addEventListener("change", () => {
      write(input.value);
      changed();
    });
    syncers.push(() => {
      const value = read();
      input.replaceChildren(...options.map((option) => el("option", { value: option.value }, option.label)));
      if (value !== undefined && !options.some((option) => option.value === value)) {
        input.append(el("option", { value }, `Custom: ${value}`));
      }
      input.value = value ?? "";
    });
  }

  function text(container, { label, placeholder, hint, read, write }) {
    const id = `control-${++uid}`;
    const input = el("input", { class: "input", type: "text", id, placeholder, autocomplete: "off", spellcheck: "false" });
    container.append(
      el(
        "div",
        { class: "field" },
        el("label", { class: "label", for: id }, label),
        input,
        hint ? el("p", { class: "field__hint" }, hint) : null,
      ),
    );
    input.addEventListener("input", () => {
      write(input.value.trim());
      changed();
    });
    syncers.push(() => {
      if (document.activeElement !== input) input.value = read();
    });
  }

  function segmented(container, { legend, options, read, write }) {
    const name = `control-${++uid}`;
    const fieldset = el("fieldset", { class: "choice-group", "data-variant": "segmented" }, el("legend", { class: "visually-hidden" }, legend));
    const inputs = options.map((option, index) => {
      const id = `${name}-${index}`;
      const input = el("input", { class: "visually-hidden", type: "radio", name, id, value: option.value });
      input.addEventListener("change", () => {
        write(option.value);
        changed();
      });
      fieldset.append(input, el("label", { for: id }, option.label));
      return input;
    });
    container.append(el("div", { class: "field" }, el("p", { class: "label" }, legend), fieldset));
    syncers.push(() => {
      const value = read();
      inputs.forEach((input) => (input.checked = input.value === value));
    });
  }

  function toggle(container, { label, hint, read, write }) {
    const checkbox = el("input", { class: "choice__input", type: "checkbox" });
    checkbox.addEventListener("change", () => {
      write(checkbox.checked);
      changed();
    });
    container.append(
      el("div", { class: "field" }, el("label", { class: "choice" }, checkbox, ` ${label}`), hint ? el("p", { class: "field__hint" }, hint) : null),
    );
    syncers.push(() => (checkbox.checked = Boolean(read())));
  }

  // Binding factories
  const input = (path) => ({ read: () => Number(getPath(path)), write: (value) => setPath(path, value) });
  const unitToken = (path, unit) => ({
    read: () => parseFloat(getToken(path)),
    write: (value) => setToken(path, `${value}${unit}`),
  });

  /* ------------------------------------------------------------------------
     1. TYPE SCALE
     ------------------------------------------------------------------------ */
  function scaleList(container, rowsFor) {
    const list = el("dl", { class: "configurator__scale-list" });
    container.append(list);
    renderers.push(() => {
      let rows = [];
      try {
        rows = rowsFor();
      } catch {
        rows = [];
      }
      list.replaceChildren(
        ...rows.flatMap((row) => [
          el("dt", {}, row.name),
          el("dd", {}, `${round(row.minPx / 16)}–${round(row.maxPx / 16)}rem`),
          el("dd", {}, `${round(row.minPx)}–${round(row.maxPx)}px`),
        ]),
      );
    });
  }

  const round = (value) => Math.round(value * 100) / 100;
  const capitalise = (word) => word[0].toUpperCase() + word.slice(1);

  function buildType() {
    const section = dom.section("type");
    slider(section, { label: "Min viewport", unit: "px", min: 240, max: 800, step: 10, ...input(["$utopia", "minViewport"]) });
    slider(section, { label: "Max viewport", unit: "px", min: 800, max: 2400, step: 10, ...input(["$utopia", "maxViewport"]), hint: "Shared with the space scale." });
    slider(section, { label: "Min base size", unit: "px", min: 12, max: 24, step: 0.5, ...input(["$utopia", "type", "minBase"]) });
    slider(section, { label: "Max base size", unit: "px", min: 12, max: 28, step: 0.5, ...input(["$utopia", "type", "maxBase"]) });
    slider(section, { label: "Min ratio", min: 1, max: 1.618, step: 0.001, ...input(["$utopia", "type", "minRatio"]) });
    slider(section, { label: "Max ratio", min: 1, max: 1.618, step: 0.001, ...input(["$utopia", "type", "maxRatio"]) });
    slider(section, { label: "Steps below", min: 0, max: 3, step: 1, ...input(["$utopia", "type", "stepsBelow"]) });
    slider(section, { label: "Steps above", min: 1, max: 8, step: 1, ...input(["$utopia", "type", "stepsAbove"]), hint: "Headings use steps up to 5; fewer steps break --heading-1." });
    heading(section, "Resolved steps");
    scaleList(section, () =>
      draft.$utopia?.type ? lib.typeScale(draft.$utopia).map((step) => ({ ...step, name: `--step-${step.key}` })) : [],
    );
  }

  /* ------------------------------------------------------------------------
     2. SPACE SCALE
     ------------------------------------------------------------------------ */
  function buildSpace() {
    const section = dom.section("space");
    section.append(el("p", { class: "field__hint" }, "Viewports are shared with the type scale. One-up pairs (s-m, m-l, l-xl) are generated."));
    slider(section, { label: "Min base space", unit: "px", min: 8, max: 32, step: 0.5, ...input(["$utopia", "space", "minBase"]) });
    slider(section, { label: "Max base space", unit: "px", min: 8, max: 32, step: 0.5, ...input(["$utopia", "space", "maxBase"]) });
    const multipliers = Object.keys(draft.$utopia?.space?.multipliers ?? {});
    for (const key of multipliers) {
      slider(section, { label: `Multiplier ${key}`, unit: "×", min: 0, max: 12, step: 0.05, ...input(["$utopia", "space", "multipliers", key]) });
    }
    heading(section, "Resolved space");
    scaleList(section, () =>
      draft.$utopia?.space ? lib.spaceScale(draft.$utopia).map((size) => ({ ...size, name: `--space-${size.key}` })) : [],
    );
  }

  /* ------------------------------------------------------------------------
     3. PALETTE
     ------------------------------------------------------------------------ */
  const swatchGrids = new Map();
  const swatches = new Map();

  /* ------------------------------------------------------------------------
     3a. PALETTE GENERATOR
     Rerolls the unlocked hue slots (harmony.mjs), then repairs contrast
     (solver.mjs) so the contrast table stays green. Its state lives in
     draft.$generator, so autosave and Copy link carry it; exports leave it out.
     ------------------------------------------------------------------------ */
  const { SLOTS, MODES, VIVIDNESS } = lib;
  const HISTORY_LENGTH = 10;
  const GENERATOR_DEFAULTS = { mode: "random", vividness: VIVIDNESS.default, locks: {}, history: [], adjustments: [] };
  const generatorView = () => ({ ...GENERATOR_DEFAULTS, ...draft.$generator });
  // The same object every call (callers hold on to it), with any missing defaults filled in
  function generator() {
    draft.$generator ??= {};
    for (const [key, value] of Object.entries(GENERATOR_DEFAULTS)) if (!(key in draft.$generator)) draft.$generator[key] = clone(value);
    return draft.$generator;
  }
  const slotPath = (slot) => (lib.STATUS_NAMES.includes(slot) ? ["$palette", "status", slot] : ["$palette", slot]);
  const slotToken = (slot) => (lib.STATUS_NAMES.includes(slot) ? `${slot}.base` : slot === "neutral" ? "neutral.500" : `${slot}.500`);
  const colourOf = (path) => compiled?.tokens.find((token) => token.path === path)?.light;

  // Undo the last repair (newest first) before generating again, so adjustments never pile up
  function revertAdjustments() {
    const state = generator();
    for (const adjustment of [...state.adjustments].reverse()) setPath(adjustment.path, clone(adjustment.from));
    state.adjustments = [];
  }

  // With a locked brand colour, repairBrand decides (or follows state.prefer): move it, or keep it and switch the text on it
  function repairContrast() {
    const state = generator();
    const brand = state.source && state.locks.action;
    const result = brand ? lib.repairBrand(draft, state.source, { locks: state.locks, prefer: state.prefer }) : lib.repair(draft, { locks: state.locks });
    Object.assign(draft, result.patch);
    state.adjustments = result.adjustments;
    state.exact = brand ? result.exact : false;
    state.shift = brand ? result.shift : 0;
  }

  function remember(mode, seed) {
    const state = generator();
    const snapshot = { mode, seed, $palette: clone(draft.$palette), color: { link: clone(draft.color.link), "action-text": clone(draft.color["action-text"]) }, adjustments: clone(state.adjustments) };
    for (const slot of SLOTS) if (draft[slot]) snapshot[slot] = clone(draft[slot]);
    state.history = [snapshot, ...state.history].slice(0, HISTORY_LENGTH);
  }

  function generatePalette() {
    const state = generator();
    revertAdjustments();
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { palette, mode } = lib.generate(draft.$palette, { locks: state.locks, mode: state.mode, vividness: state.vividness, seed });
    draft.$palette = palette;
    for (const slot of SLOTS) if (!state.locks[slot]) deletePath([slot]); // hand-picked swatches go with an unlocked slot
    if (!state.locks.action) {
      delete state.source;
      delete state.prefer;
    }
    state.seed = seed;
    repairContrast();
    remember(mode, seed);
    afterGenerate();
  }

  function restore(snapshot) {
    const state = generator();
    draft.$palette = clone(snapshot.$palette);
    Object.assign(draft.color, clone(snapshot.color));
    for (const slot of SLOTS) {
      if (snapshot[slot]) draft[slot] = clone(snapshot[slot]);
      else deletePath([slot]);
    }
    state.adjustments = clone(snapshot.adjustments);
    state.seed = snapshot.seed;
    afterGenerate();
  }

  // prefer: undefined (the threshold decides), "exact" or "move"
  function startFrom(hex, prefer) {
    const state = generator();
    const fresh = hex !== state.source;
    revertAdjustments();
    const { c, h } = lib.hexToOklch(hex);
    state.locks = { ...state.locks, action: true };
    state.source = hex;
    state.prefer = prefer;
    draft.$palette.action = { hue: Math.round(h), chroma: Number(c.toFixed(3)) };
    draft.action = { "500": hex };
    if (fresh) {
      // Everything unlocked derives from the new action hue
      const seed = Math.floor(Math.random() * 2 ** 31);
      const { palette, mode } = lib.generate(draft.$palette, { locks: state.locks, mode: state.mode, vividness: state.vividness, seed });
      draft.$palette = palette;
      state.seed = seed;
      repairContrast();
      remember(mode, seed);
    } else {
      repairContrast();
    }
    afterGenerate();
  }

  function afterGenerate() {
    syncControls();
    changed();
  }

  function buildGenerator(section) {
    heading(section, "Generate a palette");
    section.append(
      el("p", { class: "field__hint" }, "Rerolls every unlocked hue and keeps the contrast table green, adjusting lightness, chroma or a status hue where it must. Press Space on the strip to generate. Harmony rules are a starting point; the preview is the decision."),
    );

    const strip = el("div", { class: "configurator__strip", role: "group", tabindex: 0, "aria-label": "Palette slots. Press Space to generate." });
    const slots = SLOTS.map((slot) => {
      const lock = el("button", { class: "button", type: "button", "data-icon-only": true, "data-size": "small", "aria-pressed": "false", "aria-label": `Lock ${slot}` }, icon("unlock"));
      lock.addEventListener("click", () => {
        const state = generator();
        state.locks = { ...state.locks, [slot]: !state.locks[slot] };
        changed();
      });
      const swatch = el("span", { class: "configurator__slot-colour" });
      strip.append(el("div", { class: "configurator__slot" }, swatch, el("span", {}, capitalise(slot)), lock));
      return { slot, swatch, lock };
    });
    strip.addEventListener("keydown", (event) => {
      if (event.key === " " && event.target === strip) {
        event.preventDefault();
        generatePalette();
      }
    });

    const button = (label, onClick, variant) => {
      const node = el("button", { class: "button", type: "button", "data-variant": variant }, label);
      node.addEventListener("click", onClick);
      return node;
    };
    const setLocks = (locked) => {
      generator().locks = Object.fromEntries(SLOTS.map((slot) => [slot, locked]));
      changed();
    };
    section.append(
      strip,
      el("div", { class: "cluster", style: "--gutter: var(--space-2xs);" }, button("Generate", generatePalette, "primary"), button("Lock all", () => setLocks(true)), button("Unlock all", () => setLocks(false))),
    );

    select(section, {
      label: "Harmony",
      options: MODES.map((mode) => ({ value: mode, label: capitalise(mode.replace("-", " ")) })),
      hint: "How the accent relates to the action colour. Statuses stay in their own colour families.",
      read: () => generatorView().mode,
      write: (value) => (generator().mode = value),
    });
    slider(section, {
      label: "Vividness",
      min: VIVIDNESS.min,
      max: VIVIDNESS.max,
      step: 0.01,
      hint: "One chroma for action and accent; statuses at 0.8 of it. Applies on the next Generate.",
      read: () => generatorView().vividness,
      write: (value) => (generator().vividness = value),
    });

    // Start from a colour
    const brandId = `control-${++uid}`;
    const brand = el("input", { class: "input", id: brandId, type: "text", placeholder: "#1d4ed8", autocomplete: "off", spellcheck: "false" });
    const use = button("Use", () => {
      const hex = brand.value.trim().toLowerCase();
      if (!lib.isHex(hex)) {
        report.textContent = "Enter a colour as a hex code, like #1d4ed8.";
        return;
      }
      startFrom(hex);
    });
    // The other choice: keep the exact hex, or move the colour to keep white text
    const alternative = button("", () => {
      const state = generatorView();
      if (state.source) startFrom(state.source, state.exact ? "move" : "exact");
    });
    const report = el("p", { class: "field__hint", "aria-live": "polite" });
    section.append(
      el("div", { class: "field" }, el("label", { class: "label", for: brandId }, "Start from a colour"), el("div", { class: "input-group" }, brand, use), report, alternative),
    );

    const adjustmentsList = el("ul", { class: "configurator__adjustments flow", role: "list" });
    const history = el("div", { class: "configurator__history" });
    heading(section, "Adjusted to meet AA");
    section.append(adjustmentsList);
    heading(section, "History");
    section.append(history);

    renderers.push(() => {
      const state = generatorView();
      for (const { slot, swatch, lock } of slots) {
        swatch.style.setProperty("--slot-colour", colourOf(slotToken(slot)) ?? "transparent");
        const locked = Boolean(state.locks[slot]);
        lock.setAttribute("aria-pressed", String(locked));
        if (locked) lock.dataset.variant = "primary";
        else delete lock.dataset.variant;
        lock.replaceChildren(icon(locked ? "lock" : "unlock"));
      }

      // What happened to a pasted colour, and the other choice
      const moved = state.adjustments.find((a) => a.path.join(".") === "action.500");
      const shift = `${state.shift > 0 ? "+" : "−"}${Math.abs(state.shift ?? 0).toFixed(2)}`;
      const darkText = state.adjustments.some((a) => a.role === "action-text");
      alternative.hidden = !state.source || (!state.exact && !moved);
      alternative.textContent = state.exact ? "Move the colour to keep white text" : "Use exact hex anyway";
      if (!state.source) report.textContent = "";
      else if (state.exact && state.prefer === "exact") report.textContent = `Kept ${state.source} exactly.${darkText ? " Text on action switched to the dark end to meet AA." : ""}`;
      else if (state.exact) report.textContent = `Kept ${state.source} exactly: white text on it would have needed a lightness change of ${shift}, enough to change the colour.${darkText ? " Text on action switched to the dark end instead." : ""}`;
      else if (moved) report.textContent = `Moved ${moved.from} to ${moved.to} (lightness ${shift}) so white text on it meets AA.`;
      else report.textContent = `Used ${state.source} exactly: it meets AA as it is.`;

      // Adjustments, each revertible, then whatever still fails
      const failing = compiled ? lib.contrastReport(compiled.tokens).filter((row) => !row.passes) : [];
      adjustmentsList.replaceChildren(
        ...state.adjustments.map((adjustment, index) => {
          const revert = el("button", { class: "button", type: "button", "data-size": "small", "aria-label": `Revert ${adjustment.role} ${adjustment.property}` }, icon("undo"));
          revert.addEventListener("click", () => {
            const current = generator();
            setPath(adjustment.path, clone(adjustment.from));
            current.adjustments = current.adjustments.filter((_, i) => i !== index);
            afterGenerate();
          });
          const ref = (v) => String(v).replace(/^\{(.+)\}$/, "$1");
          const value = (v) => (v && typeof v === "object" ? `light ${ref(v.light)}, dark ${ref(v.dark)}` : ref(v));
          return el(
            "li",
            { class: "cluster", style: "--cluster-justify: space-between; --cluster-align: center;" },
            el("span", { class: "text-small" }, `${capitalise(adjustment.role)}: ${adjustment.property}, ${value(adjustment.from)} → ${value(adjustment.to)}, for ${adjustment.reason}${adjustment.locked ? " (locked slot: hue kept)" : ""}.`),
            revert,
          );
        }),
        ...failing.map((row) =>
          el("li", {}, el("span", { class: "badge", "data-status": "warning" }, `Best available: ${row.foreground.replace("color.", "")} on ${row.background.replace("color.", "")}, ${row.ratio.toFixed(2)}:1 (${row.scheme})`)),
        ),
      );
      if (!state.adjustments.length && !failing.length) adjustmentsList.replaceChildren(el("li", { class: "text-small text-muted" }, "Nothing to adjust: every pair meets AA."));

      history.replaceChildren(
        ...state.history.map((snapshot, index) => {
          const item = el("button", { class: "configurator__mini", type: "button", "aria-label": `Restore palette ${index + 1} (${snapshot.mode})` });
          for (const slot of SLOTS) {
            const p = getPathIn(snapshot, slotPath(slot));
            const hex = p ? lib.oklchToHex(0.6, p.chroma ?? 0.15, p.hue) : "transparent";
            const chip = el("span");
            chip.style.setProperty("--slot-colour", hex);
            item.append(chip);
          }
          item.addEventListener("click", () => restore(snapshot));
          return item;
        }),
      );
      if (!state.history.length) history.replaceChildren(el("p", { class: "text-small text-muted" }, "Generated palettes appear here."));
    });
  }

  const getPathIn = (object, path) => path.reduce((node, key) => (node == null ? undefined : node[key]), object);

  function buildPalette() {
    const section = dom.section("palette");
    buildGenerator(section);

    const hue = (path, name) => ({ label: `${name} hue`, unit: "°", min: 0, max: 360, step: 1, ...input([...path, "hue"]) });

    heading(section, "Neutral");
    slider(section, hue(["$palette", "neutral"], "Neutral"));
    slider(section, { label: "Neutral chroma", min: 0, max: 0.03, step: 0.001, ...input(["$palette", "neutral", "chroma"]) });
    paletteGrid(section, "neutral");

    for (const name of ["action", "accent"]) {
      heading(section, capitalise(name));
      slider(section, hue(["$palette", name], capitalise(name)));
      slider(section, { label: `${capitalise(name)} chroma`, min: 0, max: 0.37, step: 0.005, ...input(["$palette", name, "chroma"]) });
      paletteGrid(section, name);
    }

    for (const name of lib.STATUS_NAMES) {
      heading(section, `Status: ${name}`);
      slider(section, hue(["$palette", "status", name], capitalise(name)));
      paletteGrid(section, name);
    }

    renderers.push(renderSwatches);
  }

  function paletteGrid(section, group) {
    const grid = el("div", { class: "grid", style: "--grid-min-item-size: 5.5rem; --gutter: var(--space-2xs);" });
    swatchGrids.set(group, grid);
    section.append(grid);
  }

  function createSwatch(token) {
    const [group, key] = token.path.split(".");
    const hex = el("code", { class: "swatch__hex" });
    const picker = el("input", { type: "color", "aria-label": `Override ${token.name}` });
    const revert = el("button", { class: "button", type: "button", "data-size": "small", "aria-label": `Revert ${token.name} to its derived value` }, icon("undo"));
    const badge = el("span", { class: "badge", "data-status": "info" }, "overridden");
    const root = el(
      "div",
      { class: "swatch" },
      el("span", { class: "swatch__tile" }),
      el("span", { class: "swatch__label" }, key),
      hex,
      el("span", { class: "configurator__swatch-actions" }, picker, revert),
      badge,
    );

    picker.addEventListener("input", () => {
      setPath([group, key], picker.value);
      changed();
    });
    revert.addEventListener("click", () => {
      deletePath([group, key]);
      const rest = draft[group] && Object.keys(draft[group]).filter((k) => !k.startsWith("$") && !k.startsWith("_"));
      if (rest && rest.length === 0) delete draft[group];
      changed();
    });

    return { root, hex, picker, revert, badge };
  }

  // Reverting only makes sense when there is a derived value to fall back to.
  function hasPaletteInput(group) {
    const palette = draft.$palette;
    return Boolean(lib.STATUS_NAMES.includes(group) ? palette?.status?.[group] : palette?.[group]);
  }

  function renderSwatches() {
    const seen = new Set();
    for (const token of compiled.tokens) {
      const grid = swatchGrids.get(token.group);
      if (!grid) continue;
      let swatch = swatches.get(token.path);
      if (!swatch) {
        swatch = createSwatch(token);
        swatches.set(token.path, swatch);
        grid.append(swatch.root);
      }
      swatch.root.style.setProperty("--swatch-color", token.light);
      if (token.overridden) swatch.root.dataset.state = "overridden";
      else delete swatch.root.dataset.state;
      swatch.hex.textContent = token.light;
      if (lib.isHex(token.light) && document.activeElement !== swatch.picker) swatch.picker.value = token.light;
      swatch.revert.hidden = !(token.overridden && hasPaletteInput(token.group));
      swatch.badge.hidden = !token.overridden;
      seen.add(token.path);
    }
    for (const [path, swatch] of swatches) {
      if (seen.has(path)) continue;
      swatch.root.remove();
      swatches.delete(path);
    }
  }

  /* ------------------------------------------------------------------------
     4. CONTRAST
     ------------------------------------------------------------------------ */
  function ratingFor(ratio) {
    if (ratio >= lib.CONTRAST_TARGET) return "success";
    if (ratio >= 3) return "warning";
    return "danger";
  }

  function renderContrast() {
    const report = lib.contrastReport(compiled.tokens);
    const rows = lib.CONTRAST_PAIRS.map(([foreground, background]) => {
      const cells = ["light", "dark"].map((scheme) => {
        const row = report.find((r) => r.foreground === foreground && r.background === background && r.scheme === scheme);
        if (!row) return el("td", {}, "—");
        return el(
          "td",
          {},
          el("span", { class: "badge", "data-status": ratingFor(row.ratio), title: `${row.fg} on ${row.bg}` }, row.ratio.toFixed(2)),
        );
      });
      return el(
        "tr",
        {},
        el("th", { scope: "row" }, el("code", {}, foreground.replace("color.", "")), " on ", el("code", {}, background.replace("color.", ""))),
        ...cells,
      );
    });
    dom.contrastRows.replaceChildren(...rows);
  }

  /* ------------------------------------------------------------------------
     5. FONTS
     ------------------------------------------------------------------------ */
  // Shared with the CLI (scripts/tokens-core.mjs), so exports match byte for byte
  const { parseFont, composeFont } = lib;
  const webFonts = () => lib.webFonts(draft);
  const fontImport = () => lib.fontImports(draft);

  function buildFonts() {
    const section = dom.section("fonts");
    for (const role of ["body", "heading"]) {
      const title = role === "body" ? "Body" : "Heading";
      heading(section, title);
      select(section, {
        label: `${title} stack`,
        options: FONT_STACKS.map(({ label, stack }) => ({ label, value: stack })),
        read: () => parseFont(getToken(["font", role])).stack,
        write: (stack) => setToken(["font", role], composeFont(parseFont(getToken(["font", role])).family, stack)),
      });
      text(section, {
        label: `${title} family (optional)`,
        placeholder: "e.g. Inter",
        hint: "A non-system family loads from Google Fonts: the theme bundle's CSS imports it for you. With the tokens source alone, your project must load it.",
        read: () => parseFont(getToken(["font", role])).family,
        write: (family) => setToken(["font", role], composeFont(family, parseFont(getToken(["font", role])).stack)),
      });
    }
  }

  /* ------------------------------------------------------------------------
     6. SHAPE
     ------------------------------------------------------------------------ */
  function buildShape() {
    const section = dom.section("shape");
    slider(section, { label: "Control radius", unit: "px", min: 0, max: 24, step: 1, ...unitToken(["radius", "control"], "px") });
    slider(section, { label: "Surface radius", unit: "px", min: 0, max: 32, step: 1, ...unitToken(["radius", "surface"], "px") });
    section.append(el("p", { class: "field__hint" }, "Pill is fixed at 999px."));

    heading(section, "Shadows");
    section.append(el("p", { class: "field__hint" }, "Layered shadows, tinted with the neutral hue, for three elevations: raised (cards), floating (menus, toasts) and overlay (dialogs)."));
    slider(section, { label: "Shadow strength", min: 0, max: 1, step: 0.05, read: () => shapeView().strength, write: (value) => (shapeDraft().strength = value) });
    slider(section, { label: "Shadow softness", min: 0, max: 1, step: 0.05, read: () => shapeView().softness, write: (value) => (shapeDraft().softness = value) });
    segmented(section, {
      legend: "Light from",
      options: lib.SHADOW_ANGLES.map((angle) => ({ value: angle, label: capitalise(angle.replace("-", " ")) })),
      read: () => shapeView().angle,
      write: (value) => (shapeDraft().angle = value),
    });
  }

  // A draft from before $shape keeps its hand-written shadows until the sliders are first used
  const SHADOW_DEFAULTS = { strength: 0.6, softness: 0.5, angle: "top-left" };
  const shapeView = () => ({ ...SHADOW_DEFAULTS, ...draft.$shape?.shadow });
  function shapeDraft() {
    if (!draft.$shape?.shadow) {
      draft.$shape = { ...draft.$shape, shadow: { ...SHADOW_DEFAULTS } };
      deletePath(["shadow"]);
    }
    return draft.$shape.shadow;
  }

  /* ------------------------------------------------------------------------
     7. MOTION
     Every value lives in $motion; the compiler derives the duration, ease,
     press, lift, reveal and stuck-navbar tokens from it. Nothing here
     exports a script: a per-project script would never receive later fixes.
     ------------------------------------------------------------------------ */
  const LEGACY_MOTION = [["duration", "quick"], ["duration", "base"], ["duration", "slow"], ["ease", "spring"], ["press-scale"], ["lift-distance"]];

  // What a draft from before $motion (explicit motion tokens) amounts to as $motion
  function legacyMotion() {
    const preset = MOTION_PRESETS.snappy;
    const number = (path, fallback) => {
      const value = parseFloat(getToken(path));
      return Number.isFinite(value) ? value : fallback;
    };
    const lift = String(getToken(["lift-distance"]) ?? "").match(/^\{space\.(.+)\}$/)?.[1];
    return {
      preset: "custom",
      spring: { ...preset.spring },
      durations: Object.fromEntries(DURATION_KEYS.map((key) => [key, number(["duration", key], preset.durations[key])])),
      press: number(["press-scale"], 0.97),
      lift: LIFT_SIZES.includes(lift) ? lift : "3xs",
      reveal: true,
      pageTransition: true,
      stuck: true,
    };
  }

  const motionView = () => draft.$motion ?? legacyMotion();

  // The first edit moves an older draft's explicit motion tokens into $motion
  function motionDraft() {
    if (!draft.$motion) {
      draft.$motion = legacyMotion();
      LEGACY_MOTION.forEach(deletePath);
    }
    return draft.$motion;
  }

  function springPreview(section) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "configurator__spring-plot");
    svg.setAttribute("viewBox", "0 0 200 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("role", "img");
    const target = document.createElementNS("http://www.w3.org/2000/svg", "line");
    target.setAttribute("class", "configurator__spring-target");
    const curve = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    curve.setAttribute("class", "configurator__spring-curve");
    svg.append(target, curve);

    const ball = el("div", { class: "configurator__spring-ball" });
    const track = el("div", { class: "configurator__spring-track" }, ball);
    const play = el("button", { class: "button", type: "button", "data-size": "small" }, "Play");
    const summary = el("p", { class: "field__hint", "aria-live": "polite" });
    section.append(svg, summary, el("div", { class: "flow", style: "--flow-space: var(--space-2xs);" }, track, play));

    let spring = null;
    const bounce = () => {
      if (!spring) return;
      const distance = track.clientWidth - ball.offsetWidth - 2 * parseFloat(getComputedStyle(track).paddingInlineStart);
      ball.getAnimations().forEach((animation) => animation.cancel());
      ball.animate([{ translate: "0" }, { translate: `${distance}px` }], { duration: Math.min(spring.settleMs, 2000), easing: spring.easing, fill: "forwards" });
    };
    play.addEventListener("click", bounce);

    let replay = 0;
    renderers.push(() => {
      try {
        spring = lib.springEasing(motionView().spring);
      } catch (error) {
        spring = null;
        summary.textContent = error.message;
        return;
      }
      const { samples } = lib.simulateSpring(motionView().spring);
      const top = Math.max(1, ...samples.map((sample) => sample.x));
      const bottom = Math.min(0, ...samples.map((sample) => sample.x));
      const y = (x) => 95 - ((x - bottom) / (top - bottom)) * 90;
      const step = Math.max(1, Math.floor(samples.length / 200));
      const points = samples.filter((_, index) => index % step === 0 || index === samples.length - 1);
      const end = samples[samples.length - 1].t;
      curve.setAttribute("points", points.map((p) => `${((p.t / end) * 200).toFixed(1)},${y(p.x).toFixed(1)}`).join(" "));
      for (const [name, value] of [["x1", 0], ["x2", 200], ["y1", y(1)], ["y2", y(1)]]) target.setAttribute(name, value);

      const overshoot = Math.round(spring.overshoot * 100);
      const asked = motionView().spring?.damping;
      const clamped = Number.isFinite(asked) && spring.damping > asked ? ` Damping raised to ${Math.round(spring.damping * 10) / 10} so it comes to rest.` : "";
      const label = `Settles in ${spring.settleMs} ms${overshoot > 0 ? `, overshooting by ${overshoot}%` : " with no overshoot"}.${clamped}`;
      summary.textContent = `${label} Exported as a linear() curve of ${spring.points.length} points.`;
      svg.setAttribute("aria-label", `Spring curve. ${label}`);

      // Replays as the spring changes, unless this browser asks for reduced motion
      clearTimeout(replay);
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) replay = setTimeout(bounce, 250);
    });
  }

  function buildMotion() {
    const section = dom.section("motion");
    section.append(
      el(
        "p",
        { class: "field__hint" },
        "Everything here exports as tokens. Visitors who ask their device for reduced motion, or pages with ",
        el("code", {}, 'data-motion="reduced"'),
        ", get none of it.",
      ),
    );

    let syncPreset = null;
    const custom = (motion) => {
      motion.preset = "custom";
      syncPreset?.();
    };

    segmented(section, {
      legend: "Preset",
      options: Object.keys(MOTION_PRESETS).map((key) => ({ value: key, label: capitalise(key) })),
      read: () => motionView().preset,
      write: (value) => {
        const motion = motionDraft();
        motion.preset = value;
        motion.spring = { ...MOTION_PRESETS[value].spring };
        motion.durations = { ...MOTION_PRESETS[value].durations };
        syncControls();
      },
    });
    syncPreset = syncers[syncers.length - 1];

    heading(section, "Spring");
    springPreview(section);
    for (const [key, label, min, max, step, hint] of [
      ["mass", "Mass", 0.1, 5, 0.1, "Heavier springs move more slowly and swing further."],
      ["stiffness", "Stiffness", 10, 600, 5, "Stiffer springs are quicker and snappier."],
      ["damping", "Damping", 0, 60, 0.5, "Less damping, more bounce. Very low values are raised just enough to settle."],
    ]) {
      slider(section, {
        label,
        min,
        max,
        step,
        hint,
        read: () => motionView().spring?.[key],
        write: (value) => {
          const motion = motionDraft();
          motion.spring = { ...MOTION_PRESETS.snappy.spring, ...motion.spring, [key]: value };
          custom(motion);
        },
      });
    }

    heading(section, "Durations");
    for (const key of DURATION_KEYS) {
      slider(section, {
        label: `${capitalise(key)} duration`,
        unit: "ms",
        min: 0,
        max: 1000,
        step: 10,
        read: () => motionView().durations?.[key],
        write: (value) => {
          const motion = motionDraft();
          motion.durations = { ...MOTION_PRESETS.snappy.durations, ...motion.durations, [key]: value };
          custom(motion);
        },
      });
    }
    select(section, {
      label: "Standard easing",
      options: EASINGS,
      hint: "For colour and opacity changes. Movement uses the spring.",
      read: () => getToken(["ease", "standard"]),
      write: (value) => setToken(["ease", "standard"], value),
    });

    heading(section, "Feedback");
    slider(section, {
      label: "Press scale",
      min: 0.85,
      max: 1,
      step: 0.01,
      hint: "How far buttons and choices shrink while pressed. 1 turns it off.",
      read: () => motionView().press,
      write: (value) => (motionDraft().press = value),
    });
    select(section, {
      label: "Lift distance",
      options: LIFT_SIZES.map((size) => ({ value: size, label: size === "none" ? "None" : `--space-${size}` })),
      hint: "How far .anim-lift and interactive cards rise on hover.",
      read: () => motionView().lift,
      write: (value) => (motionDraft().lift = value),
    });

    heading(section, "Enhancements");
    toggle(section, {
      label: "Scroll reveal",
      hint: "Elements with data-reveal fade in as they scroll into view.",
      read: () => motionView().reveal !== false,
      write: (value) => (motionDraft().reveal = value),
    });
    toggle(section, {
      label: "Page transitions",
      hint: "Pages on the same site cross-fade as they load.",
      read: () => motionView().pageTransition !== false,
      write: (value) => (motionDraft().pageTransition = value),
    });
    toggle(section, {
      label: "Compact sticky navbar",
      hint: "A sticky navbar tightens once it is stuck to the top.",
      read: () => motionView().stuck !== false,
      write: (value) => (motionDraft().stuck = value),
    });
  }

  /* ------------------------------------------------------------------------
     8. LAYOUT
     ------------------------------------------------------------------------ */
  function buildLayout() {
    const section = dom.section("layout");
    slider(section, { label: "Measure", unit: "ch", min: 40, max: 90, step: 1, ...unitToken(["measure"], "ch"), hint: "Reading width for prose and .center." });
    slider(section, { label: "Wrapper max", unit: "rem", min: 40, max: 120, step: 1, ...unitToken(["wrapper-max"], "rem"), hint: "Page section width for .wrapper." });
  }

  /* ------------------------------------------------------------------------
     9. DEFAULTS
     ------------------------------------------------------------------------ */
  function ensureGroup(name, purpose) {
    if (typeof draft[name] !== "object" || draft[name] === null) draft[name] = { $purpose: purpose };
    return draft[name];
  }

  function buildDefaults() {
    const section = dom.section("defaults");
    segmented(section, {
      legend: "Default button",
      options: [
        { value: "outlined", label: "Outlined" },
        { value: "filled", label: "Filled" },
      ],
      read: () => (draft.button?.["default-bg"] === BUTTON_STYLES.filled["default-bg"] ? "filled" : "outlined"),
      write: (value) =>
        Object.assign(ensureGroup("button", "Style of a .button with no data-variant: outlined (transparent) or filled (action)."), BUTTON_STYLES[value]),
    });
    segmented(section, {
      legend: "Link underline",
      options: [
        { value: "always", label: "Always" },
        { value: "hover", label: "On hover" },
      ],
      read: () => (draft.link?.decoration === "none" ? "hover" : "always"),
      write: (value) =>
        Object.assign(ensureGroup("link", "Decoration of unstyled anchors: underlined always, or only on hover."), LINK_STYLES[value]),
    });
  }

  /* ------------------------------------------------------------------------
     COMPILE, PREVIEW, PERSIST
     ------------------------------------------------------------------------ */
  let pending = false;

  function changed() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      render();
      persist();
    });
  }

  function render() {
    try {
      compiled = lib.compile(draft);
    } catch (error) {
      draftError = error.message;
      dom.errors.textContent = `The draft does not compile, so the preview is paused: ${error.message}`;
      dom.errors.hidden = false;
      return;
    }
    draftError = null;
    dom.errors.hidden = true;
    postTokens();
    renderers.forEach((renderer) => renderer());
    renderContrast();
  }

  function post(message) {
    dom.frame.contentWindow?.postMessage(message, "*");
  }

  function postTokens() {
    if (compiled) post({ type: "looseleaf:tokens", css: fontImport() + compiled.css });
  }

  function postTheme() {
    post({ type: "looseleaf:theme", theme });
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable (private window); the draft still lives in memory */
    }
  }

  function syncControls() {
    syncers.forEach((sync) => sync());
  }

  /* ------------------------------------------------------------------------
     DRAFT SOURCES: hash > localStorage > repo tokens
     ------------------------------------------------------------------------ */
  function encodeDraft(json) {
    const bytes = new TextEncoder().encode(JSON.stringify(json));
    let binary = "";
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeDraft(encoded) {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
  }

  function loadInitialDraft() {
    if (location.hash.startsWith(HASH_PREFIX)) {
      try {
        const fromHash = decodeDraft(location.hash.slice(HASH_PREFIX.length));
        // The hash is a one-time hand-off; later edits live in localStorage.
        history.replaceState(null, "", location.pathname + location.search);
        return fromHash;
      } catch {
        /* malformed link; fall through */
      }
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      /* storage unavailable or corrupt */
    }
    return clone(window.LooseLeafCurrentTokens);
  }

  function replaceDraft(next) {
    draft = next;
    rebuildControls();
    changed();
  }

  /* ------------------------------------------------------------------------
     TOOLBAR ACTIONS
     ------------------------------------------------------------------------ */
  // Every export records the looseleaf-ui version it came from and when.
  function exportMeta() {
    return { $version: lib.VERSION, $generated: new Date().toISOString() };
  }

  function sourceJson(meta) {
    const { $version, $generated, $generator, ...rest } = clone(draft); // the generator's state is the tool's, not the theme's
    const output = { ...meta, ...rest };
    const families = webFonts();
    if (families.length) {
      output._comment_fonts = `Web fonts used: ${families.join(", ")}. The configurator only loaded them for its preview; this project must load them itself.`;
    } else {
      delete output._comment_fonts;
    }
    return JSON.stringify(output, null, 2) + "\n";
  }

  function tokensCss() {
    return lib.themeStylesheet(compiled.css, fontImport());
  }

  function themeReadme(meta) {
    const families = webFonts();
    return [
      `LooseLeaf UI theme, exported ${meta.$generated.slice(0, 10)} from looseleaf-ui ${meta.$version}`,
      "",
      "Files",
      "  looseleaf-tokens.css   Your tokens, compiled. Load it after looseleaf.css.",
      "  tokens.resolved.json   Every token's resolved value (read by django-looseleaf).",
      "  design-tokens.json     The source. Import it into the configurator to keep editing.",
      "",
      "Django",
      "  Unzip these files into an app's static/theme/ folder (or a STATICFILES_DIRS",
      "  entry), then in settings.py:",
      "",
      '    INSTALLED_APPS = [..., "django.forms", "django_looseleaf"]',
      '    LOOSELEAF_THEME = "theme"',
      "",
      "  {% looseleaf_css %} then loads this theme after the base stylesheet.",
      "",
      "Plain HTML",
      `  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/StockoL/looseleaf-ui@v${meta.$version}/dist/looseleaf.css">`,
      '  <link rel="stylesheet" href="looseleaf-tokens.css">',
      ...(families.length
        ? ["", `Web fonts: ${families.join(", ")}. looseleaf-tokens.css imports them from Google Fonts.`]
        : []),
      "",
    ].join("\n");
  }

  function download(filename, data, type) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = el("a", { href: url, download: filename });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // A stale compile must never be exported: the draft on screen is what ships.
  function exportable() {
    if (!draftError) return true;
    window.alert(`Fix the draft before exporting: ${draftError}`);
    return false;
  }

  function exportSource() {
    if (exportable()) download("design-tokens.json", sourceJson(exportMeta()), "application/json");
  }

  function exportBundle() {
    if (!exportable()) return;
    const meta = exportMeta();
    const archive = lib.zip([
      { name: "looseleaf-tokens.css", data: tokensCss() },
      { name: "tokens.resolved.json", data: JSON.stringify(lib.resolvedTokens(compiled.tokens, meta), null, 2) + "\n" },
      { name: "design-tokens.json", data: sourceJson(meta) },
      { name: "README.txt", data: themeReadme(meta) },
    ]);
    download("looseleaf-theme.zip", archive, "application/zip");
  }

  async function copyTokensCss(item) {
    if (!exportable()) return;
    const label = item.textContent;
    try {
      await navigator.clipboard.writeText(tokensCss());
      item.textContent = "Copied";
    } catch {
      item.textContent = "Copy failed";
    }
    setTimeout(() => (item.textContent = label), 2000);
  }

  async function copyLink() {
    const url = `${location.href.split("#")[0]}${HASH_PREFIX}${encodeDraft(draft)}`;
    try {
      await navigator.clipboard.writeText(url);
      dom.copyLink.dispatchEvent(new CustomEvent("looseleaf:done", { bubbles: true })); // looseleaf.js shows the checkmark
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  function reset() {
    if (!window.confirm("Discard the draft and reload the repository's current tokens?")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    replaceDraft(clone(window.LooseLeafCurrentTokens));
  }

  async function importFile(file) {
    dom.importError.hidden = true;
    try {
      const json = JSON.parse(await file.text());
      lib.compile(json); // refuse a file the compiler rejects, before touching the draft
      replaceDraft(json);
      dom.importDialog.close();
    } catch (error) {
      dom.importError.textContent = `Could not import ${file.name}: ${error.message}`;
      dom.importError.hidden = false;
    } finally {
      dom.importFile.value = "";
    }
  }

  /* ------------------------------------------------------------------------
     VIEWPORT: the iframe is resized (so vw follows it) and scaled down to fit
     ------------------------------------------------------------------------ */
  function readViewport() {
    try {
      const stored = Number(localStorage.getItem(VIEWPORT_KEY));
      if (stored >= 320 && stored <= 1600) return stored;
    } catch {
      /* ignore */
    }
    return 1240;
  }

  function setViewport(value) {
    viewport = Math.min(1600, Math.max(320, Math.round(value) || 1240));
    dom.viewportRange.value = viewport;
    if (document.activeElement !== dom.viewportNumber) dom.viewportNumber.value = viewport;
    try {
      localStorage.setItem(VIEWPORT_KEY, String(viewport));
    } catch {
      /* ignore */
    }
    layoutFrame();
  }

  function layoutFrame() {
    const pane = dom.preview.getBoundingClientRect();
    const gutter = 16;
    const scale = Math.min(1, Math.max(0.1, (pane.width - gutter * 2) / viewport));
    dom.frame.style.inlineSize = `${viewport}px`;
    dom.frame.style.blockSize = `${(pane.height - gutter) / scale}px`;
    dom.frame.style.insetInlineStart = `${Math.max(0, (pane.width - viewport * scale) / 2)}px`;
    dom.frame.style.insetBlockStart = `${gutter / 2}px`;
    dom.frame.style.transform = scale < 1 ? `scale(${scale})` : "";
    dom.viewportScale.textContent = scale < 1 ? `${Math.round(scale * 100)}%` : "";
  }

  /* ------------------------------------------------------------------------
     WIRING
     ------------------------------------------------------------------------ */
  function rebuildControls() {
    syncers.length = 0;
    renderers.length = 0;
    swatchGrids.clear();
    swatches.clear();
    for (const name of ["type", "space", "palette", "fonts", "shape", "motion", "layout", "defaults"]) dom.section(name).replaceChildren();
    buildType();
    buildSpace();
    buildPalette();
    buildFonts();
    buildShape();
    buildMotion();
    buildLayout();
    buildDefaults();
    syncControls();
  }

  function wire() {
    document.querySelectorAll('input[name="scheme"]').forEach((radio) =>
      radio.addEventListener("change", () => {
        theme = radio.value;
        postTheme();
      }),
    );

    dom.viewportRange.addEventListener("input", () => setViewport(Number(dom.viewportRange.value)));
    dom.viewportNumber.addEventListener("change", () => setViewport(Number(dom.viewportNumber.value)));
    new ResizeObserver(layoutFrame).observe(dom.preview);
    new ResizeObserver(() => {
      document.body.style.setProperty("--sticky-offset", `${dom.toolbar.offsetHeight}px`);
    }).observe(dom.toolbar);

    // The iframe can (re)load at any time; always hand it the current draft.
    dom.frame.addEventListener("load", () => {
      postTokens();
      postTheme();
    });

    const exports = { bundle: exportBundle, source: exportSource, css: copyTokensCss };
    document.querySelectorAll("[data-export]").forEach((item) =>
      item.addEventListener("click", () => exports[item.dataset.export](item)),
    );
    document.getElementById("reset").addEventListener("click", reset);
    dom.copyLink.addEventListener("click", copyLink);
    // Opening and closing the import dialog (and the export menu) is handled by looseleaf.js.

    dom.importFile.addEventListener("change", () => dom.importFile.files[0] && importFile(dom.importFile.files[0]));
    dom.dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dom.dropzone.dataset.state = "dragover";
    });
    dom.dropzone.addEventListener("dragleave", () => delete dom.dropzone.dataset.state);
    dom.dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      delete dom.dropzone.dataset.state;
      const file = event.dataTransfer?.files?.[0];
      if (file) importFile(file);
    });
  }

  rebuildControls();
  wire();
  setViewport(viewport);
  render();
})();
