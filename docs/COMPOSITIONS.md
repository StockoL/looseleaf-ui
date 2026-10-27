# LooseLeaf UI - Composition Architecture & Layering Guide

Welcome to the Composition Architecture Guide for **LooseLeaf UI**.

The fundamental principle of CUBE CSS (Composition, Utility, Block, Exception) is the strict **Separation of Macro Layout from Visual Aesthetics**.

In traditional frameworks, layout positioning, margins, and component styling are heavily coupled. This leads to non-DRY utility strings, specificity battles, and constant margin overrides. LooseLeaf UI solves this by isolating all structural flow into **Compositions**.

---

## 📋 Table of Contents

1. [📖 Golden Rules of CUBE Architecture](#golden-rules)
2. [🏗️ Macro-Composition Case Studies](#case-studies)
   - [Case Study 1: The Marketing Hero Section](#case-study-1)
   - [Case Study 2: The Application Dashboard](#case-study-2)
   - [Case Study 3: The Multi-Group Navigation Bar](#case-study-3)
   - [Case Study 4: The Off-Canvas Drawer / Mobile Nav](#case-study-4)
   - [Case Study 5: The Bento Feature Grid](#case-study-5)
   - [Case Study 6: The Media Object / Testimonial Stack](#case-study-6)
3. [🧱 Block Architectural Guidelines](#block-guidelines)
   - [The Button Block (`.button`)](#block-button)
   - [The Card Block (`.card`)](#block-card)
   - [The Input Block (`.input` & `.field`)](#block-input)
   - [The Badge Block (`.badge`)](#block-badge)

---

## 1. <a name="golden-rules"></a> 📖 Golden Rules of CUBE Architecture

1. **Purely Structural:** Compositions govern spacing, wrapping, and alignment. They **never** declare background colours, borders, shadows, or typography styles.
2. **Zero Outer Margins on Blocks:** Visual blocks (`.card`, `.button`, `.input`) care _only_ about their internal padding and aesthetics. They are completely purged of external margins.
3. **Outer to Inner Layering:** Compositions control layout from macro wrappers (`.wrapper`, `.sidebar`) down to micro relationships (`.cluster`, `.flow`).
4. **Custom Properties as Props:** Tune thresholds, alignment, and gaps inline using local CSS Custom Properties (e.g., `style="--switcher-threshold: 40rem;"`) without writing extra CSS rules.
5. **Exceptions Over Modifier Classes:** Use HTML state attributes (`data-variant="primary"`, `data-state="open"`, `data-status="danger"`) to alter block appearances dynamically rather than inventing non-DRY utility classes.

---

## 🛠️ Composition Primitives Quick Reference

| Primitive | Class | Structural Purpose | Key Custom Properties and Exceptions |
| :-- | :-- | :-- | :-- |
| **Wrapper** | `.wrapper` | Macro page-section container: caps a *site* max-width, auto margins. | `--wrapper-max-width`, `--wrapper-gutters` |
| **Region** | `.region` | Vertical breathing room for a page section; pair with `.wrapper`. | `--region-padding`, `[data-size="small"]`, `[data-size="large"]` |
| **Center** | `.center` | Content primitive: caps a box to the *reading measure*, auto margins. | `--center-max-width`, `--center-gutters`, `[data-and-text]`, `[data-intrinsic]` |
| **Flow** | `.flow` | Vertical rhythm between sibling elements via the lobotomised owl. | `--flow-space` (default `1em`) |
| **Cluster** | `.cluster` | Groups items horizontally, wrapping naturally with zero overflow. | `--cluster-space`, `--cluster-justify`, `--cluster-align` |
| **Sidebar** | `.sidebar` | Asymmetric two-column layout (target-width panel + fluid main area). | `--sidebar-target-width`, `--sidebar-content-min-width`, `--sidebar-space`, `--sidebar-align`, `[data-side="right"]`, `[data-sticky]` with `--sticky-offset` |
| **Switcher** | `.switcher` | Side by side until the container drops below a threshold, then stacked. | `--switcher-threshold` |
| **Grid** | `.grid` | Auto-filling, intrinsically responsive grid. | `--grid-min-item-size`, `--grid-placement` |
| **Reel** | `.reel` | Horizontal scroll-snap strip (galleries, card rows). | gap from `--gutter` |
| **Frame** | `.frame` | Crops media to a fixed aspect ratio. | `--frame-ratio` (default `16 / 9`) |
| **Bento** | `.bento` | Dense intrinsic grid whose items may span tracks once it is wide enough. | `--bento-min`, `--bento-row-min`, `--bento-space`, `[data-span]` and `[data-row-span]` on items |

### Wrapper vs. Center — which one do I reach for?

These look similar (both cap a width and center it) but solve different problems, and are not interchangeable:

- **`.wrapper`** is the outermost, macro-layout shell. Use it once per full-bleed section (a `<header>`, `<footer>`, or page region) to align its contents to a consistent, wide, site-level edge margin (default `80rem`). Padding is included in the width cap (plain border-box) — the same as everything else in the system.
- **`.center`** is a content primitive. Use it around prose, hero copy, or any box that needs to cap at the *typographic reading measure* (default `60ch`) rather than the site width. It uses `box-sizing: content-box` deliberately, so its gutter padding is never eaten into the measure cap — a reading-width guarantee `.wrapper` does not make. It also offers `[data-and-text]` and `[data-intrinsic]` exceptions for centering its own children, which `.wrapper` intentionally does not.

A common pattern is nesting them: `.wrapper` for the section's site-wide edge margin, `.center` inside it to cap a heading or intro paragraph to a comfortable reading width.

---

## 2. <a name="case-studies"></a> 🏗️ Macro-Composition Case Studies

Below are standard, real-world layout challenges solved entirely by layering LooseLeaf UI compositions without writing custom layout CSS.

---

### <a name="case-study-1"></a> Case Study 1: The Marketing Hero Section

#### The Goal

A responsive hero section featuring headline copy and CTA buttons on the left, media on the right, and aligned wrapping behavior. On narrow viewports, the media must stack smoothly below the text, and buttons must wrap naturally.

#### The Composition Stack

`Region` + `Wrapper` ➔ `Switcher` ➔ `Flow` + `Cluster` | `Frame`

#### HTML Implementation

```html
<!-- 1. REGION + WRAPPER: vertical room for the section, then its site-wide edge -->
<section class="region">
<div class="wrapper">
  <!-- 2. SWITCHER: Enforces side-by-side layout until container drops below 50rem -->
  <div class="switcher" style="--switcher-threshold: 50rem;">
    <!-- LEFT COLUMN: Flow primitive manages vertical rhythm -->
    <div class="flow">
      <h1>Build resilient web applications</h1>
      <p>
        A CUBE CSS architecture that scales without specificity wars or heavy
        framework dependencies.
      </p>

      <!-- 3. CLUSTER: Manages horizontal grouping and wrapping for buttons -->
      <div class="cluster">
        <button class="button" data-variant="primary">Get Started</button>
        <button class="button">Documentation</button>
      </div>
    </div>

    <!-- RIGHT COLUMN: FRAME crops the media to 4:3 at any width -->
    <div class="frame" style="--frame-ratio: 4 / 3;">
      <img src="hero-illustration.svg" alt="App Preview" />
    </div>
  </div>
</div>
</section>
```

#### Why This Works

- No Media Queries: The `Switcher` handles responsiveness intrinsically based on container constraints rather than arbitrary viewport widths.
- No Spacing Leaks: The `Flow` primitive spaces the heading, body text, and button group cleanly without requiring hardcoded `margin-bottom` rules on child tags.

### <a name="case-study-2"></a> Case Study 2: The Application Dashboard Layout

#### The Goal

A fixed-width sidebar navigation running alongside a fluid main content region. The main section contains an auto-filling 3-column metric display.

#### The Composition Stack

`Sidebar` ➔ `Grid` ➔ `Flow`

#### HTML Implementation

```html
<!-- 1. SIDEBAR: Asymmetric split (Fixed target sidebar + fluid main area) -->
<div class="sidebar" style="--sidebar-target-width: 16rem;">
  <!-- FIXED NAVIGATION SIDEBAR -->
  <aside class="sidebar__nav">
    <nav class="flow">
      <a href="#dash">Dashboard</a>
      <a href="#analytics">Analytics</a>
      <a href="#settings">Settings</a>
    </nav>
  </aside>

  <!-- FLUID MAIN CONTENT AREA -->
  <main class="flow">
    <h2>Overview</h2>

    <!-- 2. GRID: Auto-filling card layout inside main area -->
    <div class="grid" style="--grid-min-item-size: 18rem;">
      <article class="card">
        <div class="card__body flow">
          <h3>Total Revenue</h3>
          <p class="text-lead">$42,850</p>
        </div>
      </article>

      <article class="card">
        <div class="card__body flow">
          <h3>Active Users</h3>
          <p class="text-lead">1,240</p>
        </div>
      </article>

      <article class="card">
        <div class="card__body flow">
          <h3>Conversion Rate</h3>
          <p class="text-lead">3.4%</p>
        </div>
      </article>
    </div>
  </main>
</div>
```

#### Why This Works

- Independent Column Mechanics: The `Sidebar` primitive preserves the navigation target width (`16rem`) while delegating all remaining space to `<main>`.
- Internal Grid Responsiveness: The metric cards calculate their column count dynamically based on the available width inside `<main>`, NOT the outer browser viewport.

### <a name="case-study-3"></a> Case Study 3: The Multi-Group Navigation Bar

#### The Goal

A header containing a brand logo on the left, primary navigation links in the center/right, and action buttons on the far right.

#### The Composition Stack

`Wrapper` ➔ `Cluster` (Outer) ➔ `Cluster` (Inner)

#### HTML Implementation

```html
<header class="site-header">
  <!-- 1. WRAPPER: Limits maximum header inline width -->
  <div class="wrapper">
    <!-- 2. OUTER CLUSTER: Pushes primary groupings apart using flex-between -->
    <div class="cluster" style="--cluster-justify: space-between;">
      <!-- BRAND LOGO -->
      <a href="/" class="brand-logo">LooseLeaf UI</a>

      <!-- 3. INNER CLUSTER: Nav links grouped together with custom tight spacing -->
      <nav class="cluster" style="--cluster-space: var(--space-xs);">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#docs">Docs</a>
      </nav>

      <!-- 4. INNER CLUSTER: Action buttons -->
      <div class="cluster">
        <button class="button">Log In</button>
        <button class="button" data-variant="primary">Sign Up</button>
      </div>
    </div>
  </div>
</header>
```

#### Why This Works

- Scoped Spacing Controls: By overriding `--cluster-space` locally on the `<nav>` cluster, we create tight link gaps without affecting the wider layout gap of the parent header cluster.
- Graceful Wrapping: On smaller viewports, navigation elements wrap into organised rows without triggering horizontal scrollbars or clipping text.

### <a name="case-study-4"></a> Case Study 4: The Off-Canvas Drawer/Mobile Navigation

#### The Goal

A slide-out mobile menu or filter drawer using the native HTML5 `<dialog>` element, maintaining accessible focus trapping and vertical link flow.

#### The Composition Stack

`Dialog` ➔ `Wrapper` ➔ `Cluster` + `Flow`

#### HTML Implementation

```html
<!-- Trigger Button -->
<button class="button" data-open-dialog="mobile-menu-drawer">Open Menu</button>

<!-- Slide-Out Drawer Dialog -->
<dialog class="offcanvas" id="mobile-menu-drawer">
  <div class="wrapper flow">
    <div class="cluster" style="--cluster-justify: space-between;">
      <h3>Navigation</h3>
      <button class="button" data-size="small" data-close-dialog>Close</button>
    </div>

    <nav class="flow">
      <a href="#home">Home</a>
      <a href="#services">Services</a>
      <a href="#about">About Us</a>
      <a href="#contact">Contact</a>
    </nav>
  </div>
</dialog>
```

#### Why This Works

- Native Accessibility Layering: Nesting `.flow` inside the native `<dialog>` element guarantees focus trapping and keyboard navigation routes work out of the box while automating vertical link rhythm.
- Isolated Spatial Constraints: The `.wrapper` primitive prevents drawer text from pressing against screen edges on mobile devices without hardcoding margins into individual navigation anchors.

### <a name="case-study-5"></a> Case Study 5: The Bento Feature Grid

#### The Goal

An asymmetric feature showcase grid where individual cards calculate their layout bounds intrinsically while maintaining vertical rhythm inside each card.

#### The Composition Stack

`Bento` ➔ `Card` ➔ `Flow`

#### HTML Implementation

```html
<div class="bento" style="--bento-min: 16rem;">
  <!-- HERO BENTO ITEM: spans every track once the bento is at least 45rem wide -->
  <article class="card" data-span="full">
    <div class="card__body flow">
      <span class="badge" data-status="info">Featured</span>
      <h2>Next-Gen Token Compiler</h2>
      <p>
        Automate your design system pipeline from JSON direct to native CSS
        Custom Properties.
      </p>
    </div>
  </article>

  <!-- SECONDARY BENTO ITEM -->
  <article class="card">
    <div class="card__body flow">
      <h3>Zero Dependencies</h3>
      <p>Shipped with plain ES6 and native browser standards.</p>
    </div>
  </article>

  <!-- TERTIARY BENTO ITEM -->
  <article class="card">
    <div class="card__body flow">
      <h3>CUBE CSS Architecture</h3>
      <p>Flat specificity layers using CSS @layer boundaries.</p>
    </div>
  </article>
</div>
```

#### Why This Works

- Dynamic Column Reflow: `--bento-min` sets the narrowest a track may be, so the bento fits as many columns as the space allows with no breakpoints. Spans (`data-span`, `data-row-span`) only apply inside `@container bento (min-width: 45rem)`, so a span can never overflow a single-column phone layout.
- Encapsulated Content Flow: Wrapping internal card content in `.flow` keeps titles, badges, and copy spaced predictably regardless of column span or card height variations.

### <a name="case-study-6"></a> Case Study 6: The Media Object/Testimonial Stack

#### The Goal

A fixed-size avatar or image situated next to fluid, multi-line copy that automatically drops into a vertical stack on small viewports without hardcoded media queries.

#### The Composition Stack

`Sidebar` ➔ `Flow`

#### HTML Implementation

```html
<article class="card">
  <div
    class="card__body sidebar"
    style="--sidebar-target-width: 4rem; --sidebar-space: var(--space-m); --sidebar-align: flex-start;"
  >
    <!-- FIXED AVATAR ANCHOR -->
    <div class="frame" style="--frame-ratio: 1; border-radius: var(--radius-pill);">
      <img src="avatar.jpg" alt="Ada Lovelace" />
    </div>

    <!-- FLUID COPY CONTENT -->
    <div class="flow">
      <blockquote>
        "LooseLeaf UI completely transformed how our engineering team approaches
        design systems."
      </blockquote>
      <p class="text-muted">
        <strong>Ada Lovelace</strong> — Lead Systems Architect
      </p>
    </div>
  </div>
</article>
```

#### Why This Works

- Algorithmic Stacking: Setting a small `--sidebar-target-width` (`4rem`) locks the avatar width while letting the quote fill remaining inline space. If container width becomes constricted, it stacks vertically automatically.
- Zero Flexbox Hacks: Using `.sidebar` eliminates the need for manual flex-shrink, flex-grow, or media-query overrides on small-screen card previews.
- Fixed-Ratio Avatar: `--sidebar-align: flex-start` stops the sidebar stretching the avatar to the height of the quote, and `.frame` keeps it square.

## 3. <a name="block-guidelines"></a> 🧱 Block Architectural Guidelines

Blocks care only about their internal styling (padding, typography, background colors, borders, and interactive transitions). They are completely purged of external positioning or margins.

Below are the architectural definitions for four foundational blocks, excerpted from their source files. The [README block table](../README.md#blocks) lists every block with its exceptions and JavaScript hooks.

### <a name="block-button"></a>The Button Block (`.button`)

#### CSS Implementation (excerpt of `src/03-blocks/button.css`)

```css
@layer blocks {
  .button {
    /* Default style is a token choice (outlined or filled), set in the configurator */
    --button-bg: var(--button-default-bg);
    --button-text: var(--button-default-text);
    --button-border: var(--button-default-border);
    --button-bg-hover: var(--button-default-bg-hover);
    --button-border-hover: var(--button-default-border-hover);
    --button-padding: var(--inset-control);
    --button-font-size: var(--text-body);

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2xs);
    min-block-size: var(--target-min);
    padding: var(--button-padding);
    background-color: var(--button-bg);
    color: var(--button-text);
    border: 1px solid var(--button-border);
    border-radius: var(--radius-control);
    font-size: var(--button-font-size);
    font-weight: var(--weight-semibold);
  }

  @media (hover: hover) {
    .button:hover:not(:disabled, [aria-disabled="true"], [data-state="loading"]) {
      background-color: var(--button-bg-hover);
      border-color: var(--button-border-hover);
    }
  }

  /* CUBE Exceptions only reassign the variables */
  .button[data-variant="primary"] {
    --button-bg: var(--color-action);
    --button-text: var(--color-action-text);
    --button-border: var(--color-action);
    --button-bg-hover: var(--color-action-hover);
    --button-border-hover: var(--color-action-hover);
  }

  .button[data-size="small"] {
    --button-padding: var(--space-3xs) var(--space-xs);
    --button-font-size: var(--text-small);
  }
}
```

##### Why This Works

- DRY Parameter Isolation: Instead of duplicating rules across separate classes for each variant or size, all variations modify local custom properties (`--button-bg`, `--button-border`). The core structure (padding, transitions, flex alignment) is written only once.
- Pure Visual Boundary: The block is completely purged of outer margins, allowing it to sit inside a `.cluster` for horizontal alignment or a `.flow` for vertical stack rhythm without layout conflicts.
- Semantic Exception Hooks: Using HTML attributes such as `data-variant="primary"` or `data-size="small"` keeps class names clean and avoids specificity wars.
- Touch-Safe: Hover lives inside `@media (hover: hover)`, so a tapped button never sticks in its hover state, and no size ever drops below the 44px `--target-min`.

### <a name="block-card"></a> The Card Block (`.card`)

#### CSS Implementation (`src/03-blocks/card.css`)

```css
@layer blocks {
  .card {
    position: relative;
    overflow: hidden;
    background-color: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-surface);
  }

  .card__body {
    padding: var(--card-padding, var(--inset-surface));
  }

  /* Flush media: a direct img, picture or video fills the card's width */
  .card > :is(img, picture, video) {
    display: block;
    inline-size: 100%;
    aspect-ratio: var(--card-media-ratio, 16 / 9);
    object-fit: cover;
  }
}
```

#### Why This Works

- Flush Media Without Arithmetic: The card itself has no padding; `.card__body` carries it. Media placed directly in the card therefore sits edge to edge with no negative margins, and changing `--card-padding` never breaks it.
- Encapsulated Formatting: With `overflow: hidden`, child images clip to the card's border radius. A card holding a floating badge switches to `overflow: visible` (via `:has()`) so the badge is never cut off.
- Layout Agnostic: The card focuses strictly on surface aesthetics (backgrounds, borders, radii). It can be dropped inside a `.grid`, `.switcher`, or `.sidebar` without breaking parent composition bounds.

### <a name="block-input"></a> The Input Block (`.input` & `.field`)

#### CSS Implementation (excerpts of `src/03-blocks/field.css` and `src/03-blocks/input.css`)

```css
@layer blocks {
  .field {
    display: grid;
    gap: var(--field-gap, var(--space-3xs));
  }

  .label {
    font-size: var(--text-body);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-tight);
  }

  /* .input, .select and .textarea share one base */
  :is(.input, .select, .textarea) {
    --control-bg: var(--color-surface);
    --control-border: var(--color-border);

    inline-size: 100%;
    min-block-size: var(--target-min);
    padding: var(--inset-control);
    font-size: var(--text-body); /* never smaller: iOS zooms below 16px */
    background-color: var(--control-bg);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
  }

  /* Validation exception: from the field or the control itself */
  .field[data-status="danger"] :is(.input, .select, .textarea),
  :is(.input, .select, .textarea)[aria-invalid="true"] {
    --control-border: var(--color-status-danger);
    --control-bg: var(--color-status-danger-surface);
  }
}
```

```html
<div class="field" data-status="danger">
  <label class="label" for="email">Email address</label>
  <input class="input" type="email" id="email" aria-invalid="true" aria-describedby="email-error" />
  <p class="field__error" id="email-error" role="alert">Enter an email address like name@example.com.</p>
</div>
```

#### Why This Works

- Native State Integration: Instead of adding an invalid or error state class, input errors hook directly into the standard `[aria-invalid="true"]` accessibility attribute. This enforces accessible state management in the DOM before visual styling even applies.
- Decoupled Field Structure: `.field` is a grid with a local gap, so the label, control, `.field__hint` and `.field__error` stay grouped without vertical margins on individual elements.
- One Control Base: The three control types share their base rule, so a focus, hover or error change lands everywhere at once.

### <a name="block-badge"></a> The Badge Block (`.badge`)

#### CSS Implementation (excerpt of `src/03-blocks/badge.css`)

```css
@layer blocks {
  .badge {
    --badge-bg: var(--color-surface-sunken);
    --badge-text: var(--color-text);

    display: inline-flex;
    align-items: center;
    padding: 0.25em 0.65em;
    font-size: 0.85em;
    font-weight: var(--weight-semibold);
    line-height: 1;
    border-radius: var(--radius-pill);
    background-color: var(--badge-bg);
    color: var(--badge-text);
  }

  /* Status Exception Hooks: semantic tokens that re-point in dark mode */
  .badge[data-status="success"] {
    --badge-bg: var(--color-status-success-surface);
    --badge-text: var(--color-status-success-text);
  }

  /* Floating placement: straddles the top edge of its positioned parent */
  .badge[data-placement="floating"] {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: var(--layer-raised);
  }
}
```

#### Why This Works

- Font-Relative Proportions: By defining padding in `em` units (`0.25em 0.65em`) rather than fixed `rem` or `px` values, the badge scales fluidly to match whatever parent typography step it sits inside (e.g., inside an `<h1>` or a small paragraph).
- Pill-Radius Resilience: `--radius-pill` guarantees a perfectly rounded pill shape regardless of the text length or font size inside the badge.
- Scheme-Aware Status: Status colours come from the semantic `--color-status-*` tokens, so a badge is legible in light and dark without any dark-mode rules of its own.
