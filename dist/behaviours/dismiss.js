/*! LooseLeaf UI v2.3.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
/**
 * LooseLeaf UI - Dismissible alerts
 * Why script: removing an element from the page needs script; no attribute does it.
 * Without it: the alert stays readable; only the close button does nothing.
 * Hooks: .alert__close inside an .alert
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.dismiss");
  if (window[GUARD]) return;
  window[GUARD] = true;

  // Animate out, then remove (with a fallback if no transition runs)
  function dismissAlert(alert) {
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      alert.remove();
    };
    alert.dataset.state = "removing";
    // With motion off every duration is 0 and no transitionend will come
    if (getComputedStyle(alert).transitionDuration.split(",").every((d) => parseFloat(d) === 0)) return remove();
    alert.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, 1000);
  }

  document.addEventListener("click", (event) => {
    const close = event.target instanceof Element && event.target.closest(".alert__close");
    const alert = close && close.closest(".alert");
    if (alert) dismissAlert(alert);
  });
})();
