# Browser support

LooseLeaf has two tiers.

- **Baseline:** Chrome 117, Safari 17.4 (iOS and iPadOS 17.4) and Firefox 129. Everything renders and works correctly in these browsers. Cascade layers, container queries, `:has()`, `color-mix()`, `@starting-style` and exclusive `<details name>` accordions are all used freely.
- **Enhanced:** newer features that make the same page smoother. Each one is fenced, by `@supports` in CSS or a feature check in script, so a browser without it gets the Baseline rendering. Nothing ever requires the Enhanced tier.

**The policy.** A feature ships when it is an enhancement with a complete fallback, not when it reaches some share of browsers. If the page is whole without it, it can be used the day one browser has it. If the page would break without it, it waits for Baseline. This follows Josh Comeau's [framework for evaluating browser support](https://www.joshwcomeau.com/css/browser-support/).

Every enhancement in the motion layer (`src/05-motion/`) also stops for reduced motion: the operating system's setting, or `data-motion="reduced"` on `<html>`. Both set `--motion-scale` to 0, and every duration in LooseLeaf is multiplied by it.

## Enhancements

First version with support, by engine. "No" means no stable release supports it yet.

| Enhancement | Feature | Chrome | Safari | Firefox | Without it |
| --- | --- | --- | --- | --- | --- |
| Dialog entrances and exits (`entrances.css`) | `@starting-style` with `transition-behavior: allow-discrete` | 117 | 17.5 | 129 | Dialogs open and close instantly. Menus keep their keyframe entrance, which is Baseline. |
| Press feedback (`press.css`) | `scale` transition on `:active` | Baseline | Baseline | Baseline | (always available) |
| Accordion height (`height.css`) | `interpolate-size: allow-keywords` | 129 | No | No | The 0fr to 1fr grid trick on `::details-content` (Chrome 131, Safari 18.4, Firefox 143). Older browsers open and close instantly. |
| Page transitions (opt-in, `$motion.pageTransition`) | Cross-document view transitions, `@view-transition` | 126 | 18.2 | No | Pages load as usual. Off by default: in Chromium, a form that submits back to its own page can leave the transition unfinished and the page unclickable, so a theme turns it on knowingly. |
| Scroll reveal (`reveal.css`, opt-in with `[data-reveal]`) | Scroll-driven animations, `animation-timeline: view()` | 115 | 26 | Behind a setting | The element is simply visible; it is never hidden by default. |
| Stuck navbar (`stuck.css`) | `scroll-state(stuck: top)` container queries | 133 | No | No | The sticky navbar keeps its size. |
| Lift (`lift.css`) | `translate` transition on `:hover` | Baseline | Baseline | Baseline | Only on devices that hover. |
| Glass navbar (`glass.css`, opt-in with `[data-glass]`) | `backdrop-filter` | 76 | 18 (9 with `-webkit-`) | 103 | An opaque navbar. |
| Theme reveal (`page.css`, `theme.js`) | Same-document view transitions | 111 | 18 | 144 | The theme changes at once. |
| Staggered reveal (`micro.css`, `[data-reveal-stagger]`) | `sibling-index()` | 138 | Unconfirmed | Unconfirmed | Each child's authored `--i`; without that, all reveal together. |
| Prose line breaking (`prose.css`) | `text-wrap: pretty` | 117 | 26 | No | Normal wrapping. |
| Field errors without script (`field.css`) | `:user-invalid` | 119 | 16.5 | 88 | `form-feedback.js` marks the field, or the browser's own validation on submit. |
| Native switch (`choice.css`, `[data-variant="switch"]`) | `<input type="checkbox" switch>` | No | 17.4 | No | The drawn track and thumb. |
| Dialog buttons without the script | Invoker Commands, `commandfor` and `command` | 135 | 26.2 | 144 | `looseleaf.js` reads the same attributes. With no script either, a dialog can't open, so any dialog holding content needs a second route (see the README). |

## Spring easing

`--ease-spring` is a `linear()` curve simulated from `$motion.spring`. `linear()` is in Chrome 113, Safari 17.2 and Firefox 112, all older than Baseline, so it needs no fallback.

## Checking a browser

The demo's **Motion** section, [examples/index.html](../examples/index.html#motion), reports which enhancements the current browser runs.

Subgrid (`.grid[data-subgrid]`) is Baseline (Chrome 117, Safari 16, Firefox 71) and needs no fallback.

Versions were checked in October 2026 against caniuse, MDN and the browsers' release notes. Firefox in particular is still adding several of these, so check again before relying on a "No".
