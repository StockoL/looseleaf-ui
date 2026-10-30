/*! LooseLeaf UI v2.5.1 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
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
