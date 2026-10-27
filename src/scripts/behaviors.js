/**
 * LooseLeaf UI - Behaviours
 * Drop-in progressive enhancement through event delegation. Exports nothing,
 * works as a classic or a module script, and is safe to include twice.
 *
 * Hooks:
 *   .dropdown-wrapper > [data-toggle="dropdown"] + .dropdown   menu button (arrows, Home/End, Escape)
 *   .navbar__toggle + .navbar__menu                           collapsed navbar menu
 *   [data-open-dialog="id"] / [data-close-dialog]              native <dialog> triggers
 *   .alert__close                                              dismiss an alert
 *   [data-copy="text"] (optional data-copy-message)            copy to clipboard, announced
 *   a[href^="#"]                                               motion-safe in-page scrolling
 * Accordions need no script: they are native <details>.
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.behaviours");
  if (window[GUARD]) return;
  window[GUARD] = true;

  let uid = 0;
  const ensureId = (element, prefix) => element.id || (element.id = `${prefix}-${++uid}`);
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     ARIA WIRING: give toggles aria-controls/aria-expanded that match the DOM
     ------------------------------------------------------------------------ */
  function wire() {
    document.querySelectorAll(".dropdown-wrapper").forEach((wrapper) => {
      const trigger = wrapper.querySelector('[data-toggle="dropdown"]');
      const menu = wrapper.querySelector(".dropdown");
      if (!trigger || !menu) return;
      trigger.setAttribute("aria-controls", ensureId(menu, "ll-dropdown"));
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", String(wrapper.dataset.state === "open"));
    });

    document.querySelectorAll(".navbar__toggle").forEach((toggle) => {
      const menu = toggle.closest(".navbar")?.querySelector(".navbar__menu");
      if (!menu) return;
      toggle.setAttribute("aria-controls", ensureId(menu, "ll-navbar-menu"));
      toggle.setAttribute("aria-expanded", String(menu.dataset.state === "open"));
    });
  }

  /* ------------------------------------------------------------------------
     DROPDOWN
     ------------------------------------------------------------------------ */
  const dropdownItems = (wrapper) =>
    [...wrapper.querySelectorAll(".dropdown__item")].filter((item) => !item.matches(':disabled, [aria-disabled="true"]'));

  function setDropdown(wrapper, open, focus) {
    wrapper.dataset.state = open ? "open" : "closed";
    wrapper.querySelector('[data-toggle="dropdown"]')?.setAttribute("aria-expanded", String(open));
    if (!open || !focus) return;
    const items = dropdownItems(wrapper);
    // The menu becomes focusable once visibility flips, on the next frame
    requestAnimationFrame(() => (focus === "last" ? items[items.length - 1] : items[0])?.focus());
  }

  function closeDropdowns(except) {
    document.querySelectorAll('.dropdown-wrapper[data-state="open"]').forEach((wrapper) => {
      if (wrapper !== except) setDropdown(wrapper, false);
    });
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

  /* ------------------------------------------------------------------------
     NAVBAR MENU
     ------------------------------------------------------------------------ */
  function setNavMenu(toggle, open) {
    const menu = toggle.closest(".navbar")?.querySelector(".navbar__menu");
    if (!menu) return;
    menu.dataset.state = open ? "open" : "closed";
    toggle.setAttribute("aria-expanded", String(open));
  }

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
     IN-PAGE LINKS: motion-safe scroll, and move focus to the target
     ------------------------------------------------------------------------ */
  function followInPageLink(link, event) {
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    event.preventDefault();

    link.closest("dialog[open]")?.close();
    const navToggle = link.closest(".navbar")?.querySelector(".navbar__toggle");
    if (navToggle && link.closest('.navbar__menu[data-state="open"]')) setNavMenu(navToggle, false);

    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    // Non-interactive targets need tabindex="-1" to take focus for keyboard and screen reader users
    if (!target.matches('a[href], button, input, select, textarea, summary, [tabindex]')) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
    if (location.hash !== link.hash) history.pushState(null, "", link.hash);
  }

  /* ------------------------------------------------------------------------
     EVENTS
     ------------------------------------------------------------------------ */
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const dropdownTrigger = target.closest('[data-toggle="dropdown"]');
    if (dropdownTrigger) {
      const wrapper = dropdownTrigger.closest(".dropdown-wrapper");
      if (!wrapper) return;
      closeDropdowns(wrapper);
      setDropdown(wrapper, wrapper.dataset.state !== "open");
      return;
    }
    const openWrapper = target.closest('.dropdown-wrapper[data-state="open"]');
    if (!openWrapper) closeDropdowns();
    else if (target.closest(".dropdown__item")) setDropdown(openWrapper, false);

    const navToggle = target.closest(".navbar__toggle");
    if (navToggle) {
      setNavMenu(navToggle, navToggle.getAttribute("aria-expanded") !== "true");
      return;
    }

    const opener = target.closest("[data-open-dialog]");
    if (opener) {
      document.getElementById(opener.dataset.openDialog)?.showModal?.();
      return;
    }

    const closer = target.closest("[data-close-dialog]");
    if (closer) {
      closer.closest("dialog")?.close();
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
    if (link) followInPageLink(link, event);
  });

  document.addEventListener("keydown", (event) => {
    if (!(event.target instanceof Element)) return;
    const wrapper = event.target.closest(".dropdown-wrapper");

    if (event.key === "Escape") {
      const open = wrapper?.dataset.state === "open" ? wrapper : document.querySelector('.dropdown-wrapper[data-state="open"]');
      if (open) {
        setDropdown(open, false);
        open.querySelector('[data-toggle="dropdown"]')?.focus();
        return;
      }
      const openMenu = document.querySelector('.navbar__menu[data-state="open"]');
      const toggle = openMenu?.closest(".navbar")?.querySelector(".navbar__toggle");
      if (toggle) {
        setNavMenu(toggle, false);
        toggle.focus();
      }
      return;
    }

    if (!wrapper) return;

    // Arrow keys on the trigger open the menu at the first or last item
    if (event.target.matches('[data-toggle="dropdown"]') && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      closeDropdowns(wrapper);
      setDropdown(wrapper, true, event.key === "ArrowUp" ? "last" : "first");
      return;
    }

    if (wrapper.dataset.state === "open" && event.target.closest(".dropdown") && moveInDropdown(wrapper, event.key)) {
      event.preventDefault();
    }
  });

  // A menu closes once focus leaves it (Tab away, or focus moves elsewhere)
  document.addEventListener("focusout", (event) => {
    if (!(event.target instanceof Element)) return;
    const wrapper = event.target.closest('.dropdown-wrapper[data-state="open"]');
    if (!wrapper || (event.relatedTarget && wrapper.contains(event.relatedTarget))) return;
    if (event.relatedTarget) setDropdown(wrapper, false);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire, { once: true });
  else wire();
})();
