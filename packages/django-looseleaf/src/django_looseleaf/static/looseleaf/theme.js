/*! LooseLeaf UI v2.1.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
/**
 * LooseLeaf UI - Theme and motion
 * Load in <head> as a blocking script (or inline it) so the stored choices are
 * on <html> before first paint.
 *
 * Its first act is the data-js marker on <html>: CSS may hide something
 * because a script will reveal it only under [data-js].
 *
 * Theme: <button type="button" data-theme-toggle>Theme: <span data-theme-label>Auto</span></button>
 * Each click cycles auto -> light -> dark. aria-pressed reports whether dark
 * is forced ("mixed" while following the OS), and the label names the state.
 * "auto" removes data-theme and follows the OS.
 *
 * Motion: <button type="button" data-motion-toggle>Motion: <span data-motion-label>On</span></button>
 * Each click switches between following the OS and reducing motion on this
 * site, which sets data-motion="reduced" (every duration becomes 0).
 * aria-pressed is true while motion is reduced.
 */

(() => {
  "use strict";

  const root = document.documentElement;
  root.setAttribute("data-js", "");

  const THEME_KEY = "theme";
  const THEMES = ["auto", "light", "dark"];
  const THEME_LABELS = { auto: "Auto", light: "Light", dark: "Dark" };
  const THEME_PRESSED = { auto: "mixed", light: "false", dark: "true" };
  const MOTION_KEY = "motion";

  function read(key, allowed, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return allowed.includes(stored) ? stored : fallback;
    } catch {
      return fallback; // storage blocked: follow the OS
    }
  }

  function store(key, value, fallback) {
    try {
      if (value === fallback) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* not persisted, but still applied for this page */
    }
  }

  let theme = read(THEME_KEY, THEMES, "auto");
  let motion = read(MOTION_KEY, ["reduced"], "auto");

  function apply() {
    if (theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = theme;
    if (motion === "reduced") root.dataset.motion = "reduced";
    else delete root.dataset.motion;
  }

  function sync() {
    document.querySelectorAll("[data-theme-toggle]").forEach((toggle) => {
      toggle.setAttribute("aria-pressed", THEME_PRESSED[theme]);
      toggle.setAttribute("aria-label", `Colour theme: ${THEME_LABELS[theme]}. Activate to change.`);
      toggle.querySelectorAll("[data-theme-label]").forEach((label) => (label.textContent = THEME_LABELS[theme]));
    });
    document.querySelectorAll("[data-motion-toggle]").forEach((toggle) => {
      toggle.setAttribute("aria-pressed", String(motion === "reduced"));
      toggle.querySelectorAll("[data-motion-label]").forEach((label) => (label.textContent = motion === "reduced" ? "Reduced" : "On"));
    });
  }

  // Runs immediately: no flash of the wrong scheme, no animation the visitor turned off
  apply();

  const GUARD = Symbol.for("looseleaf.theme");
  if (window[GUARD]) return;
  window[GUARD] = true;

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("[data-theme-toggle]")) {
      theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
      store(THEME_KEY, theme, "auto");
    } else if (event.target.closest("[data-motion-toggle]")) {
      motion = motion === "reduced" ? "auto" : "reduced";
      store(MOTION_KEY, motion, "auto");
    } else {
      return;
    }
    apply();
    sync();
  });

  // Keep other open tabs in step
  window.addEventListener("storage", (event) => {
    if (event.key !== THEME_KEY && event.key !== MOTION_KEY && event.key !== null) return;
    theme = read(THEME_KEY, THEMES, "auto");
    motion = read(MOTION_KEY, ["reduced"], "auto");
    apply();
    sync();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync, { once: true });
  else sync();
})();
