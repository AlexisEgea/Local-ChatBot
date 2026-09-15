/**  Renders 1, 2, or 4 bars and collects their values on submit. */

import { convertLayoutValues, DEFAULT_LAYOUT, LAYOUTS } from "./layouts.js";

const conversation = document.getElementById("conversation");
const form = document.getElementById("chat-form");
const stack = document.getElementById("composer-stack");
const fieldsRoot = document.getElementById("composer-fields");
const sendButton = document.getElementById("chat-send");
const picker = document.getElementById("composer-picker");

let currentLayout = DEFAULT_LAYOUT;
let pickerMode = false;

/** Show the field title only while the textarea has content. */
function syncFieldLabel(wrap, textarea) {
  wrap.classList.toggle("is-filled", textarea.value.length > 0);
}

/** Size a textarea so its full content stays visible. */
export function resizeField(textarea) {
  textarea.style.flex = "none";
  textarea.style.height = "auto";
  textarea.style.overflow = "hidden";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 28)}px`;
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
  const layout = LAYOUTS[layoutId] ?? LAYOUTS[DEFAULT_LAYOUT];
  const { onSend, fieldClass, idPrefix } = options;
  root.replaceChildren();

  layout.fields.forEach((field, index) => {
    const wrap = document.createElement("div");
    wrap.className = "composer-field";

    const label = document.createElement("span");
    label.className = "composer-field-label";
    label.textContent = field.placeholder;

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

/** Grow the composer into the center picker, or collapse it back to the bottom bar. */
function setPicking(isPicking) {
  conversation.classList.toggle("is-picking", isPicking);
  picker.hidden = !isPicking;
}

/** Draw the textareas that belong to the active layout. */
export function renderFields(layoutId) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS[DEFAULT_LAYOUT];
  const values = convertLayoutValues(currentLayout, layout.id, getComposerValues());
  currentLayout = layout.id;
  fillLayoutFields(fieldsRoot, currentLayout, values, { idPrefix: "composer-" });
}

/** Return the active layout id. */
export function getCurrentLayout() {
  return currentLayout;
}

/** Read every composer bar as a name-to-trimmed-value map. */
export function getComposerValues() {
  return readLayoutValues(fieldsRoot);
}

/** Clear all composer fields and reset their height. */
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

/** Disable or enable the send button and all composer fields. */
export function setBusy(isBusy) {
  sendButton.disabled = isBusy;
  for (const field of fieldsRoot.querySelectorAll("textarea")) {
    field.disabled = isBusy;
  }
}

/** Move keyboard focus to the last composer field. */
export function focusInput() {
  const fields = fieldsRoot.querySelectorAll("textarea");
  fields[fields.length - 1]?.focus();
}

/** Bind the form submit handler without a page reload. */
export function onSubmit(handler) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handler();
  });
}

/** Enable or disable "click the glass panel to choose a layout". */
export function setPickerMode(isEnabled) {
  pickerMode = isEnabled;
  conversation.classList.toggle("is-picker-mode", isEnabled);
  if (!isEnabled) {
    setPicking(false);
  }
}

/**
 * Wire picker interactions: glass click opens choices, a choice applies a layout,
 * clicking the dimmed backdrop closes the picker without changing layout.
 */
export function onLayoutPick(handler) {
  stack.addEventListener("click", (event) => {
    if (!pickerMode || conversation.classList.contains("is-picking")) {
      return;
    }
    if (
      event.target.closest("textarea") ||
      event.target.closest(".composer-field") ||
      event.target.closest("#chat-send") ||
      event.target.closest("#composer-picker")
    ) {
      return;
    }
    setPicking(true);
  });

  picker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layout]");
    if (!button) {
      return;
    }
    event.stopPropagation();
    setPicking(false);
    handler(button.dataset.layout);
  });

  form.addEventListener("click", (event) => {
    if (!conversation.classList.contains("is-picking")) {
      return;
    }
    if (event.target === form) {
      setPicking(false);
    }
  });
}
