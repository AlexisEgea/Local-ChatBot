/**
 * Chat application entry point.
 * Coordinates composer input, thread rendering, the sidebar, and the backend API.
 */

import { sendChat } from "./api/chat.js";
import { createHistory, deleteHistory, getHistory, listHistory, renameHistory, updateHistory } from "./api/history.js";
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
} from "./conversation/composer.js";
import { DEFAULT_CHOOSE_MODE, DEFAULT_LAYOUT } from "./conversation/layouts.js";
import { onToggle, setExpanded } from "./workspace/sidebar/model.js";
import { onSidePanelToggle, setSidePanelOpen } from "./workspace/sidebar/rails.js";
import { onChooseModeChange, onDefaultLayoutClick, setActiveLayoutButton, setChooseMode } from "./workspace/sidebar/chat-mode.js";
import { initTheme } from "./workspace/sidebar/theme.js";
import { onHistoryMenuAction, onHistorySelect, onNewChat, renderHistoryList } from "./workspace/sidebar/history.js";
import { appendMessage, clearThread, markError, renderThread, scrollToBottom } from "./conversation/thread.js";

const messages = [];
let conversationId = null;
let historySaved = false;

/** Apply a conversation layout and highlight it in the sidebar. */
function applyLayout(layoutId) {
  renderFields(layoutId);
  setActiveLayoutButton(layoutId);
}

/** Switch between a fixed default layout and click-the-panel picking. */
function applyChooseMode(mode) {
  setChooseMode(mode);
  setPickerMode(mode === "picker");
}

/** Turn composer fields into OpenAI-style chat messages. */
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

/** Build the user-visible bubble text for the current layout. */
function displayText(layoutId, values) {
  if (layoutId === "cgse") {
    return buildOutgoingMessages(layoutId, values)[0].content;
  }
  return values.user;
}

/** Return whether the composer has enough content to send. */
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

  rememberConversationStart();
  messages.push(...outgoing);
  appendMessage("user", visible);
  clearInput();

  const pending = appendMessage("assistant", "…");
  setBusy(true);

  try {
    const reply = await sendChat(messages);
    pending.textContent = reply;
    messages.push({ role: "assistant", content: reply });
    await persistHistory();
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

/** Build a local timestamp used as the history file id. */
function newConversationId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

/** Keep the start-time id from the first user message. */
function rememberConversationStart() {
  if (!conversationId) {
    conversationId = newConversationId();
  }
}

/** Count completed user/assistant rounds in the current thread. */
function exchangeCount() {
  return messages.filter((message) => message.role === "assistant").length;
}

/** Save after the first exchange; replace the title after the second. */
async function persistHistory() {
  const exchanges = exchangeCount();
  if (exchanges < 1) {
    return;
  }

  try {
    if (!historySaved) {
      const saved = await createHistory(messages, conversationId);
      conversationId = saved.id;
      historySaved = true;
      await refreshHistoryList();
      return;
    }
    await updateHistory(conversationId, messages, exchanges === 2);
    await refreshHistoryList();
  } catch (error) {
    console.error("Could not save conversation", error);
  }
}

/** Reload History panel titles from the backend. */
async function refreshHistoryList() {
  try {
    const items = await listHistory();
    renderHistoryList(items, historySaved ? conversationId : null);
  } catch (error) {
    console.error("Could not load history", error);
  }
}

/** Clear the current conversation and return to the empty prompt. */
function startNewChat() {
  conversationId = null;
  historySaved = false;
  messages.length = 0;
  clearThread();
  clearInput();
  setBusy(false);
  focusInput();
  refreshHistoryList();
}

/** Open a saved conversation from the History panel. */
async function openHistoryItem(id) {
  if (id === conversationId && historySaved) {
    return;
  }
  try {
    const saved = await getHistory(id);
    conversationId = saved.id;
    historySaved = true;
    messages.length = 0;
    messages.push(...saved.messages);
    renderThread(messages);
    clearInput();
    setBusy(false);
    focusInput();
    await refreshHistoryList();
  } catch (error) {
    console.error("Could not open conversation", error);
  }
}

/** Rename or delete a conversation from the History context menu. */
async function handleHistoryMenu(action, id, currentTitle) {
  if (action === "rename") {
    try {
      await renameHistory(id, currentTitle);
      await refreshHistoryList();
    } catch (error) {
      console.error("Could not rename conversation", error);
      await refreshHistoryList();
    }
    return;
  }

  if (action === "delete") {
    try {
      await deleteHistory(id);
      if (id === conversationId) {
        startNewChat();
        return;
      }
      await refreshHistoryList();
    } catch (error) {
      console.error("Could not delete conversation", error);
    }
  }
}

onToggle(() => setExpanded(!document.getElementById("app").classList.contains("is-expanded")));
onSidePanelToggle((side) => {
  const panel = document.getElementById(side === "left" ? "sidebar-outer-left" : "sidebar-outer-right");
  setSidePanelOpen(side, !panel.classList.contains("is-open"));
});
onChooseModeChange(applyChooseMode);
onDefaultLayoutClick(applyLayout);
onLayoutPick(applyLayout);
onSubmit(handleSubmit);
onNewChat(startNewChat);
onHistorySelect(openHistoryItem);
onHistoryMenuAction(handleHistoryMenu);

applyChooseMode(DEFAULT_CHOOSE_MODE);
applyLayout(DEFAULT_LAYOUT);
initTheme();
refreshHistoryList();
