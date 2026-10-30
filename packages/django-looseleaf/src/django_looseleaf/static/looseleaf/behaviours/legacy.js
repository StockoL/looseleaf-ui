/*! LooseLeaf UI v2.5.1 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
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
