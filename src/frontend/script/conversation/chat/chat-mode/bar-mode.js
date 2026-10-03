/** Bar mode: textareas for the current prompt mode. */

import { convertLayoutValues, getDefaultLayoutId, getLayout } from "./layouts/configuration.js";
import { form } from "../prompt-bar.js";

const fieldsRoot = document.getElementById("composer-fields");

let currentLayout = getDefaultLayoutId();

/** Show the field title only while the textarea has content. */
function syncFieldLabel(wrap, textarea) {
  wrap.classList.toggle("is-filled", textarea.value.length > 0);
}

/** Size a textarea so its full content stays visible. */
export function resizeField(textarea) {
  textarea.style.flex = "none";
  textarea.style.height = "auto";
  textarea.style.overflow = "hidden";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 24)}px`;
}

/** Resize every textarea in a layout container. */
export function resizeFields(root) {
  for (const textarea of root.querySelectorAll("textarea")) {
    resizeField(textarea);
  }
}

/** Bind auto-resize, floating label, and Enter-to-send. */
function bindFieldEvents(wrap, textarea, onSend) {
  textarea.addEventListener("input", () => {
    syncFieldLabel(wrap, textarea);
    resizeField(textarea);
  });

  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && textarea.dataset.sendOnEnter === "true") {
      event.preventDefault();
      if (onSend) {
        onSend();
      } else {
        form.requestSubmit();
      }
    }
  });
}

/** Draw layout textareas into a container, optionally prefilled. */
export function fillLayoutFields(root, layoutId, values = {}, options = {}) {
  const layout = getLayout(layoutId);
  const { onSend, fieldClass, idPrefix } = options;
  root.replaceChildren();

  layout.fields.forEach((field, index) => {
    const wrap = document.createElement("div");
    wrap.className = "composer-field";

    const label = document.createElement("span");
    label.className = "composer-field-label";
    label.textContent = field.title ?? field.placeholder;

    const textarea = document.createElement("textarea");
    textarea.name = field.name;
    textarea.rows = field.rows;
    textarea.placeholder = field.placeholder;
    textarea.autocomplete = "off";
    textarea.value = values[field.name] ?? "";
    textarea.dataset.sendOnEnter = index === layout.fields.length - 1 ? "true" : "false";
    if (fieldClass) {
      textarea.className = fieldClass;
    }
    if (idPrefix) {
      textarea.id = `${idPrefix}${field.name}`;
    }

    wrap.append(label, textarea);
    bindFieldEvents(wrap, textarea, onSend);
    syncFieldLabel(wrap, textarea);
    root.appendChild(wrap);
  });

  resizeFields(root);
  requestAnimationFrame(() => {
    resizeFields(root);
    requestAnimationFrame(() => resizeFields(root));
  });

  return layout.id;
}

/** Read every textarea in a layout container as a name-to-trimmed-value map. */
export function readLayoutValues(root) {
  const values = {};
  for (const field of root.querySelectorAll("textarea")) {
    values[field.name] = field.value.trim();
  }
  return values;
}

/** Draw the textareas that belong to the active bar mode. */
export function renderFields(layoutId) {
  const layout = getLayout(layoutId);
  const values = convertLayoutValues(currentLayout, layout.id, getComposerValues());
  currentLayout = layout.id;
  fillLayoutFields(fieldsRoot, currentLayout, values, { idPrefix: "composer-" });
}

/** Return the active bar-mode id. */
export function getCurrentLayout() {
  return currentLayout;
}

/** Read every bar-mode field as a name-to-trimmed-value map. */
export function getComposerValues() {
  return readLayoutValues(fieldsRoot);
}

/** Clear all bar-mode fields and reset their height. */
export function clearInput() {
  for (const wrap of fieldsRoot.querySelectorAll(".composer-field")) {
    const field = wrap.querySelector("textarea");
    if (!field) {
      continue;
    }
    field.value = "";
    wrap.classList.remove("is-filled");
    resizeField(field);
  }
}

/** Enable or disable bar-mode fields while a reply is in flight. */
export function setBarModeDisabled(disabled) {
  for (const field of fieldsRoot.querySelectorAll("textarea")) {
    field.disabled = disabled;
  }
}

/** Move keyboard focus to the last bar-mode field. */
export function focusInput() {
  const fields = fieldsRoot.querySelectorAll("textarea");
  fields[fields.length - 1]?.focus();
}
