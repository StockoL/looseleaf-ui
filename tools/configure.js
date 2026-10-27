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

  // Modern Font Stacks (modernfontstacks.com)
  const FONT_STACKS = [
    { label: "System UI", stack: "system-ui, sans-serif" },
    { label: "Humanist", stack: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif" },
    { label: "Transitional", stack: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif" },
    { label: "Geometric humanist", stack: "Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif" },
    { label: "Monospace", stack: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace" },
  ];

  const EASINGS = [
    { label: "Standard", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
    { label: "Spring", value: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" },
    { label: "Ease out", value: "cubic-bezier(0, 0, 0.2, 1)" },
    { label: "Linear", value: "linear" },
  ];

  const BUTTON_STYLES = {
    outlined: { "default-bg": "transparent", "default-text": "{color.text}", "default-border": "{color.border}" },
    filled: { "default-bg": "{color.action}", "default-text": "{color.action-text}", "default-border": "{color.action}" },
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

  function buildPalette() {
    const section = dom.section("palette");
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
    const grid = el("div", { class: "configurator__swatches" });
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
      el("span", { class: "swatch__actions" }, picker, revert),
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
  function parseFont(value = "") {
    for (const { stack } of FONT_STACKS) {
      if (value === stack) return { stack, family: "" };
      const match = value.match(/^\s*(['"])(.+?)\1\s*,\s*(.+)$/);
      if (match && match[3] === stack) return { stack, family: match[2] };
    }
    return { stack: value, family: "" };
  }

  function composeFont(family, stack) {
    return family ? `'${family.replace(/['"]/g, "")}', ${stack}` : stack;
  }

  function webFonts() {
    const families = ["body", "heading"].map((role) => parseFont(getToken(["font", role])).family).filter(Boolean);
    return [...new Set(families)];
  }

  function fontImport() {
    const families = webFonts();
    if (!families.length) return "";
    const query = families.map((family) => `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700`).join("&");
    return `@import url("https://fonts.googleapis.com/css2?${query}&display=swap");\n`;
  }

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
        hint: "A non-system family is loaded from Google Fonts in the preview only. Your project must load it; Export notes this.",
        read: () => parseFont(getToken(["font", role])).family,
        write: (family) => setToken(["font", role], composeFont(family, parseFont(getToken(["font", role])).stack)),
      });
    }
  }

  /* ------------------------------------------------------------------------
     6. SHAPE AND MOTION
     ------------------------------------------------------------------------ */
  function buildShape() {
    const section = dom.section("shape");
    heading(section, "Radius");
    slider(section, { label: "Control radius", unit: "px", min: 0, max: 24, step: 1, ...unitToken(["radius", "control"], "px") });
    slider(section, { label: "Surface radius", unit: "px", min: 0, max: 32, step: 1, ...unitToken(["radius", "surface"], "px") });
    section.append(el("p", { class: "field__hint" }, "Pill is fixed at 999px."));

    heading(section, "Duration");
    for (const key of ["quick", "base", "slow"]) {
      slider(section, { label: `${capitalise(key)} duration`, unit: "ms", min: 0, max: 1000, step: 10, ...unitToken(["duration", key], "ms") });
    }

    heading(section, "Easing");
    for (const key of ["standard", "spring"]) {
      select(section, {
        label: `${capitalise(key)} easing`,
        options: EASINGS,
        read: () => getToken(["ease", key]),
        write: (value) => setToken(["ease", key], value),
      });
    }
  }

  /* ------------------------------------------------------------------------
     7. LAYOUT
     ------------------------------------------------------------------------ */
  function buildLayout() {
    const section = dom.section("layout");
    slider(section, { label: "Measure", unit: "ch", min: 40, max: 90, step: 1, ...unitToken(["measure"], "ch"), hint: "Reading width for prose and .center." });
    slider(section, { label: "Wrapper max", unit: "rem", min: 40, max: 120, step: 1, ...unitToken(["wrapper-max"], "rem"), hint: "Page section width for .wrapper." });
  }

  /* ------------------------------------------------------------------------
     8. DEFAULTS
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
      dom.errors.textContent = `The draft does not compile, so the preview is paused: ${error.message}`;
      dom.errors.hidden = false;
      return;
    }
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
  function exportDraft() {
    const output = clone(draft);
    const families = webFonts();
    if (families.length) {
      output._comment_fonts = `Web fonts used: ${families.join(", ")}. The configurator only loaded them for its preview; this project must load them itself.`;
    } else {
      delete output._comment_fonts;
    }
    const blob = new Blob([JSON.stringify(output, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = el("a", { href: url, download: "design-tokens.json" });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function copyLink() {
    const url = `${location.href.split("#")[0]}${HASH_PREFIX}${encodeDraft(draft)}`;
    try {
      await navigator.clipboard.writeText(url);
      dom.copyLink.dataset.state = "copied";
      setTimeout(() => delete dom.copyLink.dataset.state, 2000);
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
    for (const name of ["type", "space", "palette", "fonts", "shape", "layout", "defaults"]) dom.section(name).replaceChildren();
    buildType();
    buildSpace();
    buildPalette();
    buildFonts();
    buildShape();
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

    document.getElementById("export").addEventListener("click", exportDraft);
    document.getElementById("reset").addEventListener("click", reset);
    dom.copyLink.addEventListener("click", copyLink);

    document.querySelector('[data-open-dialog="import-dialog"]').addEventListener("click", () => dom.importDialog.showModal());
    dom.importDialog.querySelector("[data-close-dialog]").addEventListener("click", () => dom.importDialog.close());
    dom.importDialog.addEventListener("click", (event) => {
      if (event.target !== dom.importDialog) return;
      const rect = dom.importDialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dom.importDialog.close();
    });

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
