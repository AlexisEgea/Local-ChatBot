/** Builds chat bubbles and the Copy / Edit glass menu. */

import { convertLayoutValues, inferLayout, LAYOUTS, parseCgse } from "./layouts.js";
import { fillLayoutFields, readLayoutValues, resizeFields } from "./composer.js";

const thread = document.getElementById("chat-thread");
const messageMenu = document.getElementById("message-menu");
const SEND_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M12 5l-6 6M12 5l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>';

let menuIndex = null;
let menuHandler = null;
let activeEdit = null;

/** Remove the placeholder once the first real message appears. */
function hideEmptyState() {
  const empty = thread.querySelector(".empty");
  if (empty) {
    empty.remove();
  }
}

/** Hide the message action menu. */
function hideMessageMenu() {
  messageMenu.hidden = true;
  menuIndex = null;
}

/** Place the glass menu next to a click point. */
function placeMessageMenu(clientX, clientY) {
  messageMenu.hidden = false;
  const menuWidth = messageMenu.offsetWidth;
  const menuHeight = messageMenu.offsetHeight;
  const left = Math.min(clientX, window.innerWidth - menuWidth - 8);
  const top = Math.min(clientY, window.innerHeight - menuHeight - 8);
  messageMenu.style.left = `${Math.max(8, left)}px`;
  messageMenu.style.top = `${Math.max(8, top)}px`;
}

/** Fill Copy / Edit actions for the selected bubble. */
function openMessageMenu(row, clientX, clientY) {
  if (row.classList.contains("message--pending") || row.dataset.index === undefined) {
    return;
  }
  hideMessageMenu();
  const role = row.dataset.role;
  messageMenu.replaceChildren();
  const copy = document.createElement("button");
  copy.type = "button";
  copy.dataset.action = "copy";
  copy.textContent = "Copy";
  messageMenu.appendChild(copy);
  if (role === "user" || role === "system") {
    const edit = document.createElement("button");
    edit.type = "button";
    edit.dataset.action = "edit";
    edit.textContent = "Edit";
    messageMenu.appendChild(edit);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.dataset.action = "delete";
  remove.textContent = "Delete";
  messageMenu.appendChild(remove);
  menuIndex = Number(row.dataset.index);
  placeMessageMenu(clientX, clientY);
}

/** Draw read-only field blocks with a small top-left title. */
function paintReadFields(bubble, fields, values) {
  bubble.classList.add("bubble--fields");
  for (const field of fields) {
    const value = values[field.name];
    if (!value) {
      continue;
    }
    const block = document.createElement("div");
    block.className = "bubble-field";
    const label = document.createElement("span");
    label.className = "bubble-field-label";
    label.textContent = field.placeholder;
    const text = document.createElement("div");
    text.className = "bubble-field-text";
    text.textContent = value;
    block.append(label, text);
    bubble.appendChild(block);
  }
}

/** Fill a bubble from a stored message: structured fields, or plain text. */
function fillBubble(bubble, role, content, message = null) {
  bubble.replaceChildren();
  bubble.classList.remove("bubble--fields");
  if (role === "assistant" || !message) {
    bubble.textContent = content;
    return;
  }

  const layoutId = message.layout || inferLayout(message, 0, [message]);
  if (layoutId === "cgse") {
    const values = message.values && typeof message.values === "object" ? message.values : parseCgse(content);
    paintReadFields(bubble, LAYOUTS.cgse.fields, values);
    return;
  }
  if (layoutId === "system-user") {
    const field = role === "system" ? LAYOUTS["system-user"].fields[0] : LAYOUTS["system-user"].fields[1];
    const value =
      role === "system" ? message.values?.system ?? content : message.values?.user ?? content;
    paintReadFields(bubble, [field], { [field.name]: value });
    return;
  }
  bubble.textContent = content;
}

/** Append a chat bubble and return it so callers can update it later. */
export function appendMessage(role, content, extraClass = "", index = null, message = null) {
  hideEmptyState();

  const row = document.createElement("div");
  row.className = `message message--${role}${extraClass ? ` ${extraClass}` : ""}`;
  row.dataset.role = role;
  if (index !== null) {
    row.dataset.index = String(index);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble glass";
  fillBubble(bubble, role, content, message);
  row.appendChild(bubble);
  thread.appendChild(row);
  scrollToBottom();
  return bubble;
}

/** Style a bubble as a failed request. */
export function markError(bubble) {
  bubble.parentElement.classList.add("message--error");
}

/** Keep the latest message visible. */
export function scrollToBottom() {
  thread.scrollTop = thread.scrollHeight;
}

/** Reset the thread to the empty-state prompt. */
export function clearThread() {
  hideMessageMenu();
  thread.innerHTML = '<p class="empty">How can I help you?</p>';
}

/** Replace the thread with a saved conversation. */
export function renderThread(messages) {
  thread.replaceChildren();
  const visible = messages.filter(
    (message) => message.role === "user" || message.role === "assistant" || message.role === "system",
  );
  if (visible.length === 0) {
    clearThread();
    return;
  }
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role === "user" || message.role === "assistant" || message.role === "system") {
      appendMessage(message.role, message.content, "", index, message);
    }
  }
}

/** Draw the three layout choices used by the bottom composer. */
function createBubblePicker() {
  const picker = document.createElement("div");
  picker.className = "composer-picker bubble-picker";
  picker.hidden = true;
  for (const layout of Object.values(LAYOUTS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "composer-choice";
    button.dataset.layout = layout.id;
    const hint = document.createElement("span");
    hint.textContent = layout.fields.map((field) => field.placeholder).join(", ");
    button.append(layout.label, hint);
    picker.appendChild(button);
  }
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
  const { layoutId, values, pairIndex = null, canSend, pickerMode, onCommit, message } = options;
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
  send.className = "message-send";
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

/** Bind Copy / Edit on right-click, like the History menu. */
export function onMessageMenuAction(handler) {
  menuHandler = handler;
  thread.addEventListener("contextmenu", (event) => {
    const row = event.target.closest(".message");
    if (!row || row.classList.contains("message--pending") || row.classList.contains("is-editing")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    openMessageMenu(row, event.clientX, event.clientY);
  });

  messageMenu.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton || menuIndex === null || !menuHandler) {
      return;
    }
    event.stopPropagation();
    const action = actionButton.dataset.action;
    const index = menuIndex;
    hideMessageMenu();
    menuHandler(action, index);
  });

  document.addEventListener("click", hideMessageMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideMessageMenu();
    }
  });
}
