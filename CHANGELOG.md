# Changelog

All notable changes to LooseLeaf UI and `django-looseleaf`, which share one version. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org/) as described in the README.

## [Unreleased]

### Added

- `looseleaf-ui compile <design-tokens.json> --out <dir>` command line (`npx looseleaf-ui …` once the package is on npm): writes `looseleaf-tokens.css` and `tokens.resolved.json` exactly as the configurator's Theme bundle does, for builds and CI pipelines.
- The npm package `looseleaf-ui` is published by the release workflow alongside `django-looseleaf`.
- `CHANGELOG.md`; each GitHub release now takes its notes from the matching section here.
- [docs/CONFIGURATOR.md](docs/CONFIGURATOR.md): a walkthrough of the token configurator with screenshots, linked from both READMEs.
- Browser tests (`npm run test:browser`, Playwright): axe-core WCAG 2.2 AA checks on the demo in both schemes and on the configurator, and full-page visual regression of the demo at 360, 768 and 1280 px in light and dark, run in CI.

### Fixed

- Muted text (`--color-text-muted`) now meets WCAG AA on sunken surfaces in the light scheme: it uses `neutral.600` (about 7:1 on `--color-surface-sunken`) instead of `neutral.500` (4.24:1). The contrast report and the configurator's contrast table now include this pairing.
- The demo's scrolling `.reel` is keyboard-focusable, and the README and the composition's comments say how to make any scrolling reel accessible.

### Changed

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

[Unreleased]: https://github.com/StockoL/looseleaf-ui/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/StockoL/looseleaf-ui/releases/tag/v2.0.0
