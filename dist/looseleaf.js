/*! LooseLeaf UI v2.0.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
/**
 * LooseLeaf UI - Behaviours
 * Enhancement only: every control already works without this file. Event
 * delegation on the document; exports nothing, works as a classic or a module
 * script, and is safe to include twice.
 *
 * What it adds, and why nothing native does it:
 *   details.dropdown-wrapper     Escape, outside click and focus-out close the menu, arrow keys
 *                                move through items, one menu open at a time (<details> has none of these)
 *   details.navbar__toggle       Escape and in-page links close the collapsed menu
 *   button[commandfor]           Invoker Commands fallback for browsers without them (show-modal, close)
 *   dialog                       a backdrop click closes it (no native equivalent)
 *   .alert__close                removes the alert (dismissing is optional; the alert reads fine without)
 *   [data-copy="text"]           Clipboard API, announced (optional data-copy-message)
 *   a[href^="#"]                 moves focus to the target; CSS does the smooth scroll
 * Accordions need no script: they are native <details>.
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.behaviours");
  if (window[GUARD]) return;
  window[GUARD] = true;

  /* ------------------------------------------------------------------------
     DROPDOWN (<details class="dropdown-wrapper">)
     ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------
     ANNOUNCEMENTS: one polite live region, created on first use
     ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------
     COPY
     ------------------------------------------------------------------------ */
  const copyTimers = new WeakMap();
  async function copy(trigger) {
    try {
      await navigator.clipboard.writeText(trigger.dataset.copy);
      trigger.dataset.state = "copied";
      announce(trigger.dataset.copyMessage || "Copied to clipboard");
      clearTimeout(copyTimers.get(trigger));
      copyTimers.set(
        trigger,
        setTimeout(() => {
          if (trigger.dataset.state === "copied") delete trigger.dataset.state;
        }, 2000),
      );
    } catch {
      announce("Copy failed");
    }
  }

  /* ------------------------------------------------------------------------
     ALERT DISMISS: animate out, then remove (with a fallback if no transition runs)
     ------------------------------------------------------------------------ */
  function dismissAlert(alert) {
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      alert.remove();
    };
    alert.dataset.state = "removing";
    alert.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, 1000);
  }

  /* ------------------------------------------------------------------------
     DIALOGS: Invoker Commands fallback. Same markup either way; this does
     nothing in browsers that support command/commandfor natively.
     ------------------------------------------------------------------------ */
  const nativeCommands = "commandForElement" in HTMLButtonElement.prototype;
  function runCommand(button) {
    const dialog = document.getElementById(button.getAttribute("commandfor"));
    if (!(dialog instanceof HTMLDialogElement)) return;
    const command = button.getAttribute("command");
    if (command === "show-modal" && !dialog.open) dialog.showModal();
    else if (command === "close" || command === "request-close") dialog.close();
  }

  /* ------------------------------------------------------------------------
     IN-PAGE LINKS: the browser scrolls (smoothly, from CSS); keyboard and
     screen reader users also need focus moved to the target
     ------------------------------------------------------------------------ */
  function followInPageLink(link) {
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    link.closest("dialog[open]")?.close();
    const navToggle = link.closest(".navbar")?.querySelector("details.navbar__toggle[open]");
    if (navToggle) navToggle.open = false;
    // Non-interactive targets need tabindex="-1" to take focus
    if (!target.matches("a[href], button, input, select, textarea, summary, [tabindex]")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------------
     EVENTS
     ------------------------------------------------------------------------ */
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    // Outside a menu closes it; choosing an item closes it too
    const inDropdown = target.closest("details.dropdown-wrapper");
    openDropdowns().forEach((wrapper) => wrapper !== inDropdown && closeDropdown(wrapper));
    if (inDropdown?.open && target.closest(".dropdown__item")) closeDropdown(inDropdown);

    if (legacyClick(target)) return;

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
      return;
    }

    const alertClose = target.closest(".alert__close");
    if (alertClose) {
      const alert = alertClose.closest(".alert");
      if (alert) dismissAlert(alert);
      return;
    }

    const copyTrigger = target.closest("[data-copy]");
    if (copyTrigger) {
      copy(copyTrigger);
      return;
    }

    const link = target.closest('a[href^="#"]:not([href="#"])');
    if (link) followInPageLink(link);
  });

  document.addEventListener("keydown", (event) => {
    if (!(event.target instanceof Element)) return;
    if (legacyKeydown(event)) return;
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

  /* ------------------------------------------------------------------------
     DEPRECATED in 2.1, removed in 3.0: the scripted markup from 2.0, which
     does nothing without JavaScript.
       <div class="dropdown-wrapper"> + [data-toggle="dropdown"]  ->  <details class="dropdown-wrapper"> + <summary>
       <button class="navbar__toggle">                             ->  <details class="navbar__toggle"><summary>
       [data-open-dialog="id"] / [data-close-dialog]                ->  commandfor="id" command="show-modal" / "close"
     ------------------------------------------------------------------------ */
  const warned = new Set();
  function deprecated(what, instead) {
    if (warned.has(what)) return;
    warned.add(what);
    console.warn(`LooseLeaf UI: ${what} is deprecated and stops working in 3.0. Use ${instead} instead.`);
  }

  function setLegacyDropdown(wrapper, open) {
    wrapper.dataset.state = open ? "open" : "closed";
    wrapper.querySelector('[data-toggle="dropdown"]')?.setAttribute("aria-expanded", String(open));
  }

  function setLegacyNav(toggle, open) {
    const menu = toggle.closest(".navbar")?.querySelector(".navbar__menu");
    if (menu) menu.dataset.state = open ? "open" : "closed";
    toggle.setAttribute("aria-expanded", String(open));
  }

  function legacyClick(target) {
    const legacyOpen = document.querySelectorAll('div.dropdown-wrapper[data-state="open"]');
    const trigger = target.closest('[data-toggle="dropdown"]');
    legacyOpen.forEach((wrapper) => {
      if (!wrapper.contains(target) || (!trigger && target.closest(".dropdown__item"))) setLegacyDropdown(wrapper, false);
    });
    if (trigger) {
      deprecated('[data-toggle="dropdown"]', '<details class="dropdown-wrapper"> with a <summary>');
      const wrapper = trigger.closest(".dropdown-wrapper");
      if (wrapper) setLegacyDropdown(wrapper, wrapper.dataset.state !== "open");
      return true;
    }

    const navToggle = target.closest("button.navbar__toggle");
    if (navToggle) {
      deprecated("<button class=\"navbar__toggle\">", '<details class="navbar__toggle"><summary>');
      setLegacyNav(navToggle, navToggle.getAttribute("aria-expanded") !== "true");
      return true;
    }

    const opener = target.closest("[data-open-dialog]");
    if (opener) {
      deprecated("[data-open-dialog]", 'commandfor="…" command="show-modal"');
      document.getElementById(opener.dataset.openDialog)?.showModal?.();
      return true;
    }

    const closer = target.closest("[data-close-dialog]");
    if (closer) {
      deprecated("[data-close-dialog]", 'commandfor="…" command="close"');
      closer.closest("dialog")?.close();
      return true;
    }
    return false;
  }

  function legacyKeydown(event) {
    if (event.key !== "Escape") return false;
    const wrapper = document.querySelector('div.dropdown-wrapper[data-state="open"]');
    if (wrapper) {
      setLegacyDropdown(wrapper, false);
      wrapper.querySelector('[data-toggle="dropdown"]')?.focus();
      return true;
    }
    const toggle = document.querySelector('.navbar__menu[data-state="open"]')?.closest(".navbar")?.querySelector("button.navbar__toggle");
    if (!toggle) return false;
    setLegacyNav(toggle, false);
    toggle.focus();
    return true;
  }
})();
