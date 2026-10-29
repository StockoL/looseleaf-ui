# Changelog

All notable changes to LooseLeaf UI and `django-looseleaf`, which share one version. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/) as described in the README.

## [Unreleased]

### Added

- `.skeleton` block: text, title, avatar and block placeholder shapes with a shimmer that stops under reduced motion.
- `.progress` block: native `<progress>` (including indeterminate) and `<meter>`, styled.
- `.choice[data-variant="switch"]`: a switch with `.choice__thumb`, using Safari's native `switch` where it exists; the thumb squashes while pressed.
- `:user-invalid` field styling: a field shows its error once it has been left, with no script. `form-feedback.js` still writes the message and sets `aria-invalid`.
- `.clamp` utility (`--clamp-lines`, default 3).
- The done state, `.button[data-state="done"]`: a checkmark draws in place of the label. `done-state.js` sets it after `[data-done-on="submit"]`, `[data-done-on="request"]` (htmx) or the `looseleaf:done` event, and copy buttons use it.
- `sound.js`: opt-in interface sounds, synthesised or from your own files, on activation only. They need the site's `data-sound` and the visitor's `[data-sound-toggle]` (in `theme.js`, off by default), and never play without a toggle on the page. `--sound-volume` token.
- `{% looseleaf_html_attrs %}` and `LOOSELEAF_SOUNDS` in `django-looseleaf`.
- The README's rule that every loading state goes with `aria-busy`, and why drag and drop and haptics are not included.

### Changed

- Copy buttons show the done state (a checkmark) instead of swapping to a "Copied" label. The `data-state="copied"` label swap is deprecated and removed in 3.0.
- The spring easing aims for about 25 points (at most 40), and a spring too loose to settle is clamped to a damping ratio of 0.1; the Motion panel says when.
- The configurator's Copy link button uses the done state.

## [2.3.0] - 2026-10-29

### Added

- Layered, tinted shadows derived from a new `$shape.shadow` input (strength, softness, light direction) and the neutral hue: `--shadow-color`, and `--shadow-raised` (cards, focused inputs), the new `--shadow-floating` (menus, toasts, lifted cards) and `--shadow-overlay` (dialogs), with three, four and five layers. The configurator's Shape panel has Shadow strength, Shadow softness and Light from controls.
- `glass.css`: `.navbar[data-glass]`, a translucent, blurred navbar whose blur reaches below its edge.
- `micro.css`:
  - `.badge[data-pulse]` and `.badge[data-bump]`;
  - `[data-underline="slide"]` on links;
  - `[data-reveal-stagger]`;
  - the focus ring easing in;
  - `[data-dropped]` for drag libraries;
  - the theme toggle's sun and moon trading places.
- Theme reveal: `theme.js` changes the theme inside a view transition, and the new theme grows as a circle from the toggle.
- `.grid[data-subgrid]`: items take their rows from the grid, so titles, bodies and footers line up across a row.
- `.badge[data-interactive]` gets press feedback.
- `--scheme-dark` token: 0 in the light scheme, 1 in the dark, for CSS that calculates with the scheme.
- `.prose`: numbered list markers that line up, and `text-wrap: pretty` paragraphs where supported.
- `docs/SUPPORT.md` states the support policy and lists the new enhancements.
- The demo navbar is sticky and glass, with sliding underlines; the Motion section reports the glass and theme reveal.

### Changed

- Alerts, toasts and menus enter on partial keyframes (`ll-enter`; menus grow from their trigger with `ll-grow`), which more specific rules and inline styles can't cancel; `@starting-style` is kept for dialogs.
- Lift uses standard easing instead of the spring, and fades in a `::after` shadow instead of animating `box-shadow`. `.anim-lift` no longer scales.
- `.card` no longer clips its content (`overflow: hidden`): flush media rounds its own corners, so a lifted card's shadow and a floating badge both show.
- Cards carry `--shadow-raised` at rest; menus and toasts use `--shadow-floating`.
- A page with a sticky navbar gets a matching `scroll-padding`, so in-page links land below it.
- A glass navbar doesn't take the page transition's `view-transition-name` (it would stop the blur from seeing the page), so it fades with the page.

## [2.2.0] - 2026-10-29

### Added

- A **Motion** panel in the configurator, replacing the motion half of "Shape and motion":
  - Calm, Snappy and Playful presets.
  - A spring designer: mass, stiffness and damping sliders with a live curve plot and a swatch that bounces along the curve.
  - Durations, standard easing, press scale and lift distance.
  - Switches for scroll reveal, page transitions and the compact sticky navbar.
  - It exports tokens only, never scripts.
- `$motion` in `design-tokens.json`, an input like `$utopia` and `$palette`. `--duration-quick`, `-base` and `-slow`, `--ease-spring`, `--press-scale` and `--lift-distance` are derived from it, as are three new tokens:
  - `--duration-spring`: the spring's settle time.
  - `--duration-page`: `0ms` with page transitions off.
  - `--reveal-animation` and `--navbar-stuck-padding`: carry the other two switches.
- `scripts/spring.mjs`: simulates a damped spring and emits it as a CSS `linear()` easing of at most 40 points.
- A Motion playground in the demo: a button to press, a menu, a dialog and a badge that lifts.
- `.tabs` block and `tabs.js`: a jump list of in-page links without JavaScript; with it, a tab list with roles, a roving tabindex and arrow, Home and End keys.
- `.toast` block and `toast.js`: toasts in a `.toast-region` that float in the top layer (inside an open modal, so they stay usable), dismiss themselves after five seconds unless danger, pause on hover and focus, and queue beyond three. Create them with `[data-toast]` or the `looseleaf:toast` event. Without JavaScript the region reads like alerts in the page.
- `form-feedback.js`: native validation messages written into `.field__error` when a changed field is left, corrected while typing, and on submit with focus on the first problem; `[data-maxlength-counter]` counts the characters left. Forms with `novalidate` are left alone.
- `password-reveal.js`: `input[type=password][data-reveal-password]` gets a Show button with `aria-pressed`, added by the script so it never appears without it.
- `[data-motion-toggle]` in `theme.js`: reduces motion on the site (`data-motion="reduced"`), remembered like the theme.
- `{% ll_messages style="toast" %}` in `django-looseleaf`.
- Each behaviour is published on its own in `dist/behaviours/` (and the Django package's `static/looseleaf/behaviours/`) for selective import; `looseleaf.js` still joins them all.
- Browser tests for the keyboard and screen reader contracts of tabs, toasts, form feedback, password reveal and the motion toggle.

### Changed

- `--ease-spring` is a `linear()` spring curve instead of a `cubic-bezier()`.
- `src/scripts/behaviors.js` is split into one module per concern in `src/scripts/behaviours/`, each with a header saying why it needs JavaScript and what happens without it. The demo loads `dist/looseleaf.js`.
- A theme without `$motion` (exported from 2.1 or earlier) keeps its explicit motion tokens; the configurator moves them into `$motion` the first time the Motion panel is used.

## [2.1.0] - 2026-10-29

### Added

- `looseleaf-ui compile <design-tokens.json> --out <dir>` command line (`npx looseleaf-ui …` once the package is on npm): writes `looseleaf-tokens.css` and `tokens.resolved.json` exactly as the configurator's Theme bundle does, for builds and CI pipelines.
- The npm package `looseleaf-ui` is published by the release workflow alongside `django-looseleaf`.
- `CHANGELOG.md`; each GitHub release now takes its notes from the matching section here.
- [docs/CONFIGURATOR.md](docs/CONFIGURATOR.md): a walkthrough of the token configurator with screenshots, linked from both READMEs.
- A `motion` cascade layer (`src/05-motion/`) between `blocks` and `utilities`. Every file is an enhancement, fenced by `@supports` or the reduced-motion switches:
  - `entrances.css`: menus drop in; dialogs and drawers animate in with `--duration-enter` and out with `--duration-exit` and `--ease-out-expo`.
  - `press.css`: buttons and choices shrink to `--press-scale` while pressed.
  - `height.css`: accordion items animate with `interpolate-size` where supported, and the grid trick elsewhere.
  - `page.css`: cross-document view transitions between same-site pages; a sticky navbar holds still.
  - `reveal.css`: opt-in `[data-reveal]` fades elements in as they scroll into view, by `--reveal-distance`.
  - `stuck.css`: a sticky navbar compacts once stuck, through `--navbar-padding`.
  - `lift.css`: `.anim-lift` (moved here from the utilities) and the new `.card[data-interactive]` rise by `--lift-distance`.
- Motion master switches: every duration is `calc(var(--duration-x) * var(--motion-scale))`, and both `prefers-reduced-motion: reduce` and `data-motion="reduced"` on `<html>` set `--motion-scale` to 0. `npm run check` rejects a duration without it, and a browser test asserts that both switches leave no duration on the demo.
- Tokens: `--duration-enter`, `--duration-exit`, `--ease-out-expo`, `--press-scale`, `--lift-distance`, `--reveal-distance`.
- [docs/SUPPORT.md](docs/SUPPORT.md): the Baseline and Enhanced browser tiers, with first-support versions and the fallback for each enhancement.
- A Motion section in the demo that reports which enhancements the current browser runs.
- `npm run test:nojs` and a CI job: with JavaScript disabled, every nav link and dropdown item is reachable at 360 and 1280 px, the accordion opens, the form submits, nothing interactive is hidden, and every link inside a dialog is also reachable outside one.
- README section "Crediting LooseLeaf UI in your project": a copy-pasteable description for a site's credits page, and a one-line footer version.
- `theme.js` sets `data-js` on `<html>` as its first act, so CSS can tell when scripts run.
- Browser tests (`npm run test:browser`, Playwright): axe-core WCAG 2.2 AA checks on the demo in both schemes and on the configurator, and full-page visual regression of the demo at 360, 768 and 1280 px in light and dark, run in CI.

### Fixed

- Muted text (`--color-text-muted`) now meets WCAG AA on sunken surfaces in the light scheme: it uses `neutral.600` (about 7:1 on `--color-surface-sunken`) instead of `neutral.500` (4.24:1). The contrast report and the configurator's contrast table now include this pairing.
- The demo's scrolling `.reel` is keyboard-focusable, and the README and the composition's comments say how to make any scrolling reel accessible.

### Changed

- `.dropdown` is a native `<details class="dropdown-wrapper">` with a `<summary>` trigger, so it opens with no JavaScript. `looseleaf.js` adds Escape, outside-click and focus-out closing, arrow keys and one open menu at a time. The `role="menu"` roles are gone: without the script the menu is a disclosure, not an ARIA menu.
- The collapsed `.navbar` menu is opened by an empty `<details class="navbar__toggle">` before `.navbar__menu`, shown through `.navbar:has()`, so it works with no JavaScript. Give its `<summary>` `aria-label` and `aria-controls`.
- Modals and drawers open with Invoker Commands (`commandfor="id" command="show-modal"`, `command="close"`). `looseleaf.js` supplies the same attributes in browsers without them, and still closes a dialog on a backdrop click.
- `.navbar`'s vertical padding moved from the navbar to its children, as `--navbar-padding`, so a container query on the navbar can change it. With the usual single `.wrapper` child it looks the same.
- `.anim-lift` rises by `--lift-distance` (default `--space-3xs`, was `--space-2xs`) and no longer sets `will-change`.
- Dismissing an alert with motion switched off removes it at once instead of after a one-second fallback.
- In-page links scroll smoothly from CSS (`scroll-behavior`, only without reduced motion); `looseleaf.js` now only moves focus to the target.

- `dist/looseleaf.css`, `looseleaf.js` and `theme.js` open with a one-line MIT licence notice (version, copyright, repository), the only thing the licence asks users to keep.

### Deprecated

- The 2.0 scripted markup still works through 2.x and logs one console warning per kind; it is removed in 3.0: `<div class="dropdown-wrapper">` with `[data-toggle="dropdown"]`, `<button class="navbar__toggle">`, and `[data-open-dialog]` / `[data-close-dialog]`.

- README: the browser baseline spells out that iOS and iPadOS 16 and earlier are not supported, and the versioning section explains what happens to a theme bundle across a major version.

## [2.0.0] - 2026-10-27

The first release of v2: a ground-up rework into a token-driven foundation, a token configurator, and a Django package.

### Added

- **Design tokens as inputs.** `design-tokens.json` stores Utopia settings (`$utopia`) and OKLCH palette inputs (`$palette`); type steps, spacing, colour ramps and light/dark status colours are derived at build time. Three tiers: raw, semantic (purpose-named, the only tier blocks use) and component.
- **Dark mode.** Follows `prefers-color-scheme`, with `data-theme="light|dark"` to force one and `theme.js` to persist the choice without a flash.
- **Token configurator** (`tools/configure.html`, also hosted on GitHub Pages): live preview of the real demo at any viewport width in both schemes, a WCAG contrast table, and exports of the token source, the compiled tokens CSS, or a theme bundle (`looseleaf-theme.zip`).
- **Compositions:** `.region`, `.frame`; `.bento` moved here with intrinsic columns; `.sidebar` gains `[data-side="right"]`, `[data-sticky]` and `--sidebar-align`; `.cluster` gains `--cluster-space`.
- **Blocks:** `.skip-link`, `.field`, `.select`, `.textarea`, `.choice` (and segmented `.choice-group`), `.input-group`, `.table`, `.prose`, `.pagination`, `.breadcrumb`, `.swatch`; button variants, sizes, disabled, loading and copied states; dropdown `[data-align="end"]`; sticky navbar.
- **Utilities:** `.icon`, `.text-small`, `.text-lead`, `.bg-gradient`, and a `[hidden]` rule that works on every block.
- **Behaviours:** keyboard support for dropdowns (arrows, Home, End, Escape), `aria-controls` wiring, focus management for in-page links, and announced copy buttons.
- **`django-looseleaf`** on PyPI: template tags for the head, theme, tokens, pagination and messages; a form renderer that outputs LooseLeaf markup with ARIA wiring and mobile keyboard hints; project themes via `LOOSELEAF_THEME`; system checks.
- Touch and mobile safeguards: 44px targets, hover styles only on hover devices, `dvh`, safe-area insets, contained overscroll.
- Tooling: `npm run check` guardrail linter, unit tests, CI, tag-driven releases with PyPI trusted publishing, and `npm run bump` for lockstep versions.

### Changed

- **Breaking:** every v1 custom property name (`--colors-*`, `--spacing-*`, `--typography-*`, `--transitions-*`, `--layout-*`, `--fonts-*`) is replaced by the v2 token names.
- **Breaking:** `.card` no longer has padding; put content in `.card__body`. Media placed directly in a card sits flush.
- **Breaking:** the accordion is built on native `<details name="…">` instead of buttons and JavaScript.
- **Breaking:** the navbar menu owns its layout (no inner `.cluster`) and collapses on its own width with a container query.
- Andy Bell's "A (more) Modern CSS Reset" replaces the old reset; layout responds to container width only, with no viewport media queries.
- The bundled stylesheet is `dist/looseleaf.css` (was `dist/styles.css`).

### Fixed

- The skip link is visible when focused.
- Modals and offcanvas drawers animate in and out.
- A floating badge on a card is no longer clipped.
- No block removes the focus outline.

[Unreleased]: https://github.com/StockoL/looseleaf-ui/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/StockoL/looseleaf-ui/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/StockoL/looseleaf-ui/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/StockoL/looseleaf-ui/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/StockoL/looseleaf-ui/releases/tag/v2.0.0
