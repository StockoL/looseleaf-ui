/*! LooseLeaf UI v2.5.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
/**
 * LooseLeaf UI - Done state
 * Why script: CSS can't know that an action succeeded. This marks a control
 * [data-state="done"] after a save or a request (the button's label steps
 * aside for a checkmark that draws itself) and clears it two seconds later.
 * copy.js uses the same state after a copy.
 * Without it: nothing changes visually; the action still happened.
 * Hooks: [data-done-on="submit"] on a form's submit button
 *        [data-done-on="request"] on an htmx element (after a successful request)
 *        element.dispatchEvent(new CustomEvent("looseleaf:done", { bubbles: true })) from your own code
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.done-state");
  if (window[GUARD]) return;
  window[GUARD] = true;

  const timers = new WeakMap();
  const CHECK = '<svg class="icon" data-done-icon viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5" /></svg>';

  function done(control) {
    if (!(control instanceof Element)) return;
    if (!control.querySelector("[data-done-icon]")) control.insertAdjacentHTML("beforeend", CHECK);
    control.dataset.state = "done";
    clearTimeout(timers.get(control));
    timers.set(
      control,
      setTimeout(() => {
        if (control.dataset.state === "done") delete control.dataset.state;
      }, 2000),
    );
  }

  document.addEventListener("looseleaf:done", (event) => done(event.target));

  document.addEventListener("submit", (event) => {
    const button = event.submitter?.matches('[data-done-on="submit"]')
      ? event.submitter
      : event.target.querySelector?.('[data-done-on="submit"]');
    // Leave it to the page if it stopped the submission (failed validation, say)
    if (button) setTimeout(() => !event.defaultPrevented && done(button));
  });

  document.addEventListener("htmx:afterRequest", (event) => {
    const element = event.detail?.elt;
    if (event.detail?.successful && element?.matches?.('[data-done-on="request"]')) done(element);
  });
})();
