/**
 * Chat application entry point.
 * Coordinates composer input, thread rendering, the sidebar, and the backend API.
 */

import { sendChat } from "./api/chat.js";
import { addHistoryMessage, createHistory, deleteHistory, deleteHistoryMessage, getHistory, listHistory, renameHistory, updateHistoryMessage } from "./api/history.js";
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
import { DEFAULT_CHOOSE_MODE, DEFAULT_LAYOUT, exchangeRange, inferLayout, inferValues, turnStartIndex, withLayoutMeta } from "./conversation/layouts.js";
import { onToggle, setExpanded } from "./workspace/sidebar/model.js";
import { getModelConfig, getModelSnapshot, getReplySource, initModelOptions } from "./workspace/sidebar/model-options.js";
import { onSidePanelToggle, setSidePanelOpen } from "./workspace/sidebar/rails.js";
import { onChooseModeChange, onDefaultLayoutClick, setActiveLayoutButton, setChooseMode, getChooseMode } from "./workspace/sidebar/chat-mode.js";
import { initTheme } from "./workspace/sidebar/theme.js";
import { onHistoryMenuAction, onHistorySelect, onNewChat, renderHistoryList } from "./workspace/sidebar/history.js";
import { appendMessage, applyEditingLayout, beginMessageEdit, clearThread, fillBubble, isMessageEditing, markError, onMessageMenuAction, renderThread, scrollToBottom, setEditingPickerMode, showModelInfo } from "./conversation/thread.js";

const messages = [];
let conversationId = null;
let historySaved = false;

/** Apply a conversation layout: the edited bubble while editing, otherwise the composer. */
function applyLayout(layoutId) {
  setActiveLayoutButton(layoutId);
  if (isMessageEditing()) {
    applyEditingLayout(layoutId);
    return;
  }
  renderFields(layoutId);
}

/** Switch between a fixed default layout and click-the-panel picking. */
function applyChooseMode(mode) {
  setChooseMode(mode);
  if (isMessageEditing()) {
    setEditingPickerMode();
    return;
  }
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

  rememberConversationStart();
  const outgoing = withLayoutMeta(buildOutgoingMessages(layoutId, values), layoutId, values);
  const start = messages.length;
  messages.push(...outgoing);
  outgoing.forEach((message, offset) => {
    if (message.role === "system" || message.role === "user") {
      const text = message.role === "user" ? displayText(layoutId, values) : message.content;
      appendMessage(message.role, text, "", start + offset, message);
    }
  });
  clearInput();

  const pendingMeta = replyMeta();
  const pending = appendMessage("assistant", "…", "message--pending", null, pendingMeta);
  setBusy(true);

  try {
    const { model, settings } = getModelConfig();
    const reply = await sendChat(messages, model, settings);
    fillBubble(pending, "assistant", reply, pendingMeta);
    pending.parentElement.classList.remove("message--pending");
    messages.push({ role: "assistant", content: reply, source: pendingMeta.source, model_info: pendingMeta.model_info });
    pending.parentElement.dataset.index = String(messages.length - 1);
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

/** Build the assistant metadata stored with a reply. */
function replyMeta() {
  return { role: "assistant", source: getReplySource(), model_info: getModelSnapshot() };
}

/** Count completed user/assistant rounds in the current thread. */
function exchangeCount() {
  return messages.filter((message) => message.role === "assistant").length;
}

/** Copy backend message ids onto the matching local turns. */
function applyServerIds(local, remote) {
  for (let index = 0; index < local.length; index += 1) {
    const id = remote[index]?.id;
    if (id) {
      local[index].id = id;
    }
  }
}

/** Save after the first exchange; append only new messages afterwards. */
async function persistHistory(refineTitle = null) {
  const exchanges = exchangeCount();
  if (exchanges < 1) {
    return;
  }

  try {
    if (!historySaved) {
      const saved = await createHistory(messages, conversationId);
      conversationId = saved.id;
      historySaved = true;
      applyServerIds(messages, saved.messages || []);
      await refreshHistoryList();
      return;
    }
    const pending = messages.filter((message) => !message.id);
    for (let index = 0; index < pending.length; index += 1) {
      const shouldRefine = Boolean(refineTitle ?? exchanges === 2) && index === pending.length - 1;
      const saved = await addHistoryMessage(conversationId, pending[index], shouldRefine);
      pending[index].id = saved.message.id;
    }
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

/** Copy or edit a message from the glass action menu. */
async function handleMessageMenu(action, index) {
  const message = messages[index];
  if (!message) {
    return;
  }
  if (action === "copy") {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (error) {
      console.error("Could not copy message", error);
    }
    return;
  }
  if (action === "info") {
    showModelInfo(message.model_info || getModelSnapshot());
    return;
  }
  if (action === "delete") {
    if (message.role !== "user") {
      return;
    }
    const { start, end } = exchangeRange(messages, index);
    const removed = messages.slice(start, end + 1);
    messages.splice(start, end - start + 1);
    if (messages.length === 0) {
      if (historySaved && conversationId) {
        try {
          await deleteHistory(conversationId);
        } catch (error) {
          console.error("Could not delete conversation", error);
        }
      }
      startNewChat();
      return;
    }
    renderThread(messages);
    if (historySaved) {
      try {
        for (const entry of removed) {
          if (!entry.id) {
            continue;
          }
          await deleteHistoryMessage(conversationId, entry.id);
        }
        await refreshHistoryList();
      } catch (error) {
        console.error("Could not save conversation", error);
      }
    }
    return;
  }
  if (action === "edit" && (message.role === "user" || message.role === "system")) {
    const start = turnStartIndex(messages, index);
    const pairIndex = start === index ? (messages[index + 1]?.role === "user" ? index + 1 : null) : start;
    const layoutId = inferLayout(message, index, messages);
    const values = inferValues(message, index, messages);
    beginMessageEdit(index, {
      layoutId,
      values,
      pairIndex,
      canSend,
      message,
      pickerMode: () => getChooseMode() === "picker",
      onCancel: () => renderThread(messages),
      onCommit: async (nextLayout, nextValues) => {
        const userIndex = messages[start]?.role === "system" ? start + 1 : start;
        const userNumber = messages.slice(0, userIndex + 1).filter((entry) => entry.role === "user").length;
        const removed = messages.splice(start);
        const outgoing = withLayoutMeta(buildOutgoingMessages(nextLayout, nextValues), nextLayout, nextValues);
        const reused = new Set();
        const nextMessages = outgoing.map((entry, offset) => {
          const previous = removed[offset];
          if (previous?.id && previous.role === entry.role) {
            reused.add(previous.id);
            return { ...entry, id: previous.id };
          }
          return entry;
        });
        if (historySaved) {
          for (const entry of nextMessages) {
            if (!entry.id) {
              continue;
            }
            await updateHistoryMessage(conversationId, entry.id, entry);
          }
          for (const entry of removed) {
            if (!entry.id || reused.has(entry.id)) {
              continue;
            }
            await deleteHistoryMessage(conversationId, entry.id);
          }
        }
        messages.push(...nextMessages);
        renderThread(messages);
        const pendingMeta = replyMeta();
        const pending = appendMessage("assistant", "…", "message--pending", null, pendingMeta);
        setBusy(true);
        try {
          const { model, settings } = getModelConfig();
          const reply = await sendChat(messages, model, settings);
          fillBubble(pending, "assistant", reply, pendingMeta);
          pending.parentElement.classList.remove("message--pending");
          messages.push({ role: "assistant", content: reply, source: pendingMeta.source, model_info: pendingMeta.model_info });
          pending.parentElement.dataset.index = String(messages.length - 1);
          await persistHistory(userNumber <= 2);
        } catch (error) {
          pending.textContent = error instanceof Error ? error.message : String(error);
          markError(pending);
        } finally {
          setBusy(false);
          scrollToBottom();
        }
      },
    });
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
onMessageMenuAction(handleMessageMenu);

applyChooseMode(DEFAULT_CHOOSE_MODE);
applyLayout(DEFAULT_LAYOUT);
initTheme();
initModelOptions();
refreshHistoryList();
