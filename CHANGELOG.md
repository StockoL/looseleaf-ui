# Changelog

All notable changes to LooseLeaf UI and `django-looseleaf`, which share one version. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/) as described in the README.

## [Unreleased]

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

[Unreleased]: https://github.com/StockoL/looseleaf-ui/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/StockoL/looseleaf-ui/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/StockoL/looseleaf-ui/releases/tag/v2.0.0
