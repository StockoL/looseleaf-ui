/**
 * LooseLeaf UI - Theme
 * Load in <head> as a blocking script (or inline it) so the stored choice is on
 * <html> before first paint. "auto" removes data-theme and follows the OS.
 *
 * Toggle: <button type="button" data-theme-toggle>Theme: <span data-theme-label>Auto</span></button>
 * Each click cycles auto -> light -> dark. aria-pressed reports whether dark
 * is forced ("mixed" while following the OS), and the label names the state.
 *
 * Its first act is the data-js marker on <html>: CSS may hide something
 * because a script will reveal it only under [data-js].
 */

(() => {
  "use strict";

  const KEY = "theme";
  const ORDER = ["auto", "light", "dark"];
  const LABELS = { auto: "Auto", light: "Light", dark: "Dark" };
  const PRESSED = { auto: "mixed", light: "false", dark: "true" };
  const root = document.documentElement;
  root.setAttribute("data-js", "");

  function read() {
    try {
      const stored = localStorage.getItem(KEY);
      return ORDER.includes(stored) ? stored : "auto";
    } catch {
      return "auto"; // storage blocked: follow the OS
    }
  }

  let current = read();

  function apply(theme) {
    current = theme;
    if (theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }

  function sync() {
    document.querySelectorAll("[data-theme-toggle]").forEach((toggle) => {
      toggle.setAttribute("aria-pressed", PRESSED[current]);
      toggle.setAttribute("aria-label", `Colour theme: ${LABELS[current]}. Activate to change.`);
      toggle.querySelectorAll("[data-theme-label]").forEach((label) => (label.textContent = LABELS[current]));
    });
  }

  // Runs immediately: no flash of the wrong scheme
  apply(current);

  const GUARD = Symbol.for("looseleaf.theme");
  if (window[GUARD]) return;
  window[GUARD] = true;

  document.addEventListener("click", (event) => {
    const toggle = event.target instanceof Element && event.target.closest("[data-theme-toggle]");
    if (!toggle) return;
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* not persisted, but still applied for this page */
    }
    apply(next);
    sync();
  });

  // Keep other open tabs in step
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    apply(read());
    sync();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync, { once: true });
  else sync();
})();
