# LooseLeaf UI Component Library

[![GitHub license](https://img.shields.io/github/license/StockoL/looseleaf-ui?color=blue)](https://github.com/StockoL/looseleaf-ui/blob/main/LICENSE)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/StockoL/looseleaf-ui?color=success)](https://github.com/StockoL/looseleaf-ui)

LooseLeaf UI is a lightweight, dependency-free, architecture-first CSS design system template built on the CUBE CSS Methodology (Composition, Utility, Block, Exception).

By decoupling intrinsic macro-layouts from visual block aesthetics and storing design parameters in a platform-agnostic JSON engine, LooseLeaf UI allows lean engineering teams to compose resilient, highly accessible, and performance-first user interfaces with zero framework overhead.

---

## 📋 Table of Contents

1. [🚀 Quick Start](#quick-start)
2. [📐 Planning & Pre-Production Workflow](#planning)
3. [📖 The CUBE CSS Architectural Paradigm](#architecture)
4. [⚙️ The Token Engine & Workflow](#token-engine)
5. [📂 Directory & Layer Structure](#directory)
6. [🧩 Tier Breakdown & Implementation Guide](#tiers)
   - [Tier 1: Global Layer & Reset](#tier-1)
   - [Tier 2: Compositions](#compositions)
   - [Tier 3: Blocks](#blocks)
   - [Tier 4: Utilities](#utilities)
7. [⚡ Behaviours & Theme Scripts](#behaviors)
8. [🛠️ Commands](#commands)
9. [🏷️ Versioning & Releases](#versioning)
10. [🤝 Authors & Acknowledgements](#authors)

---

## 1. <a name="quick-start"></a> 🚀 Quick Start

### Plain HTML

Load the release files from jsDelivr, always pinned to a tag (never `@main`), and add your theme's tokens after the stylesheet:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="light dark" />

<!-- Blocking on purpose: applies the stored light/dark choice before first paint -->
<script src="https://cdn.jsdelivr.net/gh/StockoL/looseleaf-ui@v2.0.0/dist/theme.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/StockoL/looseleaf-ui@v2.0.0/dist/looseleaf.css" />
<link rel="stylesheet" href="/css/looseleaf-tokens.css" /> <!-- your theme (optional) -->
<script src="https://cdn.jsdelivr.net/gh/StockoL/looseleaf-ui@v2.0.0/dist/looseleaf.js" defer></script>
```

The same files are attached to every [GitHub release](https://github.com/StockoL/looseleaf-ui/releases) if you'd rather host them yourself. Without a theme you get the default tokens; see [Theming](#theming) to make your own.

Then compose with the classes below. [examples/index.html](examples/index.html) is the living documentation: one section per composition and block, built with nothing but the shipped files.

Baseline browsers are Chrome 117+, Safari 17.4+ and Firefox 129+, so cascade layers, container queries, `:has()`, `color-mix()` and `@starting-style` are used freely. On Apple devices that means **iOS and iPadOS 17.4 or later**; iOS 16 and earlier are not supported (exclusive `<details name>` accordions need Safari 17.2, and dialog and drawer animations need 17.4).

### Django

Django projects use the `django-looseleaf` package in [packages/django-looseleaf/](packages/django-looseleaf/README.md). One `INSTALLED_APPS` entry ships the CSS and JS, template tags for the head and the theme, and a form renderer that outputs LooseLeaf markup from `{{ form }}`. A theme bundle drops into `static/` and is switched on with one setting, `LOOSELEAF_THEME`. See its README for setup.

### <a name="theming"></a> Theming

Every project gets its own colours, type scale, spacing, fonts and shapes without touching this repository or running a build:

1. Open the hosted [token configurator](https://stockol.github.io/looseleaf-ui/) and adjust the tokens against a live preview of every block, in light and dark, at any viewport width. A live contrast table flags any text that drops below WCAG AA.
2. Choose **Export → Theme bundle** to download `looseleaf-theme.zip`: the compiled `looseleaf-tokens.css`, `tokens.resolved.json`, and your `design-tokens.json` for re-importing later.
3. Load `looseleaf-tokens.css` after `looseleaf.css` (plain HTML), or unzip the bundle into `static/theme/` and set `LOOSELEAF_THEME = "theme"` (Django).

The theme's tokens live in the same cascade layer as the defaults, so loading them second is the whole mechanism.

---

## 2. <a name="planning"></a> 📐 Planning & Pre-Production Workflow

A primary tenet of the LooseLeaf philosophy—derived from Andy Bell’s Complete CSS milestones—is that writing CSS code is the final step, not the first. Jumping directly into an IDE to write styles without pre-production planning leads to specificity battles, arbitrary media queries, and high technical debt.

LooseLeaf UI mandates a strict four-phase pre-production engineering lifecycle:

1. Sketch-Up (Planning) -> 2. Core Build (HTML-First) -> 3. Architectural (CUBE Layering) -> 4. Flair & Polish (Animations)

### Phase 1: Sketch-Up (Away from the IDE)

Before opening an editor, analyse the UI mockup or wireframe and complete the following non-coding steps:

1. Identify Macro-Compositions: Draw boxes around content groupings to identify structural primitives (`.sidebar`, `.grid`, `.switcher`, `.cluster`, `.flow`).
2. Define Data Tracks & Limits: Establish max-inline-size boundaries (`--measure`) and identify intrinsic container wrapping points.
3. Isolate Visual Blocks: Mark repeating, self-contained visual components (`.card`, `.button`, `.badge`, `.accordion`).
4. Log the "Icebox": If a requested feature or complex aesthetic lacks clarity or breaks layout predictability, log it into an Icebox Backlog to protect production velocity.

### Phase 2: Core Build (Accessibility & HTML Structure)

Build the layout using raw, semantic HTML tags (`<main>, <nav>, <article>, <dialog>, <button>`). Ensure all ARIA attributes (`aria-expanded`, `aria-controls`, `aria-invalid`) and keyboard navigation routes function perfectly before applying visual styling.

### Phase 3: Architectural Layering (CUBE CSS)

Apply layout compositions and visual blocks using standard class names and CSS Custom Properties. Keep specificity flat by leveraging CSS Cascade Layers (`@layer`).

### Phase 4: Flair Pass

Inject micro-interactions, hardware-accelerated transitions (`.anim-lift`), ambient backgrounds (`.bg-mesh`), and fine-tuned hover physics on top of the established layout.

---

## 3. <a name="architecture"></a> 📖 The CUBE CSS Architectural Paradigm

Traditional frameworks couple layout positioning directly with component styling, forcing developers to write non-DRY utility strings or override margins constantly. LooseLeaf UI enforces strict CUBE CSS boundaries:

C - COMPOSITION (Macro Layout & Spatial Flow)
U - UTILITY (Single-Purpose Overrides)
B - BLOCK (Pure Self-Contained Aesthetics)
E - EXCEPTION (State Toggles via data-\* attributes)

- Composition (C): Manages structural positioning and intrinsic space (e.g., `.flow`, `.sidebar`, `.grid`). Compositions never contain background colours, borders, or typography styles.
- Utility (U): Single-purpose classes that apply specific properties cleanly (e.g., `.visually-hidden`, `.text-center`).
- Block (B): Pure, portable visual components (e.g., `.button`, `.card`, `.input`). Blocks care only about their internal aesthetics (padding, border, background). They have zero external margins or fixed width/height constraints.
- Exception (E): State-based overrides driven by HTML attributes ([data-state="open"], [data-status="danger"]) that update local block parameters dynamically.

Layout responds to the space a component actually has, not the viewport: compositions are intrinsic, and the few size switches (navbar collapse, bento spans, sticky sidebar) are `@container` queries at the one documented breakpoint, `45rem`.

---

## 4. <a name="token-engine"></a> ⚙️ The Token Engine & Workflow

To maintain a true Single Source of Truth across the entire tech stack (including front-end stylesheets and back-end templates such as Python/Django), design decisions are extracted out of the CSS and stored in a platform-agnostic JSON document.

### Three tiers

1. **Raw** tokens are the palette and scales (`--neutral-*`, `--action-*`, `--step-*`, `--space-*`). They are derived from inputs and never used for colour or type by blocks.
2. **Semantic** tokens are named by purpose (`--color-surface-raised`, `--color-action`, `--gutter`, `--inset-control`, `--text-body`, `--radius-control`, `--duration-quick`, `--layer-nav`). Blocks and compositions use these, and dark mode re-points them.
3. **Component** variables live inside each block with a semantic default (`--button-bg`, `--card-padding`, `--dropdown-width`), and exceptions reassign them.

### 1. Source Tokens (design-tokens.json)

`design-tokens.json` stores the *inputs* to the design, not hand-copied outputs:

- `$utopia` holds the [Utopia](https://utopia.fyi/) settings (viewports, base sizes, ratios, space multipliers). The fluid `--step-*` type scale and `--space-*` scale are derived from them at build time.
- `$palette` holds OKLCH hues and chromas. The `--neutral-*` ramp, the `--action-*` and `--accent-*` steps and every status colour (light and dark) are derived from it.
- Everything else is a semantic token named by purpose. Colour roles carry a light and a dark value, and `{group.key}` references another token.

```json
{
  "$palette": { "action": { "hue": 255, "chroma": 0.2 } },
  "color": {
    "surface": { "light": "{neutral.0}", "dark": "{neutral.950}" },
    "action": "{action.500}"
  },
  "gutter": { "$value": "{space.s}", "$purpose": "Default gap inside compositions." }
}
```

To change a derived value, change its input. An explicit value inside a derived group (for example `"neutral": { "500": "#71717a" }`) wins and is flagged as overridden.

### 2. The Configurator (tools/configure.html)

Use it [hosted on GitHub Pages](https://stockol.github.io/looseleaf-ui/), or open `tools/configure.html` by double-clicking it (no server needed). It previews the real demo page in a resizable frame while you adjust the Utopia scales, palette hues, fonts, radii, motion and default styles, and shows a live WCAG contrast table for both schemes. **Export** offers a theme bundle for projects (see [Theming](#theming)), the `design-tokens.json` source, or the compiled tokens CSS on the clipboard. To change this repository's defaults, save the source over `design-tokens.json` and run `npm run build`. The preview uses the same compiler as the build, so what you see is exactly what you get.

### 3. The Compiler (scripts/build-tokens.js)

A zero-dependency Node.js wrapper around `scripts/tokens-core.mjs`, a pure compiler shared with the configurator. It writes:

- `src/01-global/variables.css`: light values on `:root`, dark values for `prefers-color-scheme: dark`, and a `[data-theme="dark"]` override
- `dist/tokens.resolved.json`: every token fully resolved, for back-end use
- [docs/TOKENS.md](docs/TOKENS.md): the generated reference of every token, its tier and its light and dark value, plus a WCAG contrast table

---

## 5. <a name="directory"></a> 📂 Directory & Layer Structure

```text
looseleaf-ui/
├── design-tokens.json         <-- Single source of truth (token inputs)
├── package.json               <-- Manifest and build commands
├── scripts/
│   ├── tokens-core.mjs        <-- Pure token compiler (shared with the configurator)
│   ├── utopia.mjs             <-- Pure fluid type and space maths
│   ├── color.mjs              <-- Pure OKLCH and WCAG contrast maths
│   ├── zip.mjs                <-- Pure store-only ZIP writer (theme bundles)
│   ├── build-tokens.js        <-- Writes variables.css, tokens.resolved.json, TOKENS.md
│   ├── build-tools.js         <-- Bundles the pure modules for the configurator
│   ├── build-css.js           <-- Bundles src/index.css, copies the scripts to dist/
│   ├── build-django.js        <-- Syncs dist/ into the Django package
│   ├── check.js               <-- Guardrail linter (npm run check)
│   └── bump-version.js        <-- Lockstep version for npm and Python (npm run bump)
├── src/
│   ├── index.css              <-- Orchestrator and @layer order
│   ├── 01-global/             <-- reset, variables (generated), global-styles
│   ├── 02-compositions/       <-- wrapper, region, center, flow, cluster, sidebar,
│   │                              grid, reel, switcher, frame, bento
│   ├── 03-blocks/             <-- skip-link, button, field, input, select, textarea,
│   │                              choice, input-group, badge, accordion, dropdown, card,
│   │                              navbar, modal, offcanvas, alert, table, prose,
│   │                              pagination, breadcrumb, marquee, bg-mesh, swatch
│   ├── 04-utilities/          <-- accessibility, icon, indent, text, colors, animations
│   └── scripts/               <-- behaviors.js, theme.js
├── dist/                      <-- looseleaf.css, looseleaf.js, theme.js, tokens.resolved.json
├── examples/index.html        <-- Living demo (also the configurator's preview)
├── tools/                     <-- configure.html, configure.js, configure.css, tokens-lib.js
├── index.html                 <-- GitHub Pages entry: redirects to the configurator
├── .github/workflows/         <-- ci.yml, release.yml, pages.yml
├── docs/
│   ├── COMPOSITIONS.md        <-- Composition case studies and block guidelines
│   └── TOKENS.md              <-- Generated token reference
└── packages/django-looseleaf/ <-- Django package
```

The cascade layers run lowest to highest: `reset`, `global`, `compositions`, `blocks`, `utilities`.

---

## 6. <a name="tiers"></a> 🧩 Tier Breakdown & Implementation Guide

### <a name="tier-1"></a> Tier 1: Global Layer & Reset (src/01-global/)

- Andy Bell's "A (more) Modern CSS Reset", plus a global reduced-motion switch.
- Body type, colour and surface from semantic tokens; headings mapped to `--heading-1` … `--heading-4` with balanced wrapping.
- One focus style for everything: a 2px `--color-focus` ring on `:focus-visible`. No block removes it.
- Unstyled links use `--color-link` and the configurable underline (`--link-decoration`).
- The reading measure (`--measure`) caps running text inside `.flow` and `.prose` only.
- Touch and mobile safeguards: `--target-min` (44px) for interactive controls, `dvh` instead of `vh`, and safe-area insets (`--safe-top` and friends).

### <a name="compositions"></a> Tier 2: Compositions (src/02-compositions/)

Compositions govern spacing and alignment without injecting aesthetic styling. Tune them inline with custom properties, e.g. `style="--switcher-threshold: 40rem"`. [docs/COMPOSITIONS.md](docs/COMPOSITIONS.md) walks through real layouts built from them.

| Class | Purpose | Custom properties and exceptions |
| --- | --- | --- |
| `.wrapper` | Page-section shell: caps a site-wide width and centres it | `--wrapper-max-width`, `--wrapper-gutters` |
| `.region` | Vertical breathing room for a page section | `--region-padding`, `[data-size="small"]`, `[data-size="large"]` |
| `.center` | Caps content to the reading measure and centres it | `--center-max-width`, `--center-gutters`, `[data-and-text]`, `[data-intrinsic]` |
| `.flow` | Vertical rhythm between siblings | `--flow-space` |
| `.cluster` | Wrapping horizontal group | `--cluster-space`, `--cluster-justify`, `--cluster-align` |
| `.sidebar` | Target-width panel beside fluid content, stacking when space runs out | `--sidebar-target-width`, `--sidebar-content-min-width`, `--sidebar-space`, `--sidebar-align`, `[data-side="right"]`, `[data-sticky]` (with `--sticky-offset`) |
| `.switcher` | Row that becomes a stack below a threshold | `--switcher-threshold` |
| `.grid` | Auto-filling intrinsic grid | `--grid-min-item-size`, `--grid-placement` |
| `.reel` | Horizontal scroll-snap strip | gap from `--gutter` |
| `.frame` | Crops media to an aspect ratio | `--frame-ratio` |
| `.bento` | Dense intrinsic grid with spanning items | `--bento-min`, `--bento-row-min`, `--bento-space`; items take `[data-span]` and `[data-row-span]` |

**Wrapper vs. Center.** Both cap a width and centre it, but they are not interchangeable. `.wrapper` is the macro, page-section shell — apply it once per full-bleed section to align content to a wide, site-level edge margin (`--wrapper-max`, default `80rem`), padding included in the cap. `.center` is a content primitive — apply it to prose or hero copy that must cap at the narrower typographic reading measure (`--measure`, default `60ch`), using `box-sizing: content-box` so its gutter padding never eats into that measure. See [docs/COMPOSITIONS.md](docs/COMPOSITIONS.md#golden-rules) for the nesting pattern.

### <a name="blocks"></a> Tier 3: Blocks (src/03-blocks/)

Blocks care only about internal styling and are purged of external margins. Variants and states are exceptions on data or ARIA attributes, which only reassign the block's own variables.

| Class | Purpose | Exceptions | JS hook |
| --- | --- | --- | --- |
| `.skip-link` | First focusable link, revealed on focus | — | — |
| `.button` | Actions | `data-variant`: primary, secondary, ghost, danger; `data-size`: small, large; `[data-icon-only]`; `:disabled` and `[aria-disabled="true"]`; `data-state`: loading, copied | `[data-copy]` sets the copied state |
| `.field` | Label, control, `.field__hint` and `.field__error`; `.field__controls` sets a control beside its companion; `.fieldset` and `.legend` group choices | `[data-status="danger"]` | — |
| `.input` | Text-like inputs and range sliders (shares a base with select and textarea) | `[aria-invalid="true"]`, `:disabled` | — |
| `.select` | Native select with a theme-aware chevron | `[aria-invalid="true"]`, `[multiple]` | — |
| `.textarea` | Multi-line input, vertical resize only | `[aria-invalid="true"]` | — |
| `.choice` | Checkbox or radio with its label (`.choice__input`); `.choice-group` stacks them | `.choice-group[data-variant="segmented"]` | — |
| `.input-group` | Input joined to `.input-group__addon` or a button | — | — |
| `.badge` | Status labels | `data-status`: info, success, warning, danger; `[data-placement="floating"]` | — |
| `.accordion` | Disclosure list on native `<details>` (`.accordion__item`, `.accordion__trigger`, `.accordion__content`, `.accordion__icon`) | `[open]`; a shared `name` makes an exclusive group | none needed |
| `.dropdown` | Menu inside `.dropdown-wrapper` (`.dropdown__item`, `.dropdown__divider`) | `[data-state="open"]` on the wrapper; `[data-align="end"]` | `[data-toggle="dropdown"]` |
| `.card` | Surface; `.card__body` carries the padding, direct media sits flush | `--card-padding`, `--card-media-ratio`; a floating badge is never clipped | — |
| `.navbar` | Site header (`.navbar__brand`, `.navbar__menu`, `.navbar__link`, `.navbar__toggle`); collapses below 45rem of its own width | `[data-sticky]`; `[data-state="open"]` on the menu | `.navbar__toggle` |
| `.modal` | Native `<dialog>`, animated in and out | `[open]` | `[data-open-dialog]`, `[data-close-dialog]` |
| `.offcanvas` | Drawer on native `<dialog>` | `[data-position="left"]` | `[data-open-dialog]`, `[data-close-dialog]` |
| `.alert` | Inline messages with an optional `.alert__close` | `data-status`: info, success, warning, danger; `[data-state="removing"]` | `.alert__close` |
| `.table` | Data tables inside a scrolling `.table-wrapper` | `[data-striped]`, `[data-hover]`, `[data-density="compact"]`; cells take `[data-align="end"]` | — |
| `.prose` | Rich text you don't control (CMS, Markdown) | — | — |
| `.pagination` | Page links (`.pagination__list`, `.pagination__link`, `.pagination__gap`) | `[aria-current="page"]`, `[aria-disabled="true"]` | — |
| `.breadcrumb` | Location trail (`.breadcrumb__list`, `.breadcrumb__item`) | `[aria-current="page"]` | — |
| `.marquee` | Looping strip of `.marquee__track` rows | `--marquee-duration`, `--marquee-gap` | — |
| `.bg-mesh` | Ambient drifting wash of the action and accent hues | `--mesh-duration`, `--mesh-strength` | — |
| `.swatch` | Colour tile with `.swatch__tile`, `.swatch__label`, `.swatch__hex` | `--swatch-color`, `[data-state="overridden"]` | — |

### <a name="utilities"></a> Tier 4: Utilities (src/04-utilities/)

Utilities sit at the top of the layer stack and do one thing each.

- `.visually-hidden`: hidden visually but still announced; reveals itself when focused. A `[hidden]` rule restores `display: none` on blocks that set their own display.
- `.icon`: sizes an inline SVG to the text and strokes it in `currentColor`; `[data-size="s"]` and `[data-size="l"]`. No icon library ships: paste paths or keep a `<symbol>` sheet.
- `.text-center`, `.text-uppercase`, `.truncate`, `.text-small`, `.text-lead`
- `.text-primary`, `.text-muted`, `.text-danger`, `.bg-surface-base`, `.bg-surface-sunken`, `.bg-primary`, `.bg-gradient`
- `.indent`: decorative edge accent (`--indent-size`, `--indent-color`)
- `.anim-lift`: hover elevation on pointer devices

---

## 7. <a name="behaviors"></a> ⚡ Behaviours & Theme Scripts

### dist/looseleaf.js (src/scripts/behaviors.js)

A zero-dependency drop-in script using event delegation: one click, one keydown and one focusout listener on the document. It exports nothing, works as a classic or module script, and is safe to include twice.

1. Accordions: none needed. `.accordion` is built on native `<details name="…">`.
2. Dropdowns: toggle on click; ArrowDown/ArrowUp on the trigger open at the first or last item; arrows, Home and End move through items; Escape closes and returns focus; leaving the menu closes it. Triggers get `aria-controls` and `aria-expanded` wired automatically.
3. Navbar: the toggle opens and closes the collapsed menu (Escape closes it too), with `aria-controls` wired.
4. Modals and drawers: `[data-open-dialog]` and `[data-close-dialog]` drive native `<dialog>`; a backdrop click closes it.
5. Alerts: `.alert__close` animates the alert out, then removes it.
6. Copy: `[data-copy]` copies its value, swaps the button label and announces the result through a polite live region.
7. In-page links: scroll motion-safely, move focus to the target (adding `tabindex="-1"` where needed), and close the dialog or menu they were clicked from.

### dist/theme.js (src/scripts/theme.js)

Load it as a blocking script in `<head>` (or inline it) so the saved choice is applied before first paint. Any `[data-theme-toggle]` button cycles auto → light → dark, stores the choice and updates its `[data-theme-label]` text and ARIA state. "Auto" follows the operating system.

```html
<button class="button" type="button" data-variant="ghost" data-theme-toggle>
  Theme: <span data-theme-label>Auto</span>
</button>
```

---

## 8. <a name="commands"></a> 🛠️ Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Tokens, configurator library, CSS and scripts, Django sync, then `check` |
| `npm run build:tokens` | Compile `design-tokens.json` |
| `npm run build:css` | Bundle `src/index.css` and copy the scripts into `dist/` |
| `npm run check` | Guardrail linter: no raw colours, radii, shadows, z-indices or durations outside tokens; no `outline: none` or `!important`; no viewport media queries; hover only on hover devices; every documented token and class must exist |
| `npm test` | Unit tests for the token maths, compiler and ZIP writer |
| `npm run bump -- <version>` | Set the version everywhere it lives, then rebuild (see [Versioning](#versioning)) |

---

## 9. <a name="versioning"></a> 🏷️ Versioning & Releases

The npm package and `django-looseleaf` share one version and follow [semantic versioning](https://semver.org/):

- **Major**: a token is renamed or removed, or a block's class or attribute contract changes.
- **Minor**: new tokens, blocks, compositions or exceptions.
- **Patch**: visual refinements within the existing tokens, and fixes.

Theme bundles record the version they were exported from (`$version` in both JSON files). What that means across releases:

- **Same major (2.0 → 2.4):** the theme keeps working. Tokens added after it was exported fall back to their defaults until you re-export.
- **New major (2.x → 3.0):** token names may have changed, and a renamed token in an old `looseleaf-tokens.css` simply stops applying, so the new default shows through in that spot. `django-looseleaf` warns about this (`looseleaf.W004`); plain-HTML sites get no warning, so keep the CDN version and the theme's major in step. To move a theme forward, import its `design-tokens.json` into the configurator for the new version and export the bundle again.

To release: `npm run bump -- 2.1.0` writes the version to `package.json`, `pyproject.toml` and `django_looseleaf.__version__` and rebuilds; move the Unreleased notes in [CHANGELOG.md](CHANGELOG.md) under `## [2.1.0] - <date>`; commit, then push the tag `v2.1.0`. The release workflow refuses a tag that doesn't match all three versions or has no changelog entry, reruns CI, creates the GitHub release with the changelog section as its notes and the built files attached, and publishes `django-looseleaf` to PyPI with trusted publishing.

---

## 10. <a name="authors"></a> 🤝 Authors & Acknowledgements

LooseLeaf UI is conceptualised and maintained by Louis Stockton (@StockoL) under the LooseLeaf Applications organisation.

### Inspirations & Methodologies:

- Andy Bell & Piccalilli: CUBE CSS Methodology, the Complete CSS course, and modern reset paradigms.
- Heydon Pickering: Every Layout intrinsic layout primitives and lobotomised owl selectors.
- Utopia.fyi: Fluid typography and space scale mathematical principles.
- Björn Ottosson: the OKLab and OKLCH colour spaces behind the palette.
- Josh Comeau: Whimsical Animations course content and blog posts.

Designed for maintainability. Built for the fluid web.
