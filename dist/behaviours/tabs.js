/*! LooseLeaf UI v2.5.1 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
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
