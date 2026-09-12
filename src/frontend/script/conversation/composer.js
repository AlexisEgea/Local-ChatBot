/**  Renders 1, 2, or 4 bars and collects their values on submit. */

import { DEFAULT_LAYOUT, LAYOUTS } from "./layouts.js";

const conversation = document.getElementById("conversation");
const form = document.getElementById("chat-form");
const stack = document.getElementById("composer-stack");
const fieldsRoot = document.getElementById("composer-fields");
const sendButton = document.getElementById("chat-send");
const picker = document.getElementById("composer-picker");

let currentLayout = DEFAULT_LAYOUT;
let pickerMode = false;

/** Bind auto-resize and Enter-to-send on a composer textarea. */
function bindFieldEvents(textarea) {
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  });

  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && textarea.dataset.sendOnEnter === "true") {
      event.preventDefault();
      form.requestSubmit();
    }
  });
}

/** Grow the composer into the center picker, or collapse it back to the bottom bar. */
function setPicking(isPicking) {
  conversation.classList.toggle("is-picking", isPicking);
  picker.hidden = !isPicking;
}

/** Draw the textareas that belong to the active layout. */
export function renderFields(layoutId) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS[DEFAULT_LAYOUT];
  currentLayout = layout.id;
  fieldsRoot.innerHTML = "";

  layout.fields.forEach((field, index) => {
    const textarea = document.createElement("textarea");
    textarea.id = `composer-${field.name}`;
    textarea.name = field.name;
    textarea.rows = field.rows;
    textarea.placeholder = field.placeholder;
    textarea.autocomplete = "off";
    textarea.dataset.sendOnEnter = index === layout.fields.length - 1 ? "true" : "false";
    bindFieldEvents(textarea);
    fieldsRoot.appendChild(textarea);
  });
}

/** Return the active layout id. */
export function getCurrentLayout() {
  return currentLayout;
}

/** Read every composer bar as a name-to-trimmed-value map. */
export function getComposerValues() {
  const values = {};
  for (const field of fieldsRoot.querySelectorAll("textarea")) {
    values[field.name] = field.value.trim();
  }
  return values;
}

/** Clear all composer fields and reset their height. */
export function clearInput() {
  for (const field of fieldsRoot.querySelectorAll("textarea")) {
    field.value = "";
    field.style.height = "auto";
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
