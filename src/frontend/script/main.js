/**
 * Chat application entry point.
 * Coordinates composer input, thread rendering, the sidebar, and the backend API.
 */

import { sendChat } from "./api.js";
import {
  clearInput,
  focusInput,
  getComposerValues,
  getCurrentLayout,
  onLayoutPick,
  onSubmit,
  renderFields,
  setBusy,
  setPickerMode,
} from "./composer.js";
import { DEFAULT_CHOOSE_MODE, DEFAULT_LAYOUT } from "./layouts.js";
import {
  getChooseMode,
  onChooseModeChange,
  onDefaultLayoutClick,
  onToggle,
  setActiveLayoutButton,
  setChooseMode,
  setExpanded,
} from "./sidebar.js";
import { appendMessage, markError, scrollToBottom } from "./thread.js";

/** Full conversation sent to the backend on every request. */
const messages = [];

/**
 * Apply a conversation layout and highlight it in the sidebar.
 * @param {string} layoutId
 */
function applyLayout(layoutId) {
  renderFields(layoutId);
  setActiveLayoutButton(layoutId);
}

/**
 * Switch between a fixed default layout and click-the-panel picking.
 * @param {"default" | "picker"} mode
 */
function applyChooseMode(mode) {
  setChooseMode(mode);
  setPickerMode(mode === "picker");
}

/**
 * Turn composer fields into OpenAI-style chat messages.
 * @param {string} layoutId
 * @param {Record<string, string>} values
 * @returns {{ role: string, content: string }[]}
 */
function buildOutgoingMessages(layoutId, values) {
  if (layoutId === "system-user") {
    const outgoing = [];
    if (values.system) {
      outgoing.push({ role: "system", content: values.system });
    }
    outgoing.push({ role: "user", content: values.user });
    return outgoing;
  }

  if (layoutId === "cgse") {
    const content = [
      values.context && `Context: ${values.context}`,
      values.goal && `Goal: ${values.goal}`,
      values.source && `Source: ${values.source}`,
      values.expectation && `Expectation: ${values.expectation}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    return [{ role: "user", content }];
  }

  return [{ role: "user", content: values.user }];
}

/**
 * Build the user-visible bubble text for the current layout.
 * @param {string} layoutId
 * @param {Record<string, string>} values
 * @returns {string}
 */
function displayText(layoutId, values) {
  if (layoutId === "cgse") {
    return buildOutgoingMessages(layoutId, values)[0].content;
  }
  return values.user;
}

/**
 * Return whether the composer has enough content to send.
 * @param {string} layoutId
 * @param {Record<string, string>} values
 * @returns {boolean}
 */
function canSend(layoutId, values) {
  if (layoutId === "cgse") {
    return Boolean(values.context || values.goal || values.source || values.expectation);
  }
  return Boolean(values.user);
}

/** Send the current draft to the API and render the assistant reply. */
async function handleSubmit() {
  const layoutId = getCurrentLayout();
  const values = getComposerValues();
  if (!canSend(layoutId, values)) {
    return;
  }

  const outgoing = buildOutgoingMessages(layoutId, values);
  const visible = displayText(layoutId, values);

  messages.push(...outgoing);
  appendMessage("user", visible);
  clearInput();

  const pending = appendMessage("assistant", "…");
  setBusy(true);

  try {
    const reply = await sendChat(messages);
    pending.textContent = reply;
    messages.push({ role: "assistant", content: reply });
  } catch (error) {
    pending.textContent = error instanceof Error ? error.message : String(error);
    markError(pending);
    messages.splice(messages.length - outgoing.length, outgoing.length);
  } finally {
    setBusy(false);
    focusInput();
    scrollToBottom();
  }
}

onToggle(() => setExpanded(!document.getElementById("app").classList.contains("is-expanded")));
onChooseModeChange(applyChooseMode);
onDefaultLayoutClick(applyLayout);
onLayoutPick(applyLayout);
onSubmit(handleSubmit);

applyChooseMode(DEFAULT_CHOOSE_MODE);
applyLayout(DEFAULT_LAYOUT);
