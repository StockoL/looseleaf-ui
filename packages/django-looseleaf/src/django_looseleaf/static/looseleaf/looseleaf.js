/*! LooseLeaf UI v2.5.1 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
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

/**
 * LooseLeaf UI - Tabs
 * Why script: no native element shows one panel at a time with a tab list's
 * semantics: roles, aria-selected, a roving tabindex, and arrow, Home and End
 * keys between tabs.
 * Without it: the list is a jump list of in-page links and every panel shows.
 * Hooks: .tabs > .tabs__list > a.tabs__tab[href="#panel-id"], .tabs > .tabs__panel[id]
 *        The block gets [data-js] once enhanced; the active panel gets [data-state="active"].
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.tabs");
  if (window[GUARD]) return;
  window[GUARD] = true;

  let uid = 0;
  const tabsOf = (block) =>
    [...block.querySelectorAll(":scope > .tabs__list .tabs__tab")].filter((tab) => panelOf(block, tab));
  const panelOf = (block, tab) => {
    const id = decodeURIComponent((tab.getAttribute("href") || "").slice(1));
    const panel = id && document.getElementById(id);
    return panel && panel.parentElement === block ? panel : null;
  };

  function select(block, chosen, focus) {
    for (const tab of tabsOf(block)) {
      const active = tab === chosen;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = panelOf(block, tab);
      if (active) panel.dataset.state = "active";
      else delete panel.dataset.state;
    }
    if (focus) chosen.focus();
  }

  function enhance(block) {
    if (block.hasAttribute("data-js")) return;
    const tabs = tabsOf(block);
    if (!tabs.length) return;
    block.querySelector(":scope > .tabs__list").setAttribute("role", "tablist");
    for (const tab of tabs) {
      const panel = panelOf(block, tab);
      tab.id ||= `ll-tab-${++uid}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.tabIndex = 0;
    }
    const fromHash = tabs.find((tab) => tab.hash && tab.hash === location.hash);
    const marked = tabs.find((tab) => panelOf(block, tab).dataset.state === "active");
    select(block, fromHash || marked || tabs[0], false);
    block.setAttribute("data-js", "");
  }

  document.addEventListener("click", (event) => {
    const tab = event.target instanceof Element && event.target.closest(".tabs[data-js] > .tabs__list .tabs__tab");
    if (!tab) return;
    event.preventDefault();
    select(tab.closest(".tabs"), tab, true);
  });

  // Arrow keys move between tabs and select as they go; Home and End jump to the ends
  document.addEventListener("keydown", (event) => {
    const tab = event.target instanceof Element && event.target.closest(".tabs[data-js] > .tabs__list .tabs__tab");
    if (!tab) return;
    const block = tab.closest(".tabs");
    const tabs = tabsOf(block);
    const index = tabs.indexOf(tab);
    const last = tabs.length - 1;
    const rtl = getComputedStyle(block).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    const next = { [forward]: index < last ? index + 1 : 0, [back]: index > 0 ? index - 1 : last, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(block, tabs[next], true);
  });

  // A link to a panel (from elsewhere on the page, or the address bar) selects its tab
  window.addEventListener("hashchange", () => {
    for (const block of document.querySelectorAll(".tabs[data-js]")) {
      const tab = tabsOf(block).find((candidate) => candidate.hash === location.hash);
      if (tab) select(block, tab, false);
    }
  });

  const start = () => document.querySelectorAll(".tabs").forEach(enhance);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();

/**
 * LooseLeaf UI - Toasts
 * Why script: a queue, auto-dismissal that pauses while the pointer or focus
 * is on a toast, and raising toasts above an open dialog all need script. So
 * does creating a toast in response to something that happened on the page.
 * Without it: server-rendered toasts sit in the page where their region is,
 * readable like alerts.
 * Hooks: .toast-region > .toast (data-status, data-duration in ms, 0 = stays)
 *        [data-toast="message"] buttons (data-toast-status, data-toast-duration)
 *        document.dispatchEvent(new CustomEvent("looseleaf:toast", { detail: { message, status, duration } }))
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.toast");
  if (window[GUARD]) return;
  window[GUARD] = true;

  const DURATION = 5000;
  const VISIBLE = 3;
  const timers = new WeakMap(); // toast -> { remaining, started, timeout }
  let paused = false;

  function region() {
    let found = document.querySelector(".toast-region");
    if (!found) {
      found = document.createElement("div");
      found.className = "toast-region";
      found.setAttribute("aria-live", "polite");
      document.body.append(found);
    }
    if (!found.hasAttribute("data-js")) {
      found.setAttribute("data-js", "");
      found.setAttribute("popover", "manual");
      found.addEventListener("pointerenter", () => pause(found, true));
      found.addEventListener("pointerleave", () => pause(found, found.contains(document.activeElement)));
      found.addEventListener("focusin", () => pause(found, true));
      found.addEventListener("focusout", (event) => pause(found, found.matches(":hover") || found.contains(event.relatedTarget)));
    }
    return found;
  }

  // The newest popover sits on top: re-showing the region lifts it above a dialog opened since.
  // A modal dialog makes the rest of the page inert (no clicks, hidden from screen readers),
  // so while one is open the region moves inside it; the top layer keeps its position.
  function raise(container) {
    if (typeof container.showPopover !== "function") return;
    const modal = [...document.querySelectorAll("dialog[open]")].filter((dialog) => dialog.matches(":modal")).pop();
    const home = modal || document.body;
    if (container.parentElement !== home) home.append(container);
    if (container.matches(":popover-open")) container.hidePopover();
    container.showPopover();
  }

  // close doesn't bubble: capture it, and bring the region back out of a closing dialog
  document.addEventListener(
    "close",
    (event) => {
      const container = document.querySelector(".toast-region[data-js]");
      if (container && event.target instanceof HTMLDialogElement && event.target.contains(container)) raise(container);
    },
    true,
  );

  function closeButton() {
    const button = document.createElement("button");
    button.className = "toast__close";
    button.type = "button";
    button.setAttribute("aria-label", "Dismiss");
    button.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>';
    return button;
  }

  function start(toast) {
    const duration = Number(toast.dataset.duration ?? (toast.dataset.status === "danger" ? 0 : DURATION));
    if (!(duration > 0)) return;
    timers.set(toast, { remaining: duration, started: 0, timeout: 0 });
    if (!paused) resume(toast);
  }

  function resume(toast) {
    const timer = timers.get(toast);
    if (!timer) return;
    timer.started = Date.now();
    timer.timeout = setTimeout(() => dismiss(toast), timer.remaining);
  }

  function pause(container, on) {
    if (paused === on) return;
    paused = on;
    for (const toast of container.querySelectorAll(":scope > .toast:not([data-state])")) {
      const timer = timers.get(toast);
      if (!timer) continue;
      if (on) {
        clearTimeout(timer.timeout);
        timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.started));
      } else {
        resume(toast);
      }
    }
  }

  // Shows queued toasts while there is room
  function fill(container) {
    const showing = container.querySelectorAll(":scope > .toast:not([data-state])").length;
    const queued = [...container.querySelectorAll(':scope > .toast[data-state="queued"]')];
    queued.slice(0, Math.max(0, VISIBLE - showing)).forEach((toast) => {
      delete toast.dataset.state;
      start(toast);
    });
  }

  function enhance(toast) {
    if (!toast.querySelector(".toast__close")) toast.append(closeButton());
    if (toast.dataset.status === "danger") toast.setAttribute("role", "alert");
    toast.dataset.state = "queued";
  }

  function dismiss(toast) {
    if (toast.dataset.state === "removing") return;
    clearTimeout(timers.get(toast)?.timeout);
    const container = toast.parentElement;
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      toast.remove();
      if (container) fill(container);
    };
    toast.dataset.state = "removing";
    // With motion off every duration is 0 and no transitionend will come
    if (getComputedStyle(toast).transitionDuration.split(",").every((d) => parseFloat(d) === 0)) return remove();
    toast.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, 1000);
  }

  function show({ message, status, duration } = {}) {
    if (!message) return;
    const container = region();
    const toast = document.createElement("div");
    toast.className = "toast";
    if (status) toast.dataset.status = status;
    if (duration !== undefined && duration !== null && duration !== "") toast.dataset.duration = String(duration);
    const text = document.createElement("p");
    text.className = "toast__message";
    text.textContent = message;
    toast.append(text);
    enhance(toast);
    container.append(toast);
    raise(container);
    fill(container);
  }

  document.addEventListener("looseleaf:toast", (event) => show(event.detail));

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const close = event.target.closest(".toast__close");
    if (close) {
      const toast = close.closest(".toast");
      if (toast) dismiss(toast);
      return;
    }
    const trigger = event.target.closest("[data-toast]");
    if (trigger) show({ message: trigger.dataset.toast, status: trigger.dataset.toastStatus, duration: trigger.dataset.toastDuration });
  });

  // Toasts rendered by the server: float them and start their timers
  function init() {
    const existing = document.querySelector(".toast-region");
    if (!existing) return;
    const container = region();
    container.querySelectorAll(":scope > .toast").forEach(enhance);
    raise(container);
    fill(container);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

/**
 * LooseLeaf UI - Form feedback
 * Why script: native validation shows its message in a browser bubble that
 * vanishes, only when the form is submitted, and leaves the field unmarked for
 * styles and assistive technology. Script writes the message into the field's
 * .field__error, marks the control aria-invalid as soon as the visitor leaves
 * it, and on submit moves focus to the first problem. Counting characters
 * against maxlength needs script too.
 * Without it: native validation bubbles on submit; server-side errors render as usual.
 * Hooks: controls in a .field inside a <form> (forms with novalidate are left
 *        alone: they validate on the server); [data-maxlength-counter] on a control with maxlength
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.form-feedback");
  if (window[GUARD]) return;
  window[GUARD] = true;

  const CONTROL = ".field :is(input, select, textarea):not([type=hidden], [type=submit], [type=button], [type=reset])";
  const touched = new WeakSet();
  const focusing = new WeakSet(); // forms whose first invalid control is being focused this submit
  let uid = 0;

  const managed = (control) => control.matches(CONTROL) && control.form && !control.form.noValidate;

  function describe(control, element) {
    element.id ||= `ll-field-${++uid}`;
    const ids = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (!ids.includes(element.id)) control.setAttribute("aria-describedby", [...ids, element.id].join(" "));
  }

  function errorFor(control) {
    const field = control.closest(".field");
    let error = field.querySelector(".field__error");
    if (!error) {
      error = document.createElement("p");
      error.className = "field__error";
      error.hidden = true;
      field.append(error);
    }
    describe(control, error);
    return error;
  }

  function show(control) {
    const field = control.closest(".field");
    const error = errorFor(control);
    if (control.validity.valid) {
      if (control.getAttribute("aria-invalid") === "true") control.removeAttribute("aria-invalid");
      delete field.dataset.status;
      error.textContent = "";
      error.hidden = true;
    } else {
      control.setAttribute("aria-invalid", "true");
      field.dataset.status = "danger";
      error.textContent = control.validationMessage;
      error.hidden = false;
    }
  }

  // Changing a value marks it touched; once marked invalid, it re-checks as you type
  document.addEventListener("input", (event) => {
    const control = event.target;
    if (!(control instanceof Element) || !managed(control)) return;
    touched.add(control);
    if (control.getAttribute("aria-invalid") === "true") show(control);
  });

  // Leaving a control you changed checks it
  document.addEventListener("focusout", (event) => {
    const control = event.target;
    if (control instanceof Element && managed(control) && touched.has(control)) show(control);
  });

  // On submit the browser fires invalid on each failing control: show inline
  // messages instead of the bubble, and focus the first failing control
  document.addEventListener(
    "invalid",
    (event) => {
      const control = event.target;
      if (!(control instanceof Element) || !managed(control)) return;
      event.preventDefault();
      touched.add(control);
      show(control);
      const form = control.form;
      if (focusing.has(form)) return;
      focusing.add(form);
      control.focus();
      setTimeout(() => focusing.delete(form));
    },
    true,
  );

  /* Character counter: "12 characters left" */
  function count(control) {
    const max = Number(control.getAttribute("maxlength"));
    if (!(max > 0)) return;
    let counter = control.closest(".field")?.querySelector("[data-counter]");
    if (!counter) {
      counter = document.createElement("p");
      counter.className = "field__hint";
      counter.setAttribute("data-counter", "");
      control.closest(".field")?.append(counter);
      describe(control, counter);
    }
    const left = max - control.value.length;
    counter.textContent = `${left} character${left === 1 ? "" : "s"} left`;
  }

  document.addEventListener("input", (event) => {
    if (event.target instanceof Element && event.target.matches("[data-maxlength-counter]")) count(event.target);
  });

  const start = () => document.querySelectorAll("[data-maxlength-counter]").forEach(count);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();

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

/**
 * LooseLeaf UI - Sound (opt-in)
 * Why script: CSS can't play sound; the Web Audio API can.
 * Plays a short sound when [data-sound="click" | "toggle" | "success"] is
 * activated (clicked, or Enter/Space), never on hover or focus. Off twice over:
 *   1. the site opts in with data-sound on <html>, and
 *   2. the visitor turns it on with a [data-sound-toggle] button (theme.js
 *      remembers it, default off). There is no prefers-reduced-sound media query,
 *      so the toggle is the only consent: with no toggle on the page, nothing plays.
 * The default sounds are synthesised (a filtered noise burst and a short tone,
 * pitch and decay jittered so repeats differ); data-sound-src="/path/" on <html>
 * plays <path>click.mp3, toggle.mp3 and success.mp3 instead. Volume: --sound-volume.
 * Without it: silence.
 */

(() => {
  "use strict";

  const GUARD = Symbol.for("looseleaf.sound");
  if (window[GUARD]) return;
  window[GUARD] = true;

  const root = document.documentElement;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audio = null;

  const allowed = () =>
    root.hasAttribute("data-sound") && root.hasAttribute("data-sound-on") && Boolean(document.querySelector("[data-sound-toggle]"));
  const volume = () => {
    const value = parseFloat(getComputedStyle(root).getPropertyValue("--sound-volume"));
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0.3;
  };
  const jitter = (value, amount) => value * (1 + (Math.random() * 2 - 1) * amount);

  // Created or resumed inside the activation itself: Safari keeps a context made at load suspended
  function context() {
    audio ||= new AudioContextClass();
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  const TONES = { click: [880], toggle: [660], success: [660, 990] };

  function synthesise(kind, level) {
    const ac = context();
    const start = ac.currentTime;
    const out = ac.createGain();
    out.gain.value = level;
    out.connect(ac.destination);

    // A short, filtered burst of noise: the "tick"
    const length = jitter(0.025, 0.2);
    const noise = ac.createBuffer(1, Math.ceil(ac.sampleRate * length), ac.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
    const burst = ac.createBufferSource();
    burst.buffer = noise;
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = jitter(kind === "toggle" ? 2600 : 1900, 0.15);
    band.Q.value = 1.4;
    burst.connect(band).connect(out);
    burst.start(start);

    // A tone or two, decaying fast: the "pitch"
    TONES[kind].forEach((frequency, index) => {
      const at = start + index * 0.07;
      const tone = ac.createOscillator();
      const envelope = ac.createGain();
      tone.type = "sine";
      tone.frequency.value = jitter(frequency, 0.03);
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(0.35, at + 0.005);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + jitter(0.09, 0.2));
      tone.connect(envelope).connect(out);
      tone.start(at);
      tone.stop(at + 0.15);
    });
  }

  function play(kind) {
    if (!(kind in TONES)) return;
    const level = volume();
    const source = root.dataset.soundSrc;
    if (source) {
      const file = new Audio(`${source}${kind}.mp3`);
      file.volume = level;
      file.play().catch(() => {});
    } else if (AudioContextClass) {
      synthesise(kind, level);
    }
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !allowed()) return;
    const control = event.target.closest("[data-sound]:not(html)");
    if (control && !control.matches(':disabled, [aria-disabled="true"]')) play(control.dataset.sound);
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
