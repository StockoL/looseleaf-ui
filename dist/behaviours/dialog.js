/*! LooseLeaf UI v2.3.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
/**
 * LooseLeaf UI - Dialogs
 * Why script: Invoker Commands (commandfor/command) open and close <dialog>
 * natively from Chrome 135, Safari 26.2 and Firefox 144; this fills in for older
 * browsers using the same attributes. Nothing native closes a dialog on a
 * backdrop click.
 * Without it: dialogs open in browsers with Invoker Commands, and content
 * dialogs also have a route that needs no dialog (see the README).
 * Hooks: button[commandfor][command="show-modal" | "close" | "request-close"]
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.dialog");
  if (window[GUARD]) return;
  window[GUARD] = true;

  const nativeCommands = "commandForElement" in HTMLButtonElement.prototype;

  function runCommand(button) {
    const dialog = document.getElementById(button.getAttribute("commandfor"));
    if (!(dialog instanceof HTMLDialogElement)) return;
    const command = button.getAttribute("command");
    if (command === "show-modal" && !dialog.open) dialog.showModal();
    else if (command === "close" || command === "request-close") dialog.close();
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const commander = !nativeCommands && target.closest("button[commandfor]");
    if (commander) {
      runCommand(commander);
      return;
    }

    // A click on the dialog element itself, outside its box, is a click on the ::backdrop
    if (target instanceof HTMLDialogElement && target.open) {
      const rect = target.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) target.close();
    }
  });
})();
