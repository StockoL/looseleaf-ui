# LooseLeaf UI Component Library

[![GitHub license](https://img.shields.io/github/license/LooseLeafApplications/looseleaf-ui?color=blue)](https://github.com/LooseLeafApplications/looseleaf-ui/blob/main/LICENSE)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/LooseLeafApplications/looseleaf-ui?color=success)](https://github.com/LooseLeafApplications/looseleaf-ui)

LooseLeaf UI is a lightweight, dependency-free, architecture-first CSS design system template built on the CUBE CSS Methodology (Composition, Utility, Block, Exception).

By decoupling intrinsic macro-layouts from visual block aesthetics and storing design parameters in a platform-agnostic JSON engine, LooseLeaf UI allows lean engineering teams to compose resilient, highly accessible, and performance-first user interfaces with zero framework overhead.

---

## 📋 Table of Contents

1. [📐 Planning & Pre-Production Workflow](#planning)
2. [📖 The CUBE CSS Architectural Paradigm](#architecture)
3. [⚙️ The Token Engine & Workflow](#token-engine)
4. [📂 Directory & Layer Structure](#directory)
5. [🧩 Tier Breakdown & Implementation Guide](#tiers)
   - [Tier 1: Global Layer & Reset](#tier-1)
   - [Tier 2: Composition Primitives](#tier-2)
   - [Tier 3: Pure Visual Blocks](#tier-3)
   - [Tier 4: Single-Purpose Utilities](#tier-4)
6. [⚡ Native Interactivity Engine (behaviors.js)](#behaviors)
7. [🤝 Authors & Acknowledgements](#authors)

---

## 1. <a name="planning"></a> 📐 Planning & Pre-Production Workflow

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

Inject micro-interactions, hardware-accelerated transitions (`.anim-lift`), ambient canvas keyframes (`.bg-mesh`), and fine-tuned hover physics on top of the established layout.

---

## 2. <a name="architecture"></a> 📖 The CUBE CSS Architectural Paradigm

Traditional frameworks couple layout positioning directly with component styling, forcing developers to write non-DRY utility strings or override margins constantly. LooseLeaf UI enforces strict CUBE CSS boundaries:

C - COMPOSITION (Macro Layout & Spatial Flow)
U - UTILITY (Single-Purpose Overrides)
B - BLOCK (Pure Self-Contained Aesthetics)
E - EXCEPTION (State Toggles via data-\* attributes)

- Composition (C): Manages structural positioning and intrinsic space (e.g., `.flow`, `.sidebar`, `.grid`). Compositions never contain background colours, borders, or typography styles.
- Utility (U): Single-purpose classes that apply specific properties cleanly (e.g., `.visually-hidden`, `.text-center`).
- Block (B): Pure, portable visual components (e.g., `.button`, `.card`, `.input`). Blocks care only about their internal aesthetics (padding, border, background). They have zero external margins or fixed width/height constraints.
- Exception (E): State-based overrides driven by HTML attributes ([data-state="open"], [data-status="danger"]) that update local block parameters dynamically.

---

## 3. <a name="token-engine"></a> ⚙️ The Token Engine & Workflow

To maintain a true Single Source of Truth across the entire tech stack (including front-end stylesheets and back-end templates such as Python/Django), design decisions are extracted out of the CSS and stored in a platform-agnostic JSON document.

### 1. Source Tokens (design-tokens.json)

`design-tokens.json` stores the *inputs* to the design, not hand-copied outputs:

- `$utopia` holds the [Utopia](https://utopia.fyi/) settings (viewports, base sizes, ratios, space multipliers). The fluid `--step-*` type scale and `--space-*` scale are derived from them at build time.
- `$palette` holds OKLCH hues and chromas. The `--neutral-*` ramp, the `--action-*` and `--accent-*` steps and every status colour (light and dark) are derived from it.
- Everything else is a semantic token named by purpose, and these are the only tokens blocks use. Colour roles carry a light and a dark value, and `{group.key}` references another token.

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

### 2. The Compiler (scripts/build-tokens.js)

A zero-dependency Node.js wrapper around `scripts/tokens-core.mjs`, a pure compiler shared with the browser. It writes:

- `src/01-global/variables.css`: light values on `:root`, dark values for `prefers-color-scheme: dark`, and a `[data-theme="dark"]` override
- `dist/tokens.resolved.json`: every token fully resolved, for back-end use
- [docs/TOKENS.md](docs/TOKENS.md): the generated reference of every token, its tier and its light and dark value, plus a WCAG contrast table

### 3. Execution Workflow

Run the compilation script whenever design parameters change:

```bash
npm run build:tokens
```

---

## 4. <a name="directory"></a> 📂 Directory & Layer Structure

The repository maintains a strict boundary between Build Tooling Engine (root directory) and Source Code Assets (src/).

```text
looseleaf-ui/
├── design-tokens.json <-- Single Source of Truth (JSON Tokens)
├── scripts/build-tokens.js <-- Compiler Engine (Vanilla Node.js)
├── package.json <-- Project Manifest & Build Commands
│
└── src/
 ├── index.css <-- Orchestrator & Native @layer Definitions
│
├── 01-global/ <-- Resets, Tokens, and Core Typography
│ ├── reset.css
│ ├── variables.css <-- Auto-Generated (Do not edit directly!)
│ └── global-styles.css
│
├── 02-compositions/ <-- Intrinsic Layout Primitives
│ ├── wrapper.css
│ ├── center.css
│ ├── flow.css
│ ├── cluster.css
│ ├── sidebar.css
│ ├── grid.css
│ ├── reel.css
│ └── switcher.css
│
├── 03-blocks/ <-- Pure Visual Components
│ ├── button.css
│ ├── input.css
│ ├── badge.css
│ ├── accordion.css
│ ├── dropdown.css
│ ├── card.css
│ ├── navbar.css
│ ├── modal.css
│ ├── alert.css
│ └── bento.css
│
├── 04-utilities/ <-- Heavy-Lifting Overrides
│ ├── accessibility.css
│ ├── indent.css
│ ├── text.css
│ ├── colors.css
│ └── animations.css
│
└── scripts/
└── behaviors.js <-- DOM Event Delegation Engine
```

---

## 5. <a name="tiers"></a> 🧩 Tier Breakdown & Implementation Guide

### Tier 1: Global Layer & Reset (src/01-global/)

Leverages a modern, battle-tested CSS reset that:

- Enforces global border-box sizing.
- Applies `text-wrap: balance` across headings to prevent widows.
- Applies `scroll-margin-block: 5ex` to anchor targets to prevent sticky header collisions.
- Enforces strict prefers-reduced-motion safety overrides globally.

### Tier 2: Composition Primitives (src/02-compositions/)

Layout compositions govern spacing and alignment without injecting aesthetic styling.

#### The Wrapper (.wrapper) vs. The Center (.center)

Both cap a width and center it, but they are not interchangeable. `.wrapper` is the macro, page-section shell — apply it once per full-bleed section to align content to a wide, site-level edge margin (`--wrapper-max`, default `80rem`), padding included in the cap. `.center` is a content primitive — apply it to prose or hero copy that must cap at the narrower typographic reading measure (`--measure`, default `60ch`), using `box-sizing: content-box` so its gutter padding never eats into that measure, plus `[data-and-text]`/`[data-intrinsic]` exceptions for centering its own children. See [docs/COMPOSITIONS.md](docs/COMPOSITIONS.md#golden-rules) for the full breakdown and nesting pattern.

#### The Flow (.flow)

Manages intrinsic vertical rhythm between direct sibling elements using the lobotomised owl selector `(* + *)`. Does not use Flexbox, preserving native block formatting contexts and margin collapsing.

CSS Rule:

```CSS
.flow > * + * {
  margin-block-start: var(--flow-space, 1em);
}
```

#### The Sidebar (.sidebar)

Creates an asymmetric 2-column layout where a sidebar holds a target width (`--sidebar-target-width`) and the main content fills the remaining space, stacking vertically when constraints are met.

HTML Structure:

```HTML
<div class="sidebar">
  <div>Sidebar Content (Fixed Target)</div>
  <div>Main Content (Fluid Fill)</div>
</div>
```

#### The Switcher (.switcher)

Switches a row of elements instantly into a vertical stack when container width drops below a specific threshold (`--switcher-threshold`).

### Tier 3: Pure Visual Blocks (src/03-blocks/)

Blocks care only about internal styling. They are purged of external positioning or margins.

#### The Button (.button)

Uses local CSS variables to keep structural code completely DRY. State variations are handled by CUBE Exception data attributes:

HTML Structure:

```HTML
<!-- Default Variant -->
<button class="button">Secondary Action</button>

<!-- Primary Action Variant (Exception Hook) -->
<button class="button" data-variant="primary">Primary Action</button>
```

#### The Card (.card)

Acts strictly as a visual boundary with `overflow: hidden`. Child media automatically clips to the container border radius without complex negative-margin mathematics.

HTML Structure:

```HTML
<article class="card">
  <img src="thumbnail.jpg" alt="Media thumbnail" />
  <div class="card__body flow">
    <h3>Card Title</h3>
    <p>Card description governed by vertical flow.</p>
  </div>
</article>
```

### Tier 4: Single-Purpose Utilities (src/04-utilities/)

Utilities override specific styles and sit at the top of the @layer hierarchy.

- .visually-hidden: Screen-reader accessible visual hiding.
- .anim-lift: Hardware-accelerated hover elevation.
- .indent: Decorative edge accent border driven by local CSS variables.

---

## 6. <a name="behaviors"></a> ⚡ Native Interactivity Engine (src/scripts/behaviors.js)

LooseLeaf UI ships with a zero-dependency, event-delegated JavaScript runtime (~200 lines of plain ES6). Instead of attaching listeners to individual DOM nodes, a single listener processes user actions across the document root.

### Supported Interactive Patterns:

1. Accordions: none needed. `.accordion` is built on native `<details name="…">`, so toggling and exclusive groups work without JavaScript.
2. Dropdown Menus: Toggles dropdown visibility and handles automatic dismissals when clicking outside the menu container.
3. Mobile Navigation: Controls navbar drawer states and mobile hamburger toggles.
4. Native Modals & Drawers: Triggers native HTML5 `<dialog>` methods (`.showModal()`, `.close()`) and intercepts backdrop clicks automatically.
5. Alert Dismissals: Applies `data-state="removing"` to execute smooth fade transitions before removing elements from the DOM tree.
6. Accessibility Handlers: Global Escape key listener closes active overlays; smooth scroll helper respects system prefers-reduced-motion settings.

---

## 8. <a name="comeau"></a> Josh W Comeau favourites

### The Magical 3D Button

```css
.pushable {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  outline-offset: 4px;
  transition: filter 250ms;
}
.shadow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: hsl(0deg 0% 0% / 0.25);
  will-change: transform;
  transform: translateY(2px);
  transition: transform 600ms cubic-bezier(0.3, 0.7, 0.4, 1);
}
.edge {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: linear-gradient(
    to left,
    hsl(340deg 100% 16%) 0%,
    hsl(340deg 100% 32%) 8%,
    hsl(340deg 100% 32%) 92%,
    hsl(340deg 100% 16%) 100%
  );
}
.front {
  display: block;
  position: relative;
  padding: 12px 42px;
  border-radius: 12px;
  font-size: 1.25rem;
  color: white;
  background: hsl(345deg 100% 47%);
  will-change: transform;
  transform: translateY(-4px);
  transition: transform 600ms cubic-bezier(0.3, 0.7, 0.4, 1);
}
.pushable:hover {
  filter: brightness(110%);
}
.pushable:hover .front {
  transform: translateY(-6px);
  transition: transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5);
}
.pushable:active .front {
  transform: translateY(-2px);
  transition: transform 34ms;
}
.pushable:hover .shadow {
  transform: translateY(4px);
  transition: transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5);
}
.pushable:active .shadow {
  transform: translateY(1px);
  transition: transform 34ms;
}
.pushable:focus:not(:focus-visible) {
  outline: none;
}
```

```html
<button class="pushable">
  <span class="shadow"></span>
  <span class="edge"></span>
  <span class="front"> Push me </span>
</button>
```

## 7. <a name="authors"></a> 🤝 Authors & Acknowledgements

LooseLeaf UI is conceptualized and maintained by Louis Mannix (@StockoL) under the LooseLeaf Applications organisation.

### Inspirations & Methodologies:

- Andy Bell & Piccalilli: CUBE CSS Methodology, the Complete CSS course, and modern reset paradigms.
- Heydon Pickering: Every Layout intrinsic layout primitives and lobotomized owl selectors.
- Utopia.fyi: Fluid typography and space scale mathematical principles.
  Josh Comeau: Whimsical Animations course content and blog posts.

Designed for maintainability. Built for the fluid web.
