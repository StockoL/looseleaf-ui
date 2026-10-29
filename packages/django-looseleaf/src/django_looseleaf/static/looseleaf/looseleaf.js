/*! LooseLeaf UI v2.1.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
/**
 * LooseLeaf UI - Behaviours
 * Enhancement only: every control already works without this file. Each module
 * below says why it needs script and what happens without it. They are also
 * published one by one in dist/behaviours/ for selective import. Event delegation
 * on the document; exports nothing; works as a classic or a module script; safe
 * to include twice, or alongside the individual modules.
 */

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

/**
 * LooseLeaf UI - Menus
 * Why script: <details> opens and closes on its summary only. Nothing native
 * closes it on Escape, an outside click or focus leaving, keeps one menu open
 * at a time, or moves through items with the arrow keys.
 * Without it: menus open and close from their summary, and Tab reaches every item.
 * Hooks: details.dropdown-wrapper (summary + .dropdown with .dropdown__item),
 *        details.navbar__toggle (Escape closes the collapsed menu)
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.menus");
  if (window[GUARD]) return;
  window[GUARD] = true;

  const openDropdowns = () => document.querySelectorAll("details.dropdown-wrapper[open]");
  const dropdownItems = (wrapper) =>
    [...wrapper.querySelectorAll(".dropdown__item")].filter((item) => !item.matches(':disabled, [aria-disabled="true"]'));

  function closeDropdown(wrapper, returnFocus) {
    wrapper.open = false;
    if (returnFocus) wrapper.querySelector(":scope > summary")?.focus();
  }

  function moveInDropdown(wrapper, key) {
    const items = dropdownItems(wrapper);
    if (!items.length) return false;
    const index = items.indexOf(document.activeElement);
    const last = items.length - 1;
    const next = { ArrowDown: index < last ? index + 1 : 0, ArrowUp: index > 0 ? index - 1 : last, Home: 0, End: last }[key];
    if (next === undefined) return false;
    items[next].focus();
    return true;
  }

  // toggle doesn't bubble, so listen in the capture phase: one menu open at a time
  document.addEventListener(
    "toggle",
    (event) => {
      const wrapper = event.target;
      if (!(wrapper instanceof HTMLDetailsElement) || !wrapper.matches(".dropdown-wrapper") || !wrapper.open) return;
      openDropdowns().forEach((other) => other !== wrapper && closeDropdown(other));
    },
    true,
  );

  // Outside a menu closes it; choosing an item closes it too
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const inDropdown = event.target.closest("details.dropdown-wrapper");
    openDropdowns().forEach((wrapper) => wrapper !== inDropdown && closeDropdown(wrapper));
    if (inDropdown?.open && event.target.closest(".dropdown__item")) closeDropdown(inDropdown);
  });

  document.addEventListener("keydown", (event) => {
    if (!(event.target instanceof Element)) return;
    const wrapper = event.target.closest("details.dropdown-wrapper");

    if (event.key === "Escape") {
      const open = wrapper?.open ? wrapper : openDropdowns()[0];
      if (open) {
        closeDropdown(open, true);
        return;
      }
      const navToggle = document.querySelector("details.navbar__toggle[open]");
      if (navToggle) {
        navToggle.open = false;
        navToggle.querySelector("summary")?.focus();
      }
      return;
    }

    if (!wrapper) return;

    // Arrow keys on the trigger open the menu at the first or last item
    if (event.target.matches(".dropdown-wrapper > summary") && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      wrapper.open = true;
      const items = dropdownItems(wrapper);
      (event.key === "ArrowUp" ? items[items.length - 1] : items[0])?.focus();
      return;
    }

    if (wrapper.open && event.target.closest(".dropdown") && moveInDropdown(wrapper, event.key)) event.preventDefault();
  });

  // A menu closes once focus leaves it (Tab away, or focus moves elsewhere)
  document.addEventListener("focusout", (event) => {
    if (!(event.target instanceof Element) || !event.relatedTarget) return;
    const wrapper = event.target.closest("details.dropdown-wrapper[open]");
    if (wrapper && !wrapper.contains(event.relatedTarget)) closeDropdown(wrapper);
  });
})();

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

/**
 * LooseLeaf UI - Copy to clipboard
 * Why script: writing to the clipboard needs the Clipboard API.
 * Without it: the text is on the page to select and copy by hand.
 * Hooks: [data-copy="text"] (optional data-copy-message), announced politely
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
  async function copy(trigger) {
    try {
      await navigator.clipboard.writeText(trigger.dataset.copy);
      trigger.dataset.state = "copied";
      announce(trigger.dataset.copyMessage || "Copied to clipboard");
      clearTimeout(timers.get(trigger));
      timers.set(
        trigger,
        setTimeout(() => {
          if (trigger.dataset.state === "copied") delete trigger.dataset.state;
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

/**
 * LooseLeaf UI - 2.0 markup (deprecated in 2.1, removed in 3.0)
 * Why script: the 2.0 dropdown, navbar toggle and dialog triggers were driven
 * entirely by script. This keeps them working through 2.x and logs one console
 * warning per kind. Move to the native markup:
 *   <div class="dropdown-wrapper"> + [data-toggle="dropdown"]  ->  <details class="dropdown-wrapper"> + <summary>
 *   <button class="navbar__toggle">                             ->  <details class="navbar__toggle"><summary>
 *   [data-open-dialog="id"] / [data-close-dialog]                ->  commandfor="id" command="show-modal" / "close"
 * Without it: the 2.0 markup does nothing.
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.legacy");
  if (window[GUARD]) return;
  window[GUARD] = true;

  const warned = new Set();
  function deprecated(what, instead) {
    if (warned.has(what)) return;
    warned.add(what);
    console.warn(`LooseLeaf UI: ${what} is deprecated and stops working in 3.0. Use ${instead} instead.`);
  }

  function setDropdown(wrapper, open) {
    wrapper.dataset.state = open ? "open" : "closed";
    wrapper.querySelector('[data-toggle="dropdown"]')?.setAttribute("aria-expanded", String(open));
  }

  function setNav(toggle, open) {
    const menu = toggle.closest(".navbar")?.querySelector(".navbar__menu");
    if (menu) menu.dataset.state = open ? "open" : "closed";
    toggle.setAttribute("aria-expanded", String(open));
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest('[data-toggle="dropdown"]');
    document.querySelectorAll('div.dropdown-wrapper[data-state="open"]').forEach((wrapper) => {
      if (!wrapper.contains(target) || (!trigger && target.closest(".dropdown__item"))) setDropdown(wrapper, false);
    });
    if (trigger) {
      deprecated('[data-toggle="dropdown"]', '<details class="dropdown-wrapper"> with a <summary>');
      const wrapper = trigger.closest(".dropdown-wrapper");
      if (wrapper) setDropdown(wrapper, wrapper.dataset.state !== "open");
      return;
    }

    const navToggle = target.closest("button.navbar__toggle");
    if (navToggle) {
      deprecated('<button class="navbar__toggle">', '<details class="navbar__toggle"><summary>');
      setNav(navToggle, navToggle.getAttribute("aria-expanded") !== "true");
      return;
    }

    const opener = target.closest("[data-open-dialog]");
    if (opener) {
      deprecated("[data-open-dialog]", 'commandfor="…" command="show-modal"');
      document.getElementById(opener.dataset.openDialog)?.showModal?.();
      return;
    }

    const closer = target.closest("[data-close-dialog]");
    if (closer) {
      deprecated("[data-close-dialog]", 'commandfor="…" command="close"');
      closer.closest("dialog")?.close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const wrapper = document.querySelector('div.dropdown-wrapper[data-state="open"]');
    if (wrapper) {
      setDropdown(wrapper, false);
      wrapper.querySelector('[data-toggle="dropdown"]')?.focus();
      return;
    }
    const toggle = document.querySelector('.navbar__menu[data-state="open"]')?.closest(".navbar")?.querySelector("button.navbar__toggle");
    if (!toggle) return;
    setNav(toggle, false);
    toggle.focus();
  });
})();
