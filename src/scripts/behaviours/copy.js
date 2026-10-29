/**
 * LooseLeaf UI - Copy to clipboard
 * Why script: writing to the clipboard needs the Clipboard API.
 * Without it: the text is on the page to select and copy by hand.
 * Hooks: [data-copy="text"] (optional data-copy-message), announced politely.
 *        On success the button takes the done state (a checkmark), as done-state.js does.
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.copy");
  if (window[GUARD]) return;
  window[GUARD] = true;
  if (!navigator.clipboard) return;

  // One polite live region, created on first use
  let liveRegion = null;
  function announce(message) {
    if (!liveRegion) {
      liveRegion = document.createElement("div");
      liveRegion.className = "visually-hidden";
      liveRegion.setAttribute("role", "status");
      liveRegion.setAttribute("aria-live", "polite");
      document.body.append(liveRegion);
    }
    liveRegion.textContent = "";
    // A fresh text node on the next frame re-announces repeated messages
    requestAnimationFrame(() => (liveRegion.textContent = message));
  }

  const timers = new WeakMap();
  const CHECK = '<svg class="icon" data-done-icon viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5" /></svg>';
  async function copy(trigger) {
    try {
      await navigator.clipboard.writeText(trigger.dataset.copy);
      if (!trigger.querySelector("[data-done-icon]")) trigger.insertAdjacentHTML("beforeend", CHECK);
      trigger.dataset.state = "done";
      announce(trigger.dataset.copyMessage || "Copied to clipboard");
      clearTimeout(timers.get(trigger));
      timers.set(
        trigger,
        setTimeout(() => {
          if (trigger.dataset.state === "done") delete trigger.dataset.state;
        }, 2000),
      );
    } catch {
      announce("Copy failed");
    }
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element && event.target.closest("[data-copy]");
    if (trigger) copy(trigger);
  });
})();
