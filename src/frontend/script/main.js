/**
 * Chat application entry point.
 * Coordinates composer input, thread rendering, the sidebar, and the backend API.
 */

import { sendChat, STOPPED_REPLY } from "./api/chat.js";
import { stopExecution } from "./api/execution.js";
import { deleteHistory, deleteHistoryMessage, getHistory, updateHistoryMessage } from "./api/history.js";
import {
  clearInput,
  focusInput,
  getComposerValues,
  getCurrentLayout,
  renderFields,
} from "./conversation/chat/chat-mode/bar-mode.js";
import { onModeChoice, setModeChoiceEnabled } from "./conversation/chat/chat-mode/mode-choice.js";
import { onStop, onSubmit, setBusy } from "./conversation/run-execution.js";
import { DEFAULT_CHOOSE_MODE, getDefaultLayoutId, inferLayout, inferValues, turnStartIndex, withLayoutMeta } from "./conversation/chat/chat-mode/layouts/configuration.js";
import { initLayoutMenu } from "./conversation/chat/chat-mode/layouts/menu.js";
import { initCustomLayouts } from "./conversation/chat/chat-mode/layouts/overlay.js";
import { paintLayoutChoices } from "./conversation/chat/chat-mode/layouts/paint.js";
import { loadLayouts } from "./conversation/chat/chat-mode/layouts/store.js";
import { buildOutgoingMessages, canSend, displayText } from "./conversation/chat/chat-mode/payload.js";
import { onToggle, setExpanded } from "./workspace-sidebar/header/expand.js";
import { initHeaderSidebar } from "./workspace-sidebar/header/sidebar.js";
import { getModelConfig, getModelSnapshot, getReplySource, initModelOptions } from "./workspace-sidebar/header/model/snapshot.js";
import { bindRail } from "./workspace-sidebar/rail-sidebar/rail.js";
import { onChooseModeChange, setChooseMode, getChooseMode } from "./workspace-sidebar/rail-sidebar/design-option/choose.js";
import { onDefaultLayoutClick, setActiveLayoutButton } from "./workspace-sidebar/rail-sidebar/design-option/layout.js";
import { initTheme } from "./workspace-sidebar/rail-sidebar/design-option/theme/theme.js";
import { initApiKeys } from "./workspace-sidebar/header/api-key-overlay/overlay.js";
import { onHistoryMenuAction } from "./workspace-sidebar/rail-sidebar/history/context-menu/open.js";
import { deleteHistoryChat } from "./workspace-sidebar/rail-sidebar/history/context-menu/delete.js";
import { renameHistoryChat } from "./workspace-sidebar/rail-sidebar/history/context-menu/rename.js";
import { conversationPersist, persistHistory, refreshHistoryList, rememberConversationStart } from "./workspace-sidebar/rail-sidebar/history/conversation-persist.js";
import { onHistorySelect } from "./workspace-sidebar/rail-sidebar/history/list.js";
import { onNewChat } from "./workspace-sidebar/rail-sidebar/history/new-chat.js";
import { haltTextReveal } from "./conversation/animation/typewriter-reveal-animation.js";
import { appendMessage, clearThread, markError, renderThread, scrollToBottom } from "./conversation/message/message-list.js";
import { appendStoppedReply, revealAssistantBubble } from "./conversation/message/message-bubble.js";
import { onMessageMenuAction } from "./conversation/context-menu/open.js";
import { copyMessage } from "./conversation/context-menu/copy.js";
import { applyEditingLayout, beginMessageEdit, isMessageEditing, setEditingPickerMode } from "./conversation/context-menu/user/edit.js";
import { takeUserExchange } from "./conversation/context-menu/user/delete.js";
import { showModelInfo } from "./conversation/context-menu/system/information.js";

const messages = [];
let activeJob = null;

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
  setModeChoiceEnabled(mode === "picker");
}

/** Send the current draft to the API and render the assistant reply. */
async function handleSubmit() {
  const layoutId = getCurrentLayout();
  const values = getComposerValues();
  if (!canSend(layoutId, values) || (activeJob && !activeJob.stopped)) {
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

  try {
    const reply = await requestAssistantReply(pending, pendingMeta);
    if (reply == null) {
      return;
    }
    messages.push({ role: "assistant", content: reply, source: pendingMeta.source, model_info: pendingMeta.model_info });
    pending.parentElement.dataset.index = String(messages.length - 1);
    await persistHistory(messages);
  } catch (error) {
    pending.textContent = error instanceof Error ? error.message : String(error);
    markError(pending);
    messages.splice(messages.length - outgoing.length, outgoing.length);
  } finally {
    focusInput();
    scrollToBottom();
  }
}

/** Ask the model for a reply, or stop it from the composer square. */
async function requestAssistantReply(pending, pendingMeta) {
  const job = {
    key: crypto.randomUUID(),
    phase: "pending",
    stopped: false,
  };
  activeJob = job;
  setBusy(true);
  try {
    const { model, settings } = getModelConfig();
    const data = await sendChat(messages, model, settings, job.key);
    if (activeJob !== job) {
      return null;
    }
    const reply = data.content;
    if (
      pendingMeta.model_info &&
      (data.cost != null || data.prompt_tokens != null || data.completion_tokens != null)
    ) {
      pendingMeta.model_info = {
        ...pendingMeta.model_info,
        cost: data.cost,
        input_cost: data.input_cost,
        output_cost: data.output_cost,
        prompt_tokens: data.prompt_tokens,
        completion_tokens: data.completion_tokens,
      };
    }
    if (job.stopped && job.phase === "pending") {
      await revealAssistantBubble(pending, STOPPED_REPLY, pendingMeta);
      pending.parentElement.classList.remove("message--pending");
      return STOPPED_REPLY;
    }
    job.phase = "reveal";
    await revealAssistantBubble(pending, reply, pendingMeta);
    pending.parentElement.classList.remove("message--pending");
    if (job.stopped) {
      return await appendStoppedReply(pending, STOPPED_REPLY);
    }
    return reply;
  } finally {
    if (activeJob === job) {
      activeJob = null;
      setBusy(false);
    }
  }
}

/** Stop generation or typing and restore the send arrow. */
function handleStop() {
  if (!activeJob || activeJob.stopped) {
    return;
  }
  activeJob.stopped = true;
  stopExecution(activeJob.key);
  setBusy(false);
  if (activeJob.phase === "reveal") {
    haltTextReveal();
  }
}

/** Build the assistant metadata stored with a reply. */
function replyMeta() {
  return { role: "assistant", source: getReplySource(), model_info: getModelSnapshot() };
}

/** Clear the current conversation and return to the empty prompt. */
function startNewChat() {
  activeJob = null;
  conversationPersist.id = null;
  conversationPersist.saved = false;
  messages.length = 0;
  clearThread();
  clearInput();
  setBusy(false);
  focusInput();
  refreshHistoryList();
}

/** Open a saved conversation from the History panel. */
async function openHistoryItem(id) {
  if (id === conversationPersist.id && conversationPersist.saved) {
    return;
  }
  try {
    const saved = await getHistory(id);
    conversationPersist.id = saved.id;
    conversationPersist.saved = true;
    activeJob = null;
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
      await renameHistoryChat(id, currentTitle);
      await refreshHistoryList();
    } catch (error) {
      console.error("Could not rename conversation", error);
      await refreshHistoryList();
    }
    return;
  }

  if (action === "delete") {
    try {
      const closedActive = await deleteHistoryChat(id, conversationPersist.id);
      if (closedActive) {
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
      await copyMessage(message.content);
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
    const removed = takeUserExchange(messages, index);
    if (!removed) {
      return;
    }
    if (messages.length === 0) {
      if (conversationPersist.saved && conversationPersist.id) {
        try {
          await deleteHistory(conversationPersist.id);
        } catch (error) {
          console.error("Could not delete conversation", error);
        }
      }
      startNewChat();
      return;
    }
    renderThread(messages);
    if (conversationPersist.saved) {
      try {
        for (const entry of removed) {
          if (!entry.id) {
            continue;
          }
          await deleteHistoryMessage(conversationPersist.id, entry.id);
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
        if (conversationPersist.saved) {
          for (const entry of nextMessages) {
            if (!entry.id) {
              continue;
            }
            await updateHistoryMessage(conversationPersist.id, entry.id, entry);
          }
          for (const entry of removed) {
            if (!entry.id || reused.has(entry.id)) {
              continue;
            }
            await deleteHistoryMessage(conversationPersist.id, entry.id);
          }
        }
        messages.push(...nextMessages);
        renderThread(messages);
        const pendingMeta = replyMeta();
        const pending = appendMessage("assistant", "…", "message--pending", null, pendingMeta);
        try {
          const reply = await requestAssistantReply(pending, pendingMeta);
          if (reply == null) {
            return;
          }
          messages.push({ role: "assistant", content: reply, source: pendingMeta.source, model_info: pendingMeta.model_info });
          pending.parentElement.dataset.index = String(messages.length - 1);
          await persistHistory(messages, userNumber <= 2);
        } catch (error) {
          pending.textContent = error instanceof Error ? error.message : String(error);
          markError(pending);
        } finally {
          scrollToBottom();
        }
      },
    });
  }
}

onToggle(() => setExpanded(!document.getElementById("app").classList.contains("is-expanded")));
const historyRail = bindRail(document.getElementById("sidebar-outer-left"));
const chatModeRail = bindRail(document.getElementById("sidebar-outer-right"));
historyRail.onToggle(() => historyRail.setOpen(!historyRail.isOpen()));
chatModeRail.onToggle(() => chatModeRail.setOpen(!chatModeRail.isOpen()));
onChooseModeChange(applyChooseMode);
onDefaultLayoutClick(applyLayout);
onModeChoice(applyLayout);
onSubmit(handleSubmit);
onStop(handleStop);
onNewChat(startNewChat);
onHistorySelect(openHistoryItem);
onHistoryMenuAction(handleHistoryMenu);
onMessageMenuAction(handleMessageMenu);

applyChooseMode(DEFAULT_CHOOSE_MODE);
initTheme();
initHeaderSidebar();
initApiKeys();
initCustomLayouts();
initLayoutMenu({
  afterDelete(layoutId) {
    if (getCurrentLayout() === layoutId) {
      applyLayout(getDefaultLayoutId());
      return;
    }
    setActiveLayoutButton(getCurrentLayout());
  },
});
initModelOptions();
refreshHistoryList();

loadLayouts()
  .then(() => {
    paintLayoutChoices();
    applyLayout(getDefaultLayoutId());
  })
  .catch((error) => {
    console.error(error);
    paintLayoutChoices();
    applyLayout(getDefaultLayoutId());
  });
