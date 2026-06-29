# LooseLeaf UI Component Library

To empower lean, agile engineering teams to compose intrinsically responsive, performance-first user interfaces instantly. By utilising composable layout primitives that respect typographic boundaries (capped at `60ch`), LooseLeaf UI eliminates manual layout overrides and minimises ongoing maintenance overhead for small development footprints.

---

## 📋 Table of Contents

1. [📖 Project Philosophy & Principles](#philosophy)
2. [📦 Installation & Integration](#installation)
3. [🗺️ Tier 1: Core Axioms & Harmonics](#tier-1)
4. [🧩 Tier 2: Layout Primitives](#tier-2)
5. [✨ Tier 3: Functional Atoms](#tier-3)
6. [🏗️ Tier 4: Macro-Compositions](#tier-4)
7. [🔧 Tier 4: Utility Classes](#tier-4u)
8. [🧪 Quality Assurance & Browser Matrix](#qa)
9. [🏗️ Development Log & Credits](#dev-log)

---

## 1. <a name="philosophy"></a> 📖 Project Philosophy & Principles

To establish a system that scales successfully, we must document for whom we are building and for why. A shared language is fundamental to collaboration, ensuring the system image bridges the gap to the user's mental model.

### 🎯 System Core Purpose:

“To empower engineers to compose intrinsically responsive, performance-first user interfaces instantly, using composable layout primitives that respect typographic boundaries and eliminate manual layout overrides.”

### 👤 User Stories

- **As a developer on a lean engineering team,** I want a layout framework with minimal maintenance overhead, so that our small team can rapidly scale the product without spending critical sprint cycles maintaining complex component configurations.
  - _Acceptance Criterion:_ The system must rely strictly on native browser capabilities (CSS Custom Properties and Custom Elements) rather than heavy JavaScript dependencies.
- **As a Frontend Engineer,** I want to compose layout structures using unified HTML elements without writing custom, non-DRY utility classes or complex grid overrides for every new view.
  - _Acceptance Criterion:_ Layout elements must manage spacing purely using internal custom properties and direct-child selectors, leaving child components entirely free of hardcoded margins.
- **As a UI Designer,** I want a strict, centralised token schema for spacing and typography based on a mathematical scale, ensuring visual harmony across all views without layout degradation.
  - _Acceptance Criterion:_ When local `--scale-ratio` modifiers are overridden, all internal font sizes and margins must recalculate harmoniously.
- **As an End User,** I want an interface that automatically scales to my device constraints and honours my browser zoom configuration perfectly, mitigating data loss or obscured content.
  - _Acceptance Criterion:_ When browser zoom increases to 200%, the layout scales fluidly without overlapping text or horizontal scrollbars on standard text-bound rows.

### 🔬 Strategic Research

| Core Metric/Strategy    | Traditional Frameworks                                                | LooseLeaf UI Architecture                                                                     |
| :---------------------- | :-------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **Layout Philosophy**   | Extrinsic & Device-Bound (Uses viewport-driven `@media` breakpoints). | Intrinsic & Content-Bound (Algorithmic constraints like `flex-basis` and `min()`).            |
| **Box Model**           | Often overridden locally; prone to layout calculation bloat.          | Universal strict `border-box` reset globally applied using wildcard `*`.                      |
| **Typographic Control** | Fluid text sizing requires complex breakpoint scaling rules.          | Self-governing scale bounded to strict line-height fractions and a maximum measure of `60ch`. |
| **Code Footprint**      | High namespacing overhead or massive HTML class strings.              | Lean composition via Custom Elements; high global reach with minimal semantic inheritance.    |

---

## 2. <a name="installation"></a> 📦 Installation & Integration

LooseLeaf UI is designed to be a drop-in toolkit rather than a heavy compiled framework.

### Local Integration

1. Clone the repository into your project structure.
2. Link the core CSS files in your `<head>` in the following strict cascade order:
   - `00-harmonics.css` (Resets, Tokens, and Modular Scale)
   - `01-primitives.css` (Stack, Cluster, Sidebar, Grid, Switcher, Reel)
   - `02-atoms.css` (Buttons, Inputs)

---

## 3. <a name="tier-1"></a> 🗺️ Tier 1: Core Axioms & Harmonics

Before we define individual layout primitives or components, LooseLeaf UI establishes a set of global, immutable rules. These ensure predictable sizing, readable text, and a mathematically harmonious layout scale, much like the regular frequencies of a harmonic series in music.

### 1. Global Resets & The Measure Axiom

- **The Box Model Reset (`border-box`):** Eliminates unexpected sizing changes when adding padding or borders.
- **Margin Collapse & Leakage Prevention (`margin-block: 0`):** Prevents a child element's vertical margins from breaking out and altering the parent container's spacing.
- **The Typographic Measure Boundary (`max-inline-size: 60ch`):** Ensures text never stretches past the optimal reading length, maintaining strict readability.

```css
/* 1. Global Box Model & Margin Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin-block: 0;
}

/* 2. Document Level Constraints */
html,
body {
  min-inline-size: 100%;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  color: var(--color-text-base);
}

/* 3. Typographic Measure with Inverted Control */
p,
li,
h1,
h2,
h3,
h4,
h5,
h6 {
  max-inline-size: var(--element-measure, 60ch);
}
```

### 2. The Fluid Modular Scale

Hardcoding font sizes and margins (e.g., 16px, 24px) leads to visual inconsistency. We use a mathematical scale based on a fundamental base frequency (`--s0`) and a harmonic ratio (`1.5`).

```css
:root {
  /* The Harmonic Ratio */
  --scale-ratio: 1.5;

  /* Fluid Baseline Tonic (--s0) */
  --s0: clamp(1rem, 0.8rem + 1vw, 1.25rem);

  /* The Expanding Scale */
  --s1: calc(var(--s0) * var(--scale-ratio));
  --s2: calc(var(--s1) * var(--scale-ratio));
  --s3: calc(var(--s2) * var(--scale-ratio));

  /* The Contracting Scale */
  --s-1: calc(var(--s0) / var(--scale-ratio));
  --s-2: calc(var(--s-1) / var(--scale-ratio));
}
```

### 3. Semantic Colour Tokens

Colours are named strictly by their structural purpose in the UI rather than their visual hue, ensuring effortless theming and dark mode integration.

```css
:root {
  --color-surface-base: #ffffff;
  --color-surface-sunken: #f4f4f5;
  --color-text-base: #18181b;
  --color-action-primary: #0070f3;
  --color-border-subtle: #e4e4e7;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-base: #18181b;
    --color-text-base: #ffffff;
  }
}
```

---

## 4. <a name="tier-2"></a> 🧩 Tier 2: Layout Primitives

Layout primitives handle the invisible structure of the application. They are algorithmically self-governing and devoid of cosmetic styling.

### The Stack (`l-stack`)

Injects a uniform vertical margin between consecutive sibling elements, using the lobotomised owl selector (`* + *`).

```css
l-stack {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
l-stack > * + * {
  margin-block-start: var(--space, var(--s1));
}
```

### The Cluster (`l-cluster`)

Groups elements side-by-side, wrapping gracefully using the `gap` property, completely bypassing media queries.

```css
l-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space, var(--s1));
  justify-content: flex-start;
  align-items: var(--cluster-align, center);
}
```

### The Sidebar (`l-sidebar`)

Places a fixed-width element next to a fluid element, wrapping into a vertical stack intrinsically when the container drops below a defined threshold (`50%` by default).

```css
l-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space, var(--s1));
}
l-sidebar > :first-child {
  flex-basis: var(--side-width, 15rem);
  flex-grow: 1;
}
l-sidebar > :last-child {
  flex-basis: 0;
  flex-grow: 999;
  min-inline-size: var(--main-min-width, 50%);
}
```

### The Grid (`l-grid`)

An intrinsic grid that calculates its own column count based on available space, expanding and wrapping smoothly without breakpoints.

```css
l-grid {
  display: grid;
  gap: var(--space, var(--s1));
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(var(--grid-min, 15rem), 100%), 1fr)
  );
}
```

### The Reel (`l-reel`)

A native horizontal scrolling container leveraging CSS scroll-snap physics to prevent "dead zones" between items.

```css
l-reel {
  display: flex;
  gap: var(--space, var(--s1));
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  padding-block-end: 1rem;
}
l-reel > * {
  scroll-snap-align: start;
}
```

### The Switcher (`l-switcher`)

A mathematical toggle that forces elements to remain in a single row until the container drops below a threshold, instantly switching to a vertical stack to prevent orphaned grid items.

```css
l-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space, var(--s1));
}
l-switcher > * {
  flex-grow: 1;
  flex-basis: calc((var(--threshold, 40rem) - 100%) * 999);
}
```

---

## 5. <a name="tier-3"></a> ✨ Tier 3: Functional Atoms

Atoms are the smallest indivisible functional patterns. They handle their own intrinsic styling (padding, colours, interactive states) but **never** dictate their own external layout (margins or positioning).

### The Button (`.c-button`)

A single, robust class handling interactive behaviours, modified by "Visual Loudness" data attributes (`cheer`, `murmur`, `ghost`) for varying degrees of emphasis.

```html
<!-- Primary Action -->
<button class="c-button" data-loudness="cheer" type="submit">
  Save Changes
</button>

<!-- Secondary Action -->
<a href="/" class="c-button" data-loudness="murmur">Cancel</a>
```

### Form Inputs (`.c-input`, `.c-label`)

Unified form classes that strip away browser defaults and rebuild the UI using our fluid scale. Setting `font-size: var(--s0)` explicitly mitigates the jarring auto-zoom behaviour in iOS Safari.

```html
<l-stack style="--space: var(--s1);">
  <div>
    <label class="c-label" for="email">Email Address</label>
    <input type="email" id="email" class="c-input" required />
  </div>
</l-stack>
```

### The Badge (`.c-badge`)

**1. Conceptual Purpose**

- **Problem:** Status indicators (like "New", "Error", or item counts) often suffer from inconsistent vertical alignment when placed next to text, or rely on hardcoded pixel dimensions that break when the user scales their font size.
- **Pattern Solution:** A compact, inline-flex element that perfectly centers its text and relies on our modular scale for proportional, fluid padding.
- **Contextual Rule:** Badges are non-interactive read-only atoms. If a badge needs to be clicked, it should be marked up as a button or link with a specific variant.

**2. Logical Behaviour Map**

- **Inline Alignment:** Uses `inline-flex` to sit naturally alongside text in a paragraph or heading.
- **Semantic Tints:** Relies on data attributes (`data-status="success" | "danger"`) to inherit specific semantic colour tokens.

**3. Implementation Logic (CSS)**

```css
.c-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Inherit the parent font size, but scale it down one step */
  font-size: 0.85em;
  font-weight: 600;
  line-height: 1;

  /* Proportional padding based on the text size */
  padding: 0.25em 0.65em;
  border-radius: 999px; /* Pill shape */

  background-color: var(--color-surface-sunken);
  color: var(--color-text-base);
}

/* Status Variants */
.c-badge[data-status="danger"] {
  background-color: #fee2e2; /* Example: map to semantic token */
  color: #991b1b;
}
```

---

## 6. <a name="tier-4"></a> 🏗️ Tier 4: Macro-Compositions (Organisms)

Macro-compositions are complex UI patterns built by nesting Tier 3 Atoms inside Tier 2 Layout Primitives. Tier 4 components rarely declare their own layout CSS. They act purely as decorative shells (handling backgrounds, borders, and padding), delegating all structural flow to the primitives inside them.

### The Card (`.c-card`)

**1. Conceptual Purpose**

- **Problem:** Developers frequently hardcode internal margins into Card components (.card-title { margin-bottom: 1rem; }), making it impossible to add or remove elements without breaking the design.
- **Pattern Solution:** The Card is simply a decorative container. It relies entirely on a nested `<l-stack>` primitive to manage the vertical rhythm of the content inside it.

**2. Logical Behaviour Map**

- **The Decorative Shell:** The `.c-card` class applies the border, background, and internal padding.
- **The Structural Core:** An `<l-stack>` manages the spacing between the image, title, text, and buttons.

**3. HTML Composition**

```html
<article class="c-card">
  <l-stack style="--space: var(--s1);">
    <img src="thumbnail.jpg" alt="Description" class="c-card__media" />

    <l-stack style="--space: var(--s-2);">
      <h3>Card Title</h3>
      <p>
        This is the descriptive text. Notice how we don't need any margin
        classes.
      </p>
    </l-stack>

    <l-cluster>
      <button class="c-button" data-loudness="cheer">Accept</button>
      <button class="c-button" data-loudness="murmur">Decline</button>
    </l-cluster>
  </l-stack>
</article>
```

**4. The CSS Requirement**

```css
.c-card {
  background-color: var(--color-surface-base);
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  padding: var(--s1);
  overflow: hidden;
}
/* Media resets for cards */
.c-card__media {
  max-inline-size: 100%;
  display: block;
  /* Pull the image flush to the card edges by negating padding */
  margin: calc(var(--s1) * -1) calc(var(--s1) * -1) 0;
}
```

### The Native Modal (`.c-modal`)

**1. Conceptual Purpose**

- **Problem:** Creating accessible modals requires massive JavaScript overhead to handle focus trapping, backdrop clicking, and z-index wars.
- **Pattern Solution:** We utilise the native HTML5 <dialog> element, styling it with our tokens and letting the browser handle accessibility and positioning natively.

**2. Logical Behaviour Map**

- **Top Layer:** The <dialog> element natively sits in the browser's top layer, bypassing z-index issues entirely.
- **Intrinsic Centering:** The browser automatically centers the dialog. We only need to restrict its maximum width (max-inline-size: 60ch).

**3. Implementation Logic (CSS & HTML)**

```css
.c-modal {
  padding: var(--s2);
  border: none;
  border-radius: 8px;
  background-color: var(--color-surface-base);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);

  /* Restrict width using our measure axiom */
  max-inline-size: var(--measure);
  width: 90vw;
}

/* Style the native backdrop */
.c-modal::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}
```

```html
<dialog class="c-modal" id="myModal">
  <l-stack>
    <h2>Confirm Action</h2>
    <p>Are you sure you want to proceed? This cannot be undone.</p>

    <l-cluster style="justify-content: flex-end;">
      <button
        class="c-button"
        data-loudness="murmur"
        onclick="window.myModal.close()"
      >
        Cancel
      </button>
      <button class="c-button" data-loudness="cheer">Confirm</button>
    </l-cluster>
  </l-stack>
</dialog>
```

---

## 7. <a name="tier-4u"></a> 🔧 Tier 4: Utility Classes

Utilities are single-purpose classes used for final, granular adjustments that cannot be handled by the Layout Primitives or Functional Atoms.

### The Golden Rules of Utility Classes

1. **The Last Resort:** Only use a utility class if no layout primitive or component class can achieve the desired result.
2. **Naming Convention:** All utility classes are prefixed with `u-` to explicitly signal that they are overrides.
3. **Restricted Scope:** Utilities should **never** define structural layout (margins, flex-behavior). They should only handle visual states (visibility, text-alignment).

### The Permitted Utility Library

We only permit the following utilities to keep the system lean and maintainable.

| Class                | Purpose             | Logic                                                             |
| :------------------- | :------------------ | :---------------------------------------------------------------- |
| `.u-visually-hidden` | Accessible hiding   | Removes element from visual flow but keeps it for screen readers. |
| `.u-text-center`     | Text alignment      | Forces text-align: center.                                        |
| `.u-text-uppercase`  | Text transformation | Forces uppercase styling.                                         |
| `.u-truncate`        | Overflow handling   | Adds ellipsis to overflowing text.                                |

**Implementation Logic:**

```css
/* Accessible screen-reader-only utility */
.u-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.u-text-center {
  text-align: center;
}
.u-text-uppercase {
  text-transform: uppercase;
}

.u-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

---

## 8. <a name="qa"></a> 🧪 Quality Assurance & Browser Matrix

This section outlines the holistic verification suite executed to guarantee the engineering integrity, mathematical precision, and cross-platform accessibility of the system.

- **Manual Testing Matrix:** Boundary explorations simulating extreme container constriction.
- **Behaviour-Driven Verification:** Cross-referencing component behaviour against core user stories.
- **Validator Testing:** W3C HTML and CSS conformance checks.
- **Lighthouse Testing:** Performance, Accessibility, and Best Practices scoring.
- **Browser Compatibility:** Explicit verification across WebKit, Blink, and Gecko engines.
- **Responsiveness Testing:** Device agnostic verification across multiple viewport archetypes.

---

## 9. <a name="dev-log"></a> 🏗️ Development Log & Credits

### Credits & Acknowledgements

- **AI Pair Programming:** Large Language Models were utilised strictly as a "Pair Programmer" and linter throughout the development lifecycle to accelerate cross-browser debugging, reflow profiling, and formatting.
- **Every Layout:** Deep inspiration drawn from Heydon Pickering and Andy Bell's principles on algorithmic, intrinsic CSS layout design.
- **Design Systems:** Alla Kholmatova's framework for modular, pattern-driven design languages.
- **Eloquent JavaScript:** Marijn Haverbeke's principles on abstraction and managing program complexity.

### Technologies Used

- **HTML5:** Semantic accessible markup layout layer.
- **CSS3:** Custom properties, CSS Grid, Flexbox, `clamp()`, and mathematical logic.
- **JavaScript (ES6+):** (Used sparingly for progressive enhancement where CSS falls short).
- **Git & GitHub:** Atomic source control and cloud distribution.
