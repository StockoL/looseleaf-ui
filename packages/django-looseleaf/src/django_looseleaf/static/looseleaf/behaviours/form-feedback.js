/*! LooseLeaf UI v2.2.0 | MIT License | Copyright (c) 2026 Louis Stockton | https://github.com/StockoL/looseleaf-ui */
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
