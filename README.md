# LooseLeaf UI Component Library

To empower lean, agile engineering teams to compose intrinsically responsive, performance-first user interfaces instantly. By utilising composable layout primitives that respect typographic boundaries (capped at `60ch`), LooseLeaf UI eliminates manual layout overrides and minimises ongoing maintenance overhead for small development footprints.

---

## <a name="top"></a>📋 Table of Contents

1. [📖 Project Purpose & User Stories](#purpose)
2. [🔬 Strategic Research](#research)
3. [🖼️ UX Design Strategy (The 5 Planes)](#ux-strategy)
4. [🗺️ System Architecture](#architecture)
5. [✨ Core Features & UI Overhauls](#features)
6. [🌐 Deployment Guide](#deployment)
7. [🤝 Credits & Acknowledgements](#credits)
8. [🏗️ Development Log & Engineering Phases](#dev-log)
9. [🧪 Testing & Quality Assurance Portfolio](#testing)

---

## 1. <a name="purpose"></a> 📖 Project Purpose & User Stories

To establish a system that scales successfully, we must document for whom we are building and for why.

### 🎯 System Core Purpose:

“To empower engineers to compose intrinsically responsive, performance-first user interfaces instantly, using composable layout primitives that respect typographic boundaries (capped at 60ch) and eliminate manual layout overrides.”

### 👤 User Stories

- **User Story:** As a developer on a lean engineering team, I want a layout framework with minimal maintenance overhead, so that our small team can rapidly scale the product without spending critical sprint cycles maintaining complex component configurations.
  - _Acceptance Criterion:_ The system must rely strictly on native browser capabilities (CSS Custom Properties and Custom Elements) rather than heavy JavaScript bundle dependencies or complex build-step preprocessors.
- **User Story:** As a Frontend Engineer, I want to compose layout structures using unified HTML elements (like a `<l-stack>` or `<l-cluster>`) without writing custom, non-DRY utility classes or complex grid overrides for every new view.
  - _Acceptance Criterion:_ The layout elements must manage spacing purely using internal custom properties and direct-child selectors, leaving child components entirely free of hardcoded margins.
- **User Story:** As a UI Designer, I want a strict, centralised token schema for spacing and typography based on a mathematical scale, ensuring visual harmony across all views without layout degradation.
  - _Acceptance Criterion (BDD):_
    - **Given** a child component is nested inside a high-density area,
    - **When** the local `--scale-ratio` modifier is overridden,
    - **Then** all internal font sizes and margins must recalculate harmoniously based on the new interval without breaking the container layout.
- **User Story:** As an End User, I want an interface that automatically scales to my device constraints and honors my browser zoom configuration perfectly, mitigating data loss or obscured content.
  - _Acceptance Criterion (BDD):_
    - **Given** an end user increases their browser zoom up to 200% or views the layout on a narrow mobile screen (320px width),
    - **When** the content scales fluidly,
    - **Then** no text elements may overlap or become truncated, and no horizontal scrollbars should appear on standard text-bound layout rows.

<p align="right">(<a href="#top">Back to top</a>)</p>

---

## 2. <a name="research"></a>🔬 Strategic Research

Before we configure our system architecture, we must assess where traditional utility frameworks are perceived to fall short and how our chosen stack addresses these pain points.

| Core Metric/Strategy | Traditional Frameworks                                                | LooseLeaf UI Architecture                                                                     |
| :------------------- | :-------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| Layout Philosophy    | Extrinsic & Device-Bound (Uses viewport-driven `@media` breakpoints). | Intrinsic & Content-Bound (Algorithmic constraints like `flex-basis` and `min()`).            |
| Box Model & Model    | Often overridden locally; prone to layout calculation bloat.          | Universal strict `border-box` reset globally applied using wildcard `*`.                      |
| Typographic Control  | Fluid text sizing requires complex breakpoint scaling rules.          | Self-governing scale bounded to strict line-height fractions and a maximum measure of `60ch`. |
| Code Footprint (DRY) | High namespacing overhead or massive HTML class strings.              | Lean composition via Custom Elements; high global reach with minimal semantic inheritance.    |

<p align="right">(<a href="#top">Back to top</a>)</p>

---

## 3. <a name="ux-strategy"></a> 🖼️ UX Design Strategy (The 5 Planes)

### Wireframes

![Description](./docs/wireframes/placeholder.png)

### I. Strategy

- **User Goals:**
- **Target Audience:**
- **The Future Runway:**

### II. Scope

### III. Structure

### IV. Skeleton

### V. Surface

<p align="right">(<a href="#top">Back to top</a>)</p>

---

## 4. <a name="architecture"></a> 🗺️ System Architecture

### 📐 Universal Constraints

Exploring the first principles of the border-box model, the global removal of vertical margin leakage, and how we structurally clamp our typographic measure to a strict `60ch` limit without breaking container flexibility.

Our global reset must enforce total predictability across every layout and container, regardless of where it is nested. We accomplish this by addressing three core pillars:

1. **The Box Model Reset (`border-box`):** Eliminates unexpected sizing changes when adding padding or borders.
2. **Margin Collapse & Leakage Prevention (`margin-block: 0`):** Prevents a child element's vertical margins from breaking out and altering the parent container's spacing.
3. **The Typographic Measure Boundary (`max-inline-size: 60ch`):** Ensures text never stretches past the optimal reading length, maintaining strict readability.

| Selector/Rule                   | System Purpose                      | Architectural Intent                                                                                                                                        |
| :------------------------------ | :---------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `* { box-sizing: border-box; }` | Universal sizing predictability.    | Forces all padding and borders to be calculated _inside_ the declared width, preventing layout breaking.                                                    |
| `* { margin-block: 0; }`        | Elimination of layout leakage.      | Strips default vertical margins from all elements. Spacing must be explicitly managed by layout primitives (like a Stack), avoiding magic number overrides. |
| `p, li, h1, h2, h3`             | Typographic constraint enforcement. | Clamps line length to a maximum of `60ch` to optimise cognitive load and reading comfort across large screens.                                              |

<details>  
<summary><b>🔍 Expand Universal Reset</b></summary>

```css
/* ==========================================================================  
   LOOSELEAF UI: THE UNIVERSAL RESET  
   ========================================================================== */

/* 1. Global Box Model & Margin Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin-block: 0; /* Removes vertical margin leakage entirely */
}

/* 2. Document Level Constraints */
html,
body {
  min-inline-size: 100%;
  font-family: sans-serif;
  line-height: 1.5;
  color: var(--color-text-base);
}

/* 3. Typographic Measure with Inverted Control*/
p,
li,
h1,
h2,
h3,
h4,
h5,
h6 {
  max-inline-size: var(
    --element-measure,
    60ch
  ); /* Default to 60ch, but overrideable by any parent layout primitive */
}
```

</details>

### Fluid Lock-Step Token Design

This design system rejects the fragile practice of hardcoding absolute pixel values (`px`) or relying on arbitrary viewport breakpoints (`@media`) to handle spacing and typography. Instead, it treats layout as a **dynamic composition**, leveraging a single mathematical denominator to ensure global harmony.

#### The Tonic Root: Rem over Pixels

- **Accessibility First:** We strictly avoid hardcoding pixel units (`px`) for text and core layout boundaries.
- **User Affordance:** By utilising `rem` units, our layout respects the user's default browser or operating system settings. If a user adjusts their zoom or default text size, the entire interface scales proportionally without causing data loss or malformed content.

#### The Harmonic Series: Modular Scale

- **Adherence to Ratio:** Spacing tokens and typographic hierarchies are derived from a strict **Modular Scale**. Much like a musical chord is built on clean mathematical intervals, our token intervals expand by a designated multiplier (e.g., a Perfect Fifth, 1.5).
- **DRY Architecture:** Tokens are calculated recursively using CSS custom properties on the `:root` element. Changing a single base variable dynamically propagates and updates the entire system's rhythm seamlessly.

#### Contextual Anchors & Component Isolation

- **Algorithmic Self-Governance:** Layout primitives (such as Stacks and Clusters) are designed to be context-independent. They handle their own internal spacing automatically based on the immediate space available, rather than the global screen width.
- **The "Muted" Multiplier:** While mathematical consistency is our foundation, strict lock-step scales can explode exponentially on desktop screens. To prevent oversized layouts in tight spaces, individual components maintain isolation by safely clamping or overriding the scale multiplier (`--scale-ratio`) locally to maintain information density.
- **Division:** To reverse the direction of our scale and calculate our smaller spacing intervals, we use division (e.g. `--s-1: calc(var(--s0) / var(--scale-ratio))`).

### Component Purpose Blueprint

Drafting the exact definitions for our first structural layout primitives, ensuring our documentation explicitly details _why_ a pattern exists rather than just listing its styles. It must demonstrate that every element exists to solve a specific structural problem, completely isolated from any parent environment.

<details>  
<summary><b>🔍 Case Study: Let’s look at the Stack (<l-stack>)</b></summary>

In standard utility frameworks such as Bootstrap, vertical spacing is often managed by adding top or bottom margins directly to individual components (e.g. `mb-3`). This breaks isolation because the component now carries assumptions about what sits next to it.

The **Stack** completely inverts this responsibility. It acts as a structural container that injects uniform vertical spacing between its immediate children, leaving the children entirely unaware of their layout context.

**1. Conceptual Purpose** \* **Problem:** Vertical margin leakage and fragmented spacing rules cause layouts to degrade when components are rearranged or nested.

- **Pattern Solution:** The `<l-stack>` custom element encapsulates layout flow. It strips child elements of their vertical spatial layout footprints and injects a single, consistent structural interval between them.
- **Contextual Rule:** Use the Stack to manage sequential, vertical content flows (e.g., card body text, form fields, or sidebar navigation lists).

**2. Logical Behaviour Map**

To guarantee total component isolation, the Stack operates under three mathematical constraints:

- **Context Neutrality:** It does not force a width or background; it only governs the empty space _between_ its contents.
- **Recursive Multi-Layering:** If a Stack is nested inside another Stack, each maintains its own independent spacing interval via CSS custom properties.
- **The Axiom of the Exception:** It applies spacing exclusively to the _elements that follow a sibling_, ensuring the top and bottom edges of the parent container remain perfectly flush.

**3. Designing the Implementation Logic**

To implement this without relying on complex JavaScript or heavy utility overrides, we can use the **CSS Lobotomised Owl Selector** (`* + *`). This selector targets any element that directly follows another element.

Here is the baseline logic we will use for the Stack primitive:

```css
/* --- The Stack Primitive Logic --- */
l-stack {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

/* Inject spacing only between consecutive elements */
l-stack > * + * {
  margin-block-start: var(
    --space,
    var(--s1)
  ); /* Defaults to scale interval s1 */
}
```

</details>

<p align="right">(<a href="#top">Back to top</a>)</p>

<details>

<summary><b>🔍 Case Study: Let’s look at the Cluster (<l-cluster>)</b></summary>

**Case Study: Let’s look at the Cluster (`<l-cluster>`)**

While the Stack handles vertical flow, the **Cluster** handles horizontal groupings. Traditional utility frameworks often require manual margin classes (e.g., `.mr-2`, `.mb-2`) on inline elements to space them out. When these elements wrap to a new line, those margins "bleed" out of the container, breaking alignment and requiring media queries to fix.

**1. Conceptual Purpose**

- **Problem:** Horizontal groups of elements with varying widths cause margin-bleed at container edges and require fragile media queries to handle wrapping on smaller screens.
- **Pattern Solution:** The `<l-cluster>` relies on intrinsic flexbox wrapping and the CSS `gap` property. It allows elements to group together naturally and wrap to the next line only when they run out of physical space, bypassing screen breakpoints entirely.
- **Contextual Rule:** Use the Cluster for groups of elements that need to sit side-by-side but might need to wrap (e.g., button groups, tag lists, or inline form actions).

**2. Logical Behaviour Map**

- **Content-Driven Wrapping:** The component never forces a fixed width; it relies on the intrinsic width of its children to trigger a reflow.
- **Margin Elimination:** Child elements must be stripped of their own margins. The Cluster dictates the space _between_ them universally.
- **Alignment Agnostic:** It defaults to center-alignment vertically, but allows local overrides via a custom property (`--cluster-align`) for specific edge cases.

**3. Designing the Implementation Logic**

```css
/* --- The Cluster Primitive Logic --- */
l-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(
    --space,
    var(--s1)
  ); /* Manages both horizontal and vertical wrapping space */
  justify-content: flex-start;
  align-items: var(--cluster-align, center);
}
```

</details>

<summary><b>🔍 Case Study: Let’s look at the Sidebar (`<l-sidebar>`)</b></summary>

The "Sidebar" layout isn't just for page navigation; it solves the ubiquitous "fixed element next to a fluid element" problem (e.g., an avatar next to a comment, or an icon next to an input).

**1. Conceptual Purpose**

- **Problem:** Traditional layouts rely on fragile media queries to break side-by-side elements into a vertical stack on mobile devices.

* **Pattern Solution:** The `<l-sidebar>` leverages flexbox wrapping, a minimum content width, and an aggressively high `flex-grow` value on the main content to force a natural, breakpoint-free wrap.
* **Contextual Rule:** Use this whenever you need a rigid structural element (like an image or menu) to sit adjacent to a fluid text or content area.

**2. Logical Behaviour Map**

- **The Greedy Sibling:** The main content area is instructed to grow at an absurdly high rate (`999`), hoarding all available horizontal space.
- **The Tipping Point:** The main content is given a minimum intrinsic width (e.g., `50%`). The exact moment the screen gets too narrow to support that 50%, the layout shatters into a vertical stack.
- **Component Agnostic:** The primitive does not care what is inside it. It only manages the mathematical relationship between the "side" and the "main".

**3. Designing the Implementation Logic**

```css
/* --- The Sidebar Primitive Logic --- */
l-sidebar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space, var(--s1));
}

/* The fixed-width sidebar element */
l-sidebar > :first-child {
  flex-basis: var(--side-width, 15rem);
  flex-grow: 1;
}

/* The fluid main content element */
l-sidebar > :last-child {
  flex-basis: 0;
  flex-grow: 999;
  min-inline-size: var(--main-min-width, 50%);
}
```

</details>

<summary><b>🔍 Case Study: Let’s look at the Grid (`<l-grid>`)</b></summary>

While traditional frameworks use 12-column extrinsic grids requiring classes like `.col-md-4` and `.col-sm-12`, our Grid is an intrinsic primitive that calculates its own column count based on available space.

**1. Conceptual Purpose**

- **Problem:** Hardcoded column grids break when content amounts vary, and they require constant media query maintenance across different device sizes.
- **Pattern Solution:** The `<l-grid>` uses CSS Grid's intrinsic sizing to calculate the maximum number of equal-width columns that can fit in a container, wrapping automatically without breakpoints.
- **Contextual Rule:** Use the Grid for homogenous sibling elements that need to form a responsive, equal-width layout (e.g., product cards, photo galleries, or feature highlights).

**2. Logical Behaviour Map**

- **The Minimum Threshold:** Each column is assigned a minimum viable width. The grid fits as many columns as possible before breaching that minimum.
- **Fractional Expansion:** Any leftover horizontal space is distributed equally among the columns (`1fr`), ensuring the container is always perfectly filled.
- **Overflow Protection:** A mathematical `min()` function ensures that if the container is physically narrower than the minimum column width, the grid safely shrinks to 100% of the container rather than breaking the layout.

**3. Designing the Implementation Logic**

```css
/* --- The Grid Primitive Logic --- */
l-grid {
  display: grid;
  gap: var(--space, var(--s1));
  /* Auto-fits columns based on a minimum width, expanding to fill available space */
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(var(--grid-min, 15rem), 100%), 1fr)
  );
}
```

</details>

<summary><b>🔍 Case Study: Let’s look at the Reel (`<l-reel>`)</b></summary>

When space is at a premium (especially on mobile), stacking elements vertically can create an endlessly long scroll. The Reel solves this by providing a robust, native horizontal scrolling experience without heavy JavaScript carousels.

**1. Conceptual Purpose**

- **Problem:** Standard horizontal overflow on the web feels clumsy, often leaving the user's scroll resting awkwardly halfway between two elements. Heavy JS libraries are typically used to fix this, bloating the codebase.
- **Pattern Solution:** The `<l-reel>` leverages CSS Scroll Snap physics. It creates a horizontal flex container that automatically aligns children to a strict snapping grid when the user finishes swiping.
- **Contextual Rule:** Use the Reel for horizontal media consumption (e.g., movie posters, Instagram-style stories, or horizontal pricing tiers) to preserve vertical screen space.

**2. Logical Behaviour Map**

- **The Overflow Axis:** The container hides vertical overflow but allows horizontal overflow (`overflow-x: auto`).
- **The Snap Mandate:** The container enforces a strict `mandatory` horizontal snap, meaning the scroll cannot rest in a "dead zone" between items.
- **Child Alignment:** Each direct child is told to align its starting edge (`start`) with the starting edge of the scroll container.

**3. Designing the Implementation Logic**

```css
/* --- The Reel Primitive Logic --- */
l-reel {
  display: flex;
  gap: var(--space, var(--s1));
  overflow-x: auto;
  overflow-y: hidden;
  /* Enforce a strict horizontal snapping grid */
  scroll-snap-type: x mandatory;
  /* Prevent focus outlines from being clipped by the hidden overflow */
  padding-block-end: 1rem;
}

/* Instruct children where to snap into place */
l-reel > * {
  scroll-snap-align: start;
}
```

</details>

<summary><b>🔍 Case Study: Let’s look at the Switcher (`<l-switcher>`)</b></summary>

When a horizontal row of items wraps naturally, it often creates awkward intermediate states (e.g., three items on the top row, one lonely item on the bottom row) before finally stacking on mobile screens.

**1. Conceptual Purpose**

- **Problem:** Intrinsic wrapping can leave orphaned elements on new lines, which looks unpolished for primary navigational or action groupings.
- **Pattern Solution:** The `<l-switcher>` acts as a mathematical toggle. It forces elements to remain in a single horizontal row until the container width drops below a specific threshold, at which point it instantly switches all elements into a single vertical stack.
- **Contextual Rule:** Use the Switcher for high-level layouts where intermediary wrapping states are unacceptable (e.g., main site navigation, split hero sections, or primary call-to-action button rows).

**2. Logical Behaviour Map**

- **The Holy Albatross:** The component relies on a CSS `calc()` algorithm. It subtracts 100% of the container's width from a defined `--threshold` variable.
- **The Toggle:** If the result is positive (container is narrow), the `flex-basis` of the children becomes massively wide, forcing a vertical stack. If the result is negative (container is wide), CSS ignores the invalid value, and the children default to `flex-grow: 1`, creating an equal-width row.
- **Orphan Prevention:** It completely eliminates staggered grid states.

**3. Designing the Implementation Logic**

```css
/* --- The Switcher Primitive Logic --- */
l-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space, var(--s1));
}

l-switcher > * {
  flex-grow: 1;
  /* The Mathematical Toggle (The Holy Albatross) */
  flex-basis: calc((var(--threshold, 40rem) - 100%) * 999);
}
```

</details>

### 🎨 Design Tokens (The Visual Layer)

While the layout primitives handle the invisible structure, Design Tokens handle the visible aesthetic. To ensure maximum maintainability and effortless theming, we rely exclusively on a **Semantic Colour Palette**.

**1. Conceptual Purpose**

- **Problem:** Hardcoding literal colors (e.g., `--blue-500`) makes rebranding and dark-theme implementations tedious, requiring manual updates across dozens of components.
- **Pattern Solution:** Colours are named strictly by their _structural purpose_ in the UI rather than their visual hue.
- **Contextual Rule:** Never use literal colour names or hardcoded hex values in component CSS. Always route styling through a semantic token.

**2. The Semantic Token Matrix**

```css
:root {
  /* Surfaces & Backgrounds */
  --color-surface-base: #ffffff;
  --color-surface-sunken: #f4f4f5;
  --color-surface-raised: #ffffff;

  /* Typography */
  --color-text-base: #18181b;
  --color-text-muted: #71717a;
  --color-text-inverted: #ffffff;

  /* Actions & Borders */
  --color-action-primary: #0070f3;
  --color-border-subtle: #e4e4e7;
}

/* --- Dark Mode Override --- */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-base: #18181b;
    --color-text-base: #ffffff;
  }
}
```

## 5. <a name="features"></a> ✨ Core Features & UI Overhauls

<p align="right">(<a href="#top">Back to top</a>)</p>

---

## 6. <a name="deployment"></a> 🌐 Deployment Guide

### Deployment Steps

To deploy the site to GitHub Pages, the following steps were executed:

### Local Deployment (Cloning)

To run this project locally on your own machine:

### ⚡ Quick Local Spin-Up Alternatives

<p align="right">(<a href="#top">Back to top</a>)</p>

---

## 7. <a name="credits"></a> 🤝 Credits & Acknowledgements

### AI Pair Programming & Academic Integrity

Artificial Intelligence (LLMs) was utilised strictly as a "Pair Programmer" and strict linter throughout the development lifecycle to accelerate cross-browser debugging, reflow profiling, and formatting, ensuring absolute human ownership and comprehension of the overarching engine code.

### Technologies Used

- **HTML5:** Semantic accessible markup layout layer.
- **CSS3:**
- **JavaScript (ES6+):**
- **Inline SVG:**
- **Git & GitHub:** Atomic source control and cloud distribution.

### 📂 Repository Structural Layout

<p align="right">(<a href="#top">Back to top</a>)</p>

---

## 8. <a name="dev-log"></a>🏗️ Development Log & Engineering Phases

### Phase 0 (Foundational Tokens)

Marijn Haverbeke notes in _Eloquent JavaScript_ that uninteresting details should be handled gracefully by our underlying language constructs. In CSS, this means assigning our architectural constants to the highest global reach possible: the `:root` pseudo-class.

<details>  
<summary><b>🔍 Expand Engineering Case Study: Phase 0</b></summary>

To create true visual harmony, we will derive our spatial tokens from a **Modular Scale**.

Let's pick a **Perfect Fifth** ratio (1.5) as our denominator:

```css
/* ==========================================================================  
   LOOSELEAF UI: REBOOT & SYSTEM TOKENS (Phase 0)  
   ========================================================================== */

:root {
  /* --- The Harmonic Ratio --- */
  --ratio: 1.5;

  /* --- Typographic & Spacing Scale (Modular) --- */
  --s-2: calc(var(--s-1) / var(--ratio));
  --s-1: calc(var(--s0) / var(--ratio));
  --s0: 1rem; /* The Baseline Tonic */
  --s1: calc(var(--s0) * var(--ratio)); /* 1.5rem */
  --s2: calc(var(--s1) * var(--ratio)); /* 2.25rem */
  --s3: calc(var(--s2) * var(--ratio)); /* 3.375rem */
  --s4: calc(var(--s3) * var(--ratio)); /* 5.063rem */

  /* --- Layout & Measure Constraints --- */
  --measure: 60ch; /* Maximum readable text boundary */
  --gutter-base: var(--s1);
}

/* --- Strict Global Reboot --- */
* {
  box-sizing: border-box; /* Enforce border-box model universally */
  margin-block: 0; /* Strip default vertical margins to prevent leakage */
}

html,
body {
  max-inline-size: none; /* Frame containers bypass global measure constraints */
  font-family: sans-serif; /* Global typography declaration */
  line-height: 1.5; /* Text line-height denominator */
}

/* --- Universal Measure Constraints --- */
p,
li,
h1,
h2,
h3,
h4,
h5,
h6,
figcaption {
  max-inline-size: var(
    --measure
  ); /* Restrict lines from stretching past reading comfort */
}
```

</details>

### Phase 1: Algorithmic Layout & Primitive Composition

<details>  
<summary><b>🔍 Expand Engineering Case Study: Phase 1</b></summary>

</details>

### Phase 2:

<details>  
<summary><b>🔍 Expand Engineering Case Study: Phase 2</b></summary>

</details>

<p align="right">(<a href="#top">Back to top</a>)</p>

---

## 9. <a name="testing"></a> 🧪 Testing & Quality Assurance Portfolio

This section outlines the holistic verification suite executed to guarantee the engineering integrity, mathematical precision, and cross-platform accessibility of…

### 1. Manual Testing Matrix (Boundary Explorations)

### 2. User Story Testing (Behavior-Driven Verification)

Verification of core target audience features mapped back to the primary user requirements.

### 3. Validator Testing

- **W3C HTML Validator:** \* **W3C CSS Validator:**

### 4. Lighthouse Testing

### 5. Browser Compatibility

Cross-origin audio context rendering pipelines were explicitly verified across major rendering engines:

### 6. Responsiveness Testing

### 7. Automated End-to-End Testing

### 8. Bugs Fixed (Sprint Log)

### 9. Known Issues

<p align="right">(<a href="#top">Back to top</a>)</p>
