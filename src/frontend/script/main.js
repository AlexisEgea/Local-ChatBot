/**
 * Chat application entry point.
 * Coordinates composer input, thread rendering, and the backend API.
 */

import { sendChat } from "./api.js";
import {
  clearInput,
  enableAutoResize,
  focusInput,
  getInputValue,
  onSubmit,
  setBusy,
} from "./composer.js";
import { appendMessage, markError, scrollToBottom } from "./thread.js";

/** Full conversation sent to the backend on every request. */
const messages = [];

/** Send the current draft and render the assistant reply. */
async function handleSubmit() {
  const content = getInputValue();
  if (!content) {
    return;
  }

  messages.push({ role: "user", content });
  appendMessage("user", content);
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
    // Drop the user turn that failed so it is not resent later.
    messages.pop();
  } finally {
    setBusy(false);
    focusInput();
    scrollToBottom();
  }
}

onSubmit(handleSubmit);
enableAutoResize();
