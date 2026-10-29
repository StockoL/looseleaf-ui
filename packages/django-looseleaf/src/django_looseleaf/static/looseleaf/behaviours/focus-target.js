/*! LooseLeaf UI v2.2.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
/**
 * LooseLeaf UI - In-page links
 * Why script: following an in-page link scrolls (smoothly, from CSS) but leaves
 * focus behind, so keyboard and screen reader users start again from the top.
 * Nothing native moves focus to the target or closes the menu or dialog the
 * link was in.
 * Without it: the browser scrolls to the target; focus stays where it was.
 * Hooks: a[href^="#"]
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.focus-target");
  if (window[GUARD]) return;
  window[GUARD] = true;

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element && event.target.closest('a[href^="#"]:not([href="#"])');
    if (!link) return;
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;

    link.closest("dialog[open]")?.close();
    const navToggle = link.closest(".navbar")?.querySelector("details.navbar__toggle[open]");
    if (navToggle) navToggle.open = false;

    // Non-interactive targets need tabindex="-1" to take focus
    if (!target.matches("a[href], button, input, select, textarea, summary, [tabindex]")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
})();
