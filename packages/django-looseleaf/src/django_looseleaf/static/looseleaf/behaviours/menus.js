/*! LooseLeaf UI v2.5.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
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
