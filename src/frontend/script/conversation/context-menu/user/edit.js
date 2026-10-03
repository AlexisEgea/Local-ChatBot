/** Inline edit of a user or system bubble (fields, send, layout picker). */

import { convertLayoutValues, CUSTOM_LAYOUT_PICKER, getLayouts } from "../../chat/chat-mode/layouts/configuration.js";
import { onLayoutsChanged } from "../../chat/chat-mode/layouts/store.js";
import { openCustomLayoutOverlay } from "../../chat/chat-mode/layouts/overlay.js";
import { fillLayoutFields, readLayoutValues, resizeFields } from "../../chat/chat-mode/bar-mode.js";
import { fillBubble } from "../../message/message-bubble.js";
import { thread } from "../../message/message-list.js";

const SEND_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M12 5l-6 6M12 5l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>';

let activeEdit = null;

/** Fill layout choice buttons, including saved Custom Prompts. */
function fillBubblePicker(picker) {
  picker.replaceChildren();
  for (const layout of Object.values(getLayouts())) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "composer-choice glass";
    button.dataset.layout = layout.id;
    const hint = document.createElement("span");
    hint.textContent = layout.description || "";
    button.append(layout.label, hint);
    picker.appendChild(button);
  }
  const custom = document.createElement("button");
  custom.type = "button";
  custom.className = "composer-choice glass";
  custom.dataset.layout = CUSTOM_LAYOUT_PICKER;
  const customHint = document.createElement("span");
  customHint.textContent = "Name prompts and roles";
  custom.append("Custom Prompt", customHint);
  picker.appendChild(custom);
}

/** Draw the layout choices used by the bottom composer, including saved Custom Prompts. */
function createBubblePicker() {
  const picker = document.createElement("div");
  picker.className = "composer-picker bubble-picker";
  picker.hidden = true;
  fillBubblePicker(picker);
  return picker;
}

/** Restore a paired system/user bubble that was hidden during edit. */
function showPairedRow(pairIndex) {
  if (pairIndex === null || pairIndex === undefined) {
    return;
  }
  const pair = thread.querySelector(`.message[data-index="${CSS.escape(String(pairIndex))}"]`);
  pair?.classList.remove("message--pair-hidden");
}

/** Replace a user/system bubble with the full composer (fields, send, picker). */
export function beginMessageEdit(index, options) {
  const { layoutId, values, pairIndex = null, canSend, pickerMode, onCommit, onCancel, message } = options;
  const row = thread.querySelector(`.message[data-index="${CSS.escape(String(index))}"]`);
  const bubble = row?.querySelector(".bubble");
  if (!bubble) {
    return;
  }
  if (activeEdit) {
    activeEdit.finish(false);
  }

  const original = message ?? { role: row.dataset.role, content: bubble.textContent };
  row.classList.add("is-editing");
  for (const other of thread.querySelectorAll(`.message[data-index="${CSS.escape(String(index))}"]`)) {
    if (other !== row) {
      other.classList.add("message--pair-hidden");
    }
  }
  if (pairIndex !== null && pairIndex !== undefined) {
    const pair = thread.querySelector(`.message[data-index="${CSS.escape(String(pairIndex))}"]`);
    pair?.classList.add("message--pair-hidden");
  }

  bubble.replaceChildren();
  const picker = createBubblePicker();
  const editRow = document.createElement("div");
  editRow.className = "bubble-edit-row";
  const fieldsRoot = document.createElement("div");
  fieldsRoot.className = "composer-fields";
  const send = document.createElement("button");
  send.type = "button";
  send.className = "message-send glass";
  send.setAttribute("aria-label", "Send");
  send.innerHTML = SEND_ICON;
  editRow.append(fieldsRoot, send);
  bubble.append(picker, editRow);

  let finished = false;
  let currentLayout = layoutId;

  const setPicking = (isPicking) => {
    picker.hidden = !isPicking;
    editRow.hidden = isPicking;
    row.classList.toggle("is-picking", isPicking);
  };

  const paintFields = (nextLayout, nextValues) => {
    currentLayout = fillLayoutFields(fieldsRoot, nextLayout, nextValues, {
      onSend: () => finish(true),
      fieldClass: "bubble-input",
    });
    resizeFields(fieldsRoot);
    const first = fieldsRoot.querySelector("textarea");
    first?.focus();
  };

  const finish = (shouldSave) => {
    if (finished) {
      return;
    }
    if (shouldSave) {
      const nextValues = readLayoutValues(fieldsRoot);
      if (!canSend(currentLayout, nextValues)) {
        return;
      }
      finished = true;
      activeEdit = null;
      onCommit(currentLayout, nextValues);
      return;
    }
    finished = true;
    activeEdit = null;
    if (onCancel) {
      onCancel();
      return;
    }
    row.classList.remove("is-editing", "is-picking", "is-picker-mode");
    showPairedRow(pairIndex);
    fillBubble(bubble, original.role, original.content, original);
  };

  paintFields(layoutId, values);

  picker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layout]");
    if (!button) {
      return;
    }
    event.stopPropagation();
    if (button.dataset.layout === CUSTOM_LAYOUT_PICKER) {
      openCustomLayoutOverlay();
      return;
    }
    const nextValues = convertLayoutValues(currentLayout, button.dataset.layout, readLayoutValues(fieldsRoot));
    setPicking(false);
    paintFields(button.dataset.layout, nextValues);
  });

  bubble.addEventListener("click", (event) => {
    if (!pickerMode() || !picker.hidden) {
      return;
    }
    if (
      event.target.closest("textarea") ||
      event.target.closest(".composer-field") ||
      event.target.closest(".message-send") ||
      event.target.closest(".bubble-picker")
    ) {
      return;
    }
    setPicking(true);
  });

  send.addEventListener("click", (event) => {
    event.stopPropagation();
    finish(true);
  });

  const syncPickerClass = () => {
    row.classList.toggle("is-picker-mode", pickerMode());
    if (!pickerMode()) {
      setPicking(false);
    }
  };
  syncPickerClass();

  activeEdit = {
    finish,
    fieldsRoot,
    picker,
    pickerMode,
    setPicking,
    syncPickerClass,
    applyLayout(nextLayout) {
      const nextValues = convertLayoutValues(currentLayout, nextLayout, readLayoutValues(fieldsRoot));
      setPicking(false);
      paintFields(nextLayout, nextValues);
    },
  };
}

onLayoutsChanged(() => {
  if (activeEdit?.picker) {
    fillBubblePicker(activeEdit.picker);
  }
});

/** Rebuild the inline editor when Chat Mode changes the prompt type. */
export function applyEditingLayout(layoutId) {
  activeEdit?.applyLayout(layoutId);
}

/** Return whether a message bubble is currently being edited. */
export function isMessageEditing() {
  return Boolean(activeEdit);
}

/** Keep the inline picker in sync with Chat Bar vs Default. */
export function setEditingPickerMode() {
  activeEdit?.syncPickerClass();
}

thread.addEventListener("mousedown", (event) => {
  if (!activeEdit) {
    return;
  }
  if (event.target.closest(".message.is-editing")) {
    return;
  }
  activeEdit.finish(false);
});
