/*! LooseLeaf UI v2.2.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
/**
 * LooseLeaf UI - Password reveal
 * Why script: no attribute lets a visitor see what they typed in a password
 * field; it means switching the input's type.
 * Without it: an ordinary password field. The button is added by this script,
 * so there is never a button that does nothing.
 * Hooks: .input-group > input[type=password][data-reveal-password]
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.password-reveal");
  if (window[GUARD]) return;
  window[GUARD] = true;

  let uid = 0;

  function enhance(input) {
    if (input.dataset.revealReady !== undefined) return;
    input.dataset.revealReady = "";
    input.id ||= `ll-password-${++uid}`;
    const button = document.createElement("button");
    button.className = "button";
    button.type = "button";
    button.textContent = "Show";
    button.setAttribute("aria-label", "Show password");
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-controls", input.id);
    button.dataset.revealFor = input.id;
    input.after(button);
  }

  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element && event.target.closest("[data-reveal-for]");
    const input = button && document.getElementById(button.dataset.revealFor);
    if (!input) return;
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    // The label stays "Show" (it must contain the visible text); aria-pressed carries the state
    button.setAttribute("aria-pressed", String(reveal));
  });

  // Back to a password field before the form submits, so browsers offer to save it
  document.addEventListener("submit", (event) => {
    event.target.querySelectorAll?.("input[data-reveal-password]").forEach((input) => (input.type = "password"));
  });

  const start = () => document.querySelectorAll("input[type=password][data-reveal-password]").forEach(enhance);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
